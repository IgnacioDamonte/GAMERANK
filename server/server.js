require('dotenv').config();
const path = require('path');
const express = require('express');

const { initDb } = require('./db');
const gamesRoutes = require('./routes/games');
const ratingsRoutes = require('./routes/ratings');
const wishlistRoutes = require('./routes/wishlist');

const app = express();
const PORT = process.env.PORT || 4500;

if (!process.env.RAWG_API_KEY) {
  console.warn('⚠️  Falta RAWG_API_KEY en el archivo .env. La búsqueda de juegos no va a funcionar hasta que la configures.');
}
if (!process.env.DATABASE_URL) {
  console.warn('⚠️  Falta DATABASE_URL en el archivo .env. Revisá el README para configurar la base de datos.');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/games', gamesRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/wishlist', wishlistRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`GameRank corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo conectar a la base de datos:', err.message);
    process.exit(1);
  });
