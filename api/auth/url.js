// api/auth/url.js — Gera URL de autorizacao Gmail
import { gerarAuthUrl } from '../oauth2.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ sucesso: false, erro: 'userId obrigatorio' });

  try {
    const url = gerarAuthUrl(String(userId));
    res.json({ sucesso: true, url });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
}
