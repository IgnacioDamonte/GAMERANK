const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const RAWG_BASE = 'https://api.rawg.io/api';

// El .env se edita a mano habitualmente — un espacio o salto de línea de
// más al final de la clave (fácil de meter sin querer con el Bloc de
// notas) la rompe sin que se note a simple vista. La recortamos siempre.
const RAWG_API_KEY = (process.env.RAWG_API_KEY || '').trim();

// RAWG devuelve nombres de catálogo (géneros, clasificación ESRB) siempre
// en inglés, sin importar el parámetro de idioma — son taxonomías fijas,
// no contenido traducible por juego. Los traducimos a mano acá.
const GENEROS_ES = {
  'Action': 'Acción', 'Adventure': 'Aventura', 'RPG': 'Rol (RPG)',
  'Strategy': 'Estrategia', 'Shooter': 'Disparos', 'Puzzle': 'Puzzle',
  'Racing': 'Carreras', 'Sports': 'Deportes', 'Simulation': 'Simulación',
  'Platformer': 'Plataformas', 'Fighting': 'Lucha', 'Family': 'Familiar',
  'Board Games': 'Juegos de mesa', 'Educational': 'Educativo',
  'Card': 'Cartas', 'Casual': 'Casual', 'Indie': 'Indie',
  'Massively Multiplayer': 'Multijugador masivo', 'Arcade': 'Arcade',
};
const ESRB_ES = {
  'Everyone': 'Para todo público', 'Everyone 10+': 'Mayores de 10 años',
  'Teen': 'Adolescentes', 'Mature': 'Maduro (17+)', 'Adults Only': 'Solo adultos',
  'Rating Pending': 'Clasificación pendiente',
};
function traducirGenero(nombre) { return GENEROS_ES[nombre] || nombre; }
function traducirEsrb(nombre) { return ESRB_ES[nombre] || nombre; }

function normalizeGame(g) {
  return {
    rawgId: g.id,
    name: g.name,
    backgroundImage: g.background_image || null,
    released: g.released || null,
    rawgRating: g.rating || null,
  };
}

// Saca las etiquetas HTML que RAWG a veces mete en la descripción
// (viene de Wikipedia/press kits, no de una API pensada para esto).
function limpiarDescripcion(html) {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, '').replace(/\s+\n/g, '\n').trim();
}

function normalizeGameDetail(g) {
  const platformEntries = Array.isArray(g.platforms) ? g.platforms : [];

  // La entrada de PC trae requisitos de mínimos/recomendados en texto,
  // igual que la ficha de un juego en Steam.
  const pcEntry = platformEntries.find((p) => /pc/i.test(p.platform?.name || ''));
  const pcReqSource = pcEntry?.requirements || pcEntry?.requirements_en || null;
  const pcRequirements = pcReqSource
    ? {
        minimum: pcReqSource.minimum || null,
        recommended: pcReqSource.recommended || null,
      }
    : null;

  return {
    rawgId: g.id,
    name: g.name,
    description: limpiarDescripcion(g.description_raw || g.description),
    backgroundImage: g.background_image || null,
    backgroundImageAdditional: g.background_image_additional || null,
    released: g.released || null,
    tba: !!g.tba,
    metacritic: g.metacritic || null,
    website: g.website || null,
    esrb: g.esrb_rating?.name ? traducirEsrb(g.esrb_rating.name) : null,
    playtime: g.playtime || null,
    platforms: platformEntries.map((p) => p.platform?.name).filter(Boolean),
    pcRequirements,
    genres: Array.isArray(g.genres) ? g.genres.map((x) => traducirGenero(x.name)) : [],
    developers: Array.isArray(g.developers) ? g.developers.map((x) => x.name) : [],
    publishers: Array.isArray(g.publishers) ? g.publishers.map((x) => x.name) : [],
    stores: Array.isArray(g.stores) ? g.stores.map((s) => s.store?.name).filter(Boolean) : [],
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
    const url = `${RAWG_BASE}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(q)}&page_size=20&lang=es`;
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

// GET /api/games/:id — ficha completa de un juego (estilo Steam)
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  if (!RAWG_API_KEY) {
    return res.status(500).json({ error: 'Falta configurar RAWG_API_KEY en el servidor. Revisá el archivo .env.' });
  }

  try {
    const url = `${RAWG_BASE}/games/${encodeURIComponent(id)}?key=${RAWG_API_KEY}&lang=es`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'GameRank/1.0 (personal project)' },
    });

    if (!response.ok) {
      const detalle = await response.text().catch(() => '');
      console.error('RAWG rechazó el detalle:', response.status, detalle.slice(0, 300));
      return res.status(response.status).json({ error: 'No se pudo obtener la ficha del juego.', detalle: detalle.slice(0, 200) });
    }

    const data = await response.json();
    res.json({ game: normalizeGameDetail(data) });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'No se pudo contactar a RAWG. Probá de nuevo en un momento.' });
  }
});

module.exports = router;
