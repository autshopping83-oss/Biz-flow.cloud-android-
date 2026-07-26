// src/oauth2.js
import { google } from 'googleapis';
import { OAUTH2_CONFIG, ESCOPO_GMAIL_SEND } from './config.js';
import { salvarToken } from './database.js';

function criarCliente(refreshToken) {
  const cliente = new google.auth.OAuth2(
    OAUTH2_CONFIG.clientId,
    OAUTH2_CONFIG.clientSecret,
    OAUTH2_CONFIG.redirectUri
  );
  if (refreshToken) cliente.setCredentials({ refresh_token: refreshToken });
  return cliente;
}

function gerarAuthUrl(userId, stateToken) {
  const cliente = criarCliente();
  return cliente.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [ESCOPO_GMAIL_SEND],
    state: `${userId}:${stateToken}`,
  });
}

async function trocarCodePorTokens(code, rawState) {
  const [userId] = (rawState || '').split(':');
  if (!userId) throw new Error('state invalido — userId nao encontrado');

  const cliente = criarCliente();
  const { tokens } = await cliente.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      'Nenhum refresh_token recebido. O utilizador precisa revogar o acesso anterior ' +
      'ou usar prompt=consent.'
    );
  }

  await salvarToken(userId, tokens.refresh_token, tokens.email || null);
  return { userId, email: tokens.email };
}

async function obterAccessToken(refreshToken) {
  const cliente = criarCliente(refreshToken);
  const response = await cliente.getAccessToken();
  if (!response?.token) throw new Error('Falha ao obter access_token');
  return response.token;
}

export { criarCliente, gerarAuthUrl, trocarCodePorTokens, obterAccessToken };
