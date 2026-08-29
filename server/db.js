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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      rawg_id INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      background_image TEXT,
      released TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // ALTER ... ADD COLUMN IF NOT EXISTS: así esto no rompe la base de datos
  // que ya está corriendo en producción, solo agrega lo que falte.
  await pool.query(`
    ALTER TABLE ratings
      ADD COLUMN IF NOT EXISTS estado TEXT,
      ADD COLUMN IF NOT EXISTS nota TEXT,
      ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS horas_jugadas REAL,
      ADD COLUMN IF NOT EXISTS platino BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS genres TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS platforms TEXT[] NOT NULL DEFAULT '{}';
  `);

  await pool.query(`
    ALTER TABLE wishlist
      ADD COLUMN IF NOT EXISTS genres TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS platforms TEXT[] NOT NULL DEFAULT '{}';
  `);
}

module.exports = { pool, initDb };
