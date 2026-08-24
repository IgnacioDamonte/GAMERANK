const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const CATEGORIAS = ['graficos', 'arte', 'musica', 'animaciones', 'mecanicas', 'historia'];

function validarPuntaje(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 1 && n <= 10;
}

function calcularPromedio(puntajes) {
  const suma = CATEGORIAS.reduce((acc, cat) => acc + puntajes[cat], 0);
  return Math.round((suma / CATEGORIAS.length) * 10) / 10;
}

// GET /api/ratings — lista guardada, ordenada por promedio descendente
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM ratings ORDER BY promedio DESC, name ASC');
    res.json({ ratings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo cargar tu lista.' });
  }
});

// POST /api/ratings — crea o actualiza (por rawg_id) la puntuación de un juego
router.post('/', async (req, res) => {
  const { rawgId, name, backgroundImage, released } = req.body || {};

  if (!rawgId || !name) {
    return res.status(400).json({ error: 'Faltan datos del juego (rawgId y name son obligatorios).' });
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

  try {
    const existing = await pool.query('SELECT id FROM ratings WHERE rawg_id = $1', [rawgId]);
    const isUpdate = existing.rows.length > 0;

    const { rows } = await pool.query(
      `INSERT INTO ratings
        (rawg_id, name, background_image, released, graficos, arte, musica, animaciones, mecanicas, historia, promedio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        updated_at = now()
       RETURNING *`,
      [
        rawgId, name, backgroundImage || null, released || null,
        puntajes.graficos, puntajes.arte, puntajes.musica, puntajes.animaciones, puntajes.mecanicas, puntajes.historia,
        promedio,
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
