const { Pool } = require('pg');

// En Render (y en la mayoría de los servicios de hosting) hace falta SSL
// para conectar a la base de datos, pero no en desarrollo local.
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      rawg_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      background_image TEXT,
      released TEXT,
      graficos REAL NOT NULL,
      arte REAL NOT NULL,
      musica REAL NOT NULL,
      animaciones REAL NOT NULL,
      mecanicas REAL NOT NULL,
      historia REAL NOT NULL,
      promedio REAL NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

module.exports = { pool, initDb };
