const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// GET /api/wishlist — juegos guardados como deseados, más nuevo primero
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM wishlist ORDER BY created_at DESC');
    res.json({ wishlist: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo cargar tu lista de deseados.' });
  }
});

// POST /api/wishlist — agrega un juego (si ya está, no hace nada)
router.post('/', async (req, res) => {
  const { rawgId, name, backgroundImage, released } = req.body || {};

  if (!rawgId || !name) {
    return res.status(400).json({ error: 'Faltan datos del juego (rawgId y name son obligatorios).' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO wishlist (rawg_id, name, background_image, released)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (rawg_id) DO NOTHING
       RETURNING *`,
      [rawgId, name, backgroundImage || null, released || null]
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
