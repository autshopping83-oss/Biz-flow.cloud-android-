// api/auth/callback.js — Callback OAuth2 Google
import { criarCliente } from '../oauth2.js';
import { salvarToken } from '../db.js';

const APP_URL = process.env.APP_URL || 'https://biz-flow.cloud';

export default async function handler(req, res) {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('Parametros code e state obrigatorios.');

  try {
    const cliente = criarCliente();
    const { tokens } = await cliente.getToken(String(code));

    if (!tokens.refresh_token) {
      return res.redirect(`${APP_URL}?email=erro&motivo=sem_refresh_token`);
    }

    await salvarToken(String(state), tokens.refresh_token, tokens.email || null);
    res.redirect(`${APP_URL}?email=conectado`);
  } catch (erro) {
    console.error('Erro callback OAuth2:', erro.message);
    res.redirect(`${APP_URL}?email=erro&motivo=${encodeURIComponent(erro.message)}`);
  }
}
