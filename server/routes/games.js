const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const RAWG_BASE = 'https://api.rawg.io/api';

// El .env se edita a mano habitualmente — un espacio o salto de línea de
// más al final de la clave (fácil de meter sin querer con el Bloc de
// notas) la rompe sin que se note a simple vista. La recortamos siempre.
const RAWG_API_KEY = (process.env.RAWG_API_KEY || '').trim();

function normalizeGame(g) {
  return {
    rawgId: g.id,
    name: g.name,
    backgroundImage: g.background_image || null,
    released: g.released || null,
    rawgRating: g.rating || null,
  };
}

// GET /api/games/search?q=zelda
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'Falta el parámetro de búsqueda "q".' });
  }
  if (!RAWG_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar RAWG_API_KEY en el servidor. Revisá el archivo .env.' });
  }

  try {
    const url = `${RAWG_BASE}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(q)}&page_size=20`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'GameRank/1.0 (personal project)' },
    });

    if (!response.ok) {
      const detalle = await response.text().catch(() => '');
      console.error('RAWG rechazó la búsqueda:', response.status, detalle.slice(0, 300));
      return res.status(response.status).json({ error: 'RAWG rechazó la búsqueda.', detalle: detalle.slice(0, 200) });
    }

    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results.map(normalizeGame) : [];
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'No se pudo contactar a RAWG. Probá de nuevo en un momento.' });
  }
});

module.exports = router;
