// src/config.js
const PORTA = process.env.PORT || 3002;
const ESCOPO_GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';

const OAUTH2_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3002/auth/callback',
};

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'bizflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
};

const APP_URL = process.env.APP_URL || 'https://biz-flow.cloud';

if (!OAUTH2_CONFIG.clientId || !OAUTH2_CONFIG.clientSecret) {
  console.error('FATAL: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET sao obrigatorios.');
  process.exit(1);
}

export { PORTA, ESCOPO_GMAIL_SEND, OAUTH2_CONFIG, DB_CONFIG, APP_URL };
