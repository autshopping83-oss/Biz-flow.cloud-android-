// src/routes.js
import { Router } from 'express';
import crypto from 'crypto';
import { gerarAuthUrl, trocarCodePorTokens } from './oauth2.js';
import { verificarConexao } from './database.js';
import { enviarEmail } from './emailService.js';
import { APP_URL } from './config.js';

const router = Router();

// Mapa temporario para validacao CSRF do state OAuth
const stateMap = new Map();
setInterval(() => {
  for (const [key, val] of stateMap) {
    if (Date.now() > val.expiraEm) stateMap.delete(key);
  }
}, 60000); // Limpeza a cada 60s

// GET /auth/url?userId=xxx
router.get('/auth/url', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ sucesso: false, erro: 'userId obrigatorio' });

  const stateToken = crypto.randomUUID();
  stateMap.set(stateToken, { userId: String(userId), expiraEm: Date.now() + 600000 }); // 10min

  const authUrl = gerarAuthUrl(String(userId), stateToken);
  res.json({ sucesso: true, url: authUrl });
});

// GET /auth/callback?code=...&state=userId:token
router.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('Parametros code e state obrigatorios.');

  const [userId, stateToken] = String(state).split(':');
  const savedState = stateMap.get(stateToken);

  if (!savedState || savedState.userId !== userId) {
    return res.redirect(`${APP_URL}?email=erro&motivo=state_invalido`);
  }
  stateMap.delete(stateToken);
  if (Date.now() > savedState.expiraEm) {
    return res.redirect(`${APP_URL}?email=erro&motivo=state_expirado`);
  }

  try {
    await trocarCodePorTokens(String(code), String(state));
    res.redirect(`${APP_URL}?email=conectado`);
  } catch (erro) {
    console.error(' Erro no callback OAuth2:', erro.message);
    res.redirect(`${APP_URL}?email=erro&motivo=${encodeURIComponent(erro.message)}`);
  }
});

// GET /auth/status?userId=xxx
router.get('/auth/status', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ sucesso: false, erro: 'userId obrigatorio' });

  try {
    const status = await verificarConexao(String(userId));
    res.json({ sucesso: true, ...status });
  } catch (erro) {
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

// POST /enviar
router.post('/enviar', async (req, res) => {
  const { userId, destinatario, assunto, corpoHtml, pdfBase64, pdfNome, remetenteNome } = req.body;

  if (!userId) return res.status(400).json({ sucesso: false, erro: 'userId obrigatorio' });
  if (!destinatario) return res.status(400).json({ sucesso: false, erro: 'destinatario obrigatorio' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
    return res.status(400).json({ sucesso: false, erro: 'Formato de email invalido' });
  }
  if (!assunto) return res.status(400).json({ sucesso: false, erro: 'assunto obrigatorio' });
  if (!pdfBase64) return res.status(400).json({ sucesso: false, erro: 'pdfBase64 obrigatorio' });

  try {
    atob(pdfBase64);
  } catch {
    return res.status(400).json({ sucesso: false, erro: 'pdfBase64 invalido (nao e base64)' });
  }

  try {
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const resultado = await enviarEmail({
      userId, destinatario, assunto,
      corpoHtml: corpoHtml || `<p>Documento em anexo.</p>`,
      pdfBuffer, pdfNome: pdfNome || 'documento.pdf', remetenteNome,
    });
    res.json(resultado);
  } catch (erro) {
    console.error(' Erro ao enviar email:', erro.message);
    if (erro.message.includes('invalid_grant') || erro.message.includes('Token has been expired')) {
      return res.status(401).json({
        sucesso: false, erro: 'Token expirado. Conecte o Gmail novamente.', codigo: 'TOKEN_EXPIRED',
      });
    }
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
});

export default router;
