const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// GET /api/wishlist?sort=release|alpha|added&order=asc|desc&platform=&genre=
router.get('/', async (req, res) => {
  const { sort = 'added', order, platform, genre } = req.query;

  try {
    let { rows } = await pool.query('SELECT * FROM wishlist');

    if (platform) {
      rows = rows.filter((r) => (r.platforms || []).some((p) => p.toLowerCase().includes(String(platform).toLowerCase())));
    }
    if (genre) {
      rows = rows.filter((r) => (r.genres || []).some((g) => g.toLowerCase() === String(genre).toLowerCase()));
    }

    const dir = order === 'asc' ? 1 : order === 'desc' ? -1 : null;

    const comparadores = {
      release: (a, b) => String(b.released || '').localeCompare(String(a.released || '')),
      alpha: (a, b) => a.name.localeCompare(b.name),
      added: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    };

    const comparador = comparadores[sort] || comparadores.added;
    rows.sort(comparador);
    if (dir === 1) rows.reverse();

    res.json({ wishlist: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo cargar tu lista de deseados.' });
  }
});

// POST /api/wishlist — agrega un juego (si ya está, no hace nada)
router.post('/', async (req, res) => {
  const { rawgId, name, backgroundImage, released, genres, platforms } = req.body || {};

  if (!rawgId || !name) {
    return res.status(400).json({ error: 'Faltan datos del juego (rawgId y name son obligatorios).' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO wishlist (rawg_id, name, background_image, released, genres, platforms)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (rawg_id) DO NOTHING
       RETURNING *`,
      [
        rawgId, name, backgroundImage || null, released || null,
        Array.isArray(genres) ? genres : [], Array.isArray(platforms) ? platforms : [],
      ]
    );
    res.status(201).json({ item: rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar en deseados.' });
  }
});

// DELETE /api/wishlist/:rawgId
router.delete('/:rawgId', async (req, res) => {
  const rawgId = Number(req.params.rawgId);
  try {
    const { rowCount } = await pool.query('DELETE FROM wishlist WHERE rawg_id = $1', [rawgId]);
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Ese juego no está en tu lista de deseados.' });
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo quitar de deseados.' });
  }
});

module.exports = router;
