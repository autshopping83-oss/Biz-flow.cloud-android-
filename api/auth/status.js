// api/auth/status.js — Verifica se o utilizador conectou o Gmail
import { verificarConexao } from '../db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ sucesso: false, erro: 'userId obrigatorio' });

  try {
    const status = await verificarConexao(String(userId));
    res.json({ sucesso: true, ...status });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
}
