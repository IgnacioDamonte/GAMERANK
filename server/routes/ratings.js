const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const CATEGORIAS = ['graficos', 'arte', 'musica', 'animaciones', 'mecanicas', 'historia'];
const ESTADOS_VALIDOS = ['jugando', 'completado', 'abandonado', 'pausa'];

function validarPuntaje(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 1 && n <= 10;
}

function calcularPromedio(puntajes) {
  const suma = CATEGORIAS.reduce((acc, cat) => acc + puntajes[cat], 0);
  return Math.round((suma / CATEGORIAS.length) * 10) / 10;
}

function parseTags(tags) {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12);
  return [];
}

// GET /api/ratings?sort=score|release|alpha|added&order=asc|desc&platform=&genre=
router.get('/', async (req, res) => {
  const { sort = 'score', order, platform, genre } = req.query;

  try {
    let { rows } = await pool.query('SELECT * FROM ratings');

    if (platform) {
      rows = rows.filter((r) => (r.platforms || []).some((p) => p.toLowerCase().includes(String(platform).toLowerCase())));
    }
    if (genre) {
      rows = rows.filter((r) => (r.genres || []).some((g) => g.toLowerCase() === String(genre).toLowerCase()));
    }

    const dir = order === 'asc' ? 1 : order === 'desc' ? -1 : null;

    const comparadores = {
      score: (a, b) => b.promedio - a.promedio || a.name.localeCompare(b.name),
      release: (a, b) => String(b.released || '').localeCompare(String(a.released || '')),
      alpha: (a, b) => a.name.localeCompare(b.name),
      added: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    };

    const comparador = comparadores[sort] || comparadores.score;
    rows.sort(comparador);
    if (dir === 1) rows.reverse();

    res.json({ ratings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo cargar tu lista.' });
  }
});

// POST /api/ratings — crea o actualiza (por rawg_id) la puntuación de un juego
router.post('/', async (req, res) => {
  const {
    rawgId, name, backgroundImage, released,
    estado, nota, tags, horasJugadas, platino,
    genres, platforms,
  } = req.body || {};

  if (!rawgId || !name) {
    return res.status(400).json({ error: 'Faltan datos del juego (rawgId y name son obligatorios).' });
  }

  if (estado && !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }

  const puntajes = {};
  for (const cat of CATEGORIAS) {
    const valor = req.body?.[cat];
    if (!validarPuntaje(valor)) {
      return res.status(400).json({ error: `El puntaje de "${cat}" debe ser un número entre 1 y 10.` });
    }
    puntajes[cat] = Number(valor);
  }

  const promedio = calcularPromedio(puntajes);
  const horas = horasJugadas != null && horasJugadas !== '' ? Number(horasJugadas) : null;

  try {
    const existing = await pool.query('SELECT id FROM ratings WHERE rawg_id = $1', [rawgId]);
    const isUpdate = existing.rows.length > 0;

    const { rows } = await pool.query(
      `INSERT INTO ratings
        (rawg_id, name, background_image, released, graficos, arte, musica, animaciones, mecanicas, historia, promedio,
         estado, nota, tags, horas_jugadas, platino, genres, platforms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (rawg_id) DO UPDATE SET
        name = EXCLUDED.name,
        background_image = EXCLUDED.background_image,
        released = EXCLUDED.released,
        graficos = EXCLUDED.graficos,
        arte = EXCLUDED.arte,
        musica = EXCLUDED.musica,
        animaciones = EXCLUDED.animaciones,
        mecanicas = EXCLUDED.mecanicas,
        historia = EXCLUDED.historia,
        promedio = EXCLUDED.promedio,
        estado = EXCLUDED.estado,
        nota = EXCLUDED.nota,
        tags = EXCLUDED.tags,
        horas_jugadas = EXCLUDED.horas_jugadas,
        platino = EXCLUDED.platino,
        genres = EXCLUDED.genres,
        platforms = EXCLUDED.platforms,
        updated_at = now()
       RETURNING *`,
      [
        rawgId, name, backgroundImage || null, released || null,
        puntajes.graficos, puntajes.arte, puntajes.musica, puntajes.animaciones, puntajes.mecanicas, puntajes.historia,
        promedio,
        estado || null, nota || null, parseTags(tags), horas, !!platino,
        Array.isArray(genres) ? genres : [], Array.isArray(platforms) ? platforms : [],
      ]
    );

    res.status(isUpdate ? 200 : 201).json({ rating: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar el puntaje.' });
  }
});

// DELETE /api/ratings/:rawgId
router.delete('/:rawgId', async (req, res) => {
  const rawgId = Number(req.params.rawgId);
  try {
    const { rowCount } = await pool.query('DELETE FROM ratings WHERE rawg_id = $1', [rawgId]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Ese juego no está en tu lista.' });
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo quitar el juego.' });
  }
});

module.exports = router;
