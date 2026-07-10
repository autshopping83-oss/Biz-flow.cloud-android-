// api/enviar.js — Envia email com PDF anexo via Gmail
import nodemailer from 'nodemailer';
import { criarCliente } from './oauth2.js';
import { obterRefreshToken } from './db.js';

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ sucesso: false, erro: 'Metodo nao permitido' });

  const { userId, destinatario, assunto, corpoHtml, pdfBase64, pdfNome, remetenteNome } = req.body;

  if (!userId) return res.status(400).json({ sucesso: false, erro: 'userId obrigatorio' });
  if (!destinatario || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
    return res.status(400).json({ sucesso: false, erro: 'Email invalido' });
  }
  if (!assunto) return res.status(400).json({ sucesso: false, erro: 'assunto obrigatorio' });
  if (!pdfBase64) return res.status(400).json({ sucesso: false, erro: 'pdfBase64 obrigatorio' });

  try {
    atob(pdfBase64);
  } catch {
    return res.status(400).json({ sucesso: false, erro: 'pdfBase64 invalido' });
  }

  try {
    const tokenData = await obterRefreshToken(String(userId));
    if (!tokenData) {
      return res.status(401).json({ sucesso: false, erro: 'Conecte o Gmail primeiro', codigo: 'NOT_CONNECTED' });
    }

    const { refreshToken, email } = tokenData;
    const cliente = criarCliente(refreshToken);
    const accessTokenResponse = await cliente.getAccessToken();
    const accessToken = accessTokenResponse?.token;
    if (!accessToken) return res.status(401).json({ sucesso: false, erro: 'Token expirado', codigo: 'TOKEN_EXPIRED' });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { type: 'OAuth2', user: email, clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, refreshToken, accessToken },
    });

    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const info = await transporter.sendMail({
      from: remetenteNome ? `"${remetenteNome}" <${email}>` : email,
      to: destinatario,
      subject: assunto,
      html: corpoHtml || '<p>Documento em anexo.</p>',
      attachments: [{ filename: pdfNome || 'documento.pdf', content: pdfBuffer, contentType: 'application/pdf' }],
    });

    res.json({ sucesso: true, mensagemId: info.messageId });
  } catch (erro) {
    console.error('Erro ao enviar email:', erro.message);
    if (erro.message.includes('invalid_grant')) {
      return res.status(401).json({ sucesso: false, erro: 'Token expirado. Conecte o Gmail novamente.', codigo: 'TOKEN_EXPIRED' });
    }
    res.status(500).json({ sucesso: false, erro: erro.message });
  }
}
