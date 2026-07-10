// api/auth/callback.js — Callback OAuth2 Google
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || 'https://biz-flow.cloud';
const REDIRECT_URI = 'https://biz-flow.cloud/api/auth/callback';

export default async function handler(req, res) {
  const { code, state } = req.query;

  // Se não tem code, mostrar página de erro simples
  if (!code || !state) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send(`<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc">
      <div style="text-align:center">
        <h2 style="color:#ef4444">Parametros invalidos</h2>
        <p>Faltam parametros code e state na URL.</p>
      </div></body></html>`);
  }

  try {
    // Trocar code por tokens
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    const { tokens } = await oauth2Client.getToken(String(code));

    if (!tokens.refresh_token) {
      return res.redirect(`${APP_URL}?email=aviso&motivo=Sem refresh_token. Revogue o acesso e tente novamente.`);
    }

    // Guardar na BD (tentar, se falhar mostrar erro)
    try {
      const { salvarToken } = await import('../db.js');
      await salvarToken(String(state), tokens.refresh_token, tokens.email || null);
    } catch (dbError) {
      console.error('Erro BD:', dbError.message);
      // Se BD falhar, mostrar HTML para debug
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(500).send(`<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc">
        <div style="text-align:center;max-width:500px">
          <h2 style="color:#ef4444">Erro ao guardar token</h2>
          <p style="color:#64748b">${dbError.message}</p>
          <hr style="margin:20px 0">
          <p style="font-size:12px;color:#94a3b8">Token obtido com sucesso, mas falhou ao guardar na BD.</p>
          <p style="font-size:12px;color:#94a3b8">UserId: ${state}</p>
        </div></body></html>`);
    }

    // Sucesso!
    res.redirect(`${APP_URL}?email=conectado`);
  } catch (erro) {
    console.error('Erro callback OAuth2:', erro.message);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(500).send(`<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc">
      <div style="text-align:center;max-width:500px">
        <h2 style="color:#ef4444">Erro na autenticacao</h2>
        <p style="color:#64748b">${erro.message}</p>
        <hr style="margin:20px 0">
        <p style="font-size:12px;color:#94a3b8">Verifique se o Redirect URI no Google Console e exatamente:</p>
        <code style="font-size:12px;background:#f1f5f9;padding:8px 12px;border-radius:6px;display:inline-block">https://biz-flow.cloud/api/auth/callback</code>
      </div></body></html>`);
  }
}
