// api/db.js — Conexao PostgreSQL via Supabase
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.bizflowcloud_POSTGRES_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function obterRefreshToken(userId) {
  const result = await pool.query(
    'SELECT refresh_token, email FROM user_tokens WHERE user_id = $1 AND provider = $2',
    [userId, 'gmail']
  );
  if (result.rows.length === 0) return null;
  return { refreshToken: result.rows[0].refresh_token, email: result.rows[0].email };
}

export async function salvarToken(userId, refreshToken, email) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO user_tokens (user_id, provider, refresh_token, email)
       VALUES ($1, 'gmail', $2, $3)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET refresh_token = EXCLUDED.refresh_token, email = EXCLUDED.email, updated_at = now()`,
      [userId, refreshToken, email || null]
    );
  } finally {
    client.release();
  }
}

export async function verificarConexao(userId) {
  const result = await pool.query(
    'SELECT email, created_at FROM user_tokens WHERE user_id = $1 AND provider = $2',
    [userId, 'gmail']
  );
  return result.rows.length > 0
    ? { conectado: true, email: result.rows[0].email }
    : { conectado: false };
}
