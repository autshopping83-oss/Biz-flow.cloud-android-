// src/emailService.js
import nodemailer from 'nodemailer';
import { criarCliente, obterAccessToken } from './oauth2.js';
import { obterRefreshToken } from './database.js';
import { OAUTH2_CONFIG } from './config.js';

function criarTransporte(email, clientId, clientSecret, refreshToken, accessToken) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: email,
      clientId,
      clientSecret,
      refreshToken,
      accessToken,
    },
  });
}

function montarMensagem(emailFrom, destinatario, assunto, corpoHtml, pdfBuffer, pdfNome, remetenteNome) {
  return {
    from: remetenteNome ? `"${remetenteNome}" <${emailFrom}>` : emailFrom,
    to: destinatario,
    subject: assunto,
    html: corpoHtml || `<p>Documento em anexo.</p>`,
    attachments: [
      {
        filename: pdfNome || 'documento.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };
}

async function enviarEmail({ userId, destinatario, assunto, corpoHtml, pdfBuffer, pdfNome, remetenteNome }) {
  const tokenData = await obterRefreshToken(userId);
  if (!tokenData) {
    throw new Error('Utilizador nao conectou o Gmail. Use "Conectar Gmail" primeiro.');
  }

  const { refreshToken, email } = tokenData;
  const accessToken = await obterAccessToken(refreshToken);
  const transporter = criarTransporte(email, OAUTH2_CONFIG.clientId, OAUTH2_CONFIG.clientSecret, refreshToken, accessToken);
  const mensagem = montarMensagem(email, destinatario, assunto, corpoHtml, pdfBuffer, pdfNome, remetenteNome);
  const info = await transporter.sendMail(mensagem);

  return { sucesso: true, mensagemId: info.messageId };
}

export { enviarEmail };
