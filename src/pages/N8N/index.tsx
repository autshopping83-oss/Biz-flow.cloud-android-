/**
 * Página Principal de Integrações N8N
 * 
 * Sub-páginas organizadas por função:
 * - Email: Envio de emails (SendGrid, SMTP)
 * - WhatsApp: Mensagens WhatsApp (Twilio, Evolution API)
 * - Chatbot: Telegram, Messenger, Slack, Discord
 * - Documentos: Notificações de criação/edição/exclusão
 * - Pagamentos: Notificações de pagamento
 * - CRM: Integração com sistemas de CRM
 * - ERP: Integração com sistemas ERP
 * - Personalizado: Webhooks customizados
 */

import React, { useState } from 'react';
import { N8nIntegrationType, N8nWebhookResponse } from './types/n8n';
import { N8nLayout } from './components/N8nLayout';
import { N8nStatusBadge } from './components/N8nStatusBadge';
import { useN8nWebhook } from './hooks/useN8nWebhook';
import { webhookService } from './services/webhookService';
import { emailService } from './services/emailService';
import { whatsappService } from './services/whatsappService';
import { chatbotService } from './services/chatbotService';
import { documentService } from './services/documentService';
import { paymentService } from './services/paymentService';

interface N8nPageProps {
  userId?: string;
  onBack?: () => void;
}

export const N8nPage: React.FC<N8nPageProps> = ({ userId, onBack }) => {
  const [activeIntegration, setActiveIntegration] = useState<N8nIntegrationType>('email');
  const {
    isTesting,
    lastResult,
    integrationStatus,
    testConnection,
    sendEvent,
    setIntegrationStatus,
    resetResult,
  } = useN8nWebhook(userId);

  const handleNavigate = (id: N8nIntegrationType) => {
    setActiveIntegration(id);
    resetResult();
  };

  const renderIntegrationContent = () => {
    switch (activeIntegration) {
      case 'email':
        return <EmailSection userId={userId} sendEvent={sendEvent} isTesting={isTesting} lastResult={lastResult} />;
      case 'whatsapp':
        return <WhatsAppSection userId={userId} sendEvent={sendEvent} isTesting={isTesting} lastResult={lastResult} />;
      case 'chatbot':
        return <ChatbotSection userId={userId} sendEvent={sendEvent} isTesting={isTesting} lastResult={lastResult} />;
      case 'documents':
        return <DocumentsSection userId={userId} sendEvent={sendEvent} isTesting={isTesting} lastResult={lastResult} />;
      case 'payments':
        return <PaymentsSection userId={userId} sendEvent={sendEvent} isTesting={isTesting} lastResult={lastResult} />;
      case 'crm':
        return <CrmSection userId={userId} sendEvent={sendEvent} isTesting={isTesting} lastResult={lastResult} />;
      case 'erp':
        return <ErpSection userId={userId} sendEvent={sendEvent} isTesting={isTesting} lastResult={lastResult} />;
      case 'custom':
        return <CustomSection userId={userId} sendEvent={sendEvent} isTesting={isTesting} lastResult={lastResult} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Top Bar */}
      <header className="bg-white dark:bg-slate-900 h-14 flex-none shadow-sm border-b dark:border-slate-800 flex items-center px-4 z-10">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors mr-3"
        >
          <i className="fa-solid fa-arrow-left text-xs"></i>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <i className="fa-solid fa-plug text-white text-[10px]"></i>
          </div>
          <h1 className="text-sm font-bold dark:text-white">Integrações N8N</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <N8nStatusBadge status={integrationStatus['webhook'] || 'disconnected'} size="md" />
        </div>
      </header>

      {/* Main Content with Layout */}
      <div className="flex-1 overflow-hidden">
        <N8nLayout
          activeIntegration={activeIntegration}
          onNavigate={handleNavigate}
          integrationStatus={integrationStatus}
          onTestConnection={testConnection}
          isTesting={isTesting}
          webhookUrl={webhookService.getWebhookUrl()}
        >
          {renderIntegrationContent()}
        </N8nLayout>
      </div>
    </div>
  );
};

// ============================================================
// SUB-PÁGINAS DE INTEGRAÇÃO
// ============================================================

interface SectionProps {
  userId?: string;
  sendEvent: (event: string, data: Record<string, any>) => Promise<N8nWebhookResponse | null>;
  isTesting: boolean;
  lastResult: N8nWebhookResponse | null;
}

// ---------- EMAIL ----------
const EmailSection: React.FC<SectionProps> = ({ userId, sendEvent, isTesting, lastResult }) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const handleSend = async () => {
    if (!to || !subject || !body) return;
    await sendEvent('notification.email', { to, subject, body, type: 'email' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <i className="fa-solid fa-envelope text-blue-500"></i>
          Email
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Envie emails transacionais via SendGrid, SMTP ou outros serviços configurados no n8n.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4 shadow-sm border dark:border-slate-800">
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Para</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="cliente@exemplo.com"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Assunto</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Assunto do email"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Mensagem</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Corpo do email..."
            rows={4}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white resize-none"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={isTesting || !to || !subject || !body}
          className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isTesting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
          {isTesting ? 'Enviando...' : 'Enviar Email'}
        </button>
      </div>

      <QuickActions
        actions={[
          { label: 'Enviar Boas-Vindas', onClick: () => sendEvent('notification.email', { to: 'novo@cliente.com', subject: 'Bem-vindo!', body: 'Seja bem-vindo ao BizFlow Cloud!', type: 'email' }) },
          { label: 'Enviar Fatura', onClick: () => sendEvent('notification.email', { to: 'cliente@email.com', subject: 'Fatura #0001', body: 'Segue a fatura em anexo.', type: 'email' }) },
        ]}
      />

      {lastResult && <ResultDisplay result={lastResult} />}
    </div>
  );
};

// ---------- WHATSAPP ----------
const WhatsAppSection: React.FC<SectionProps> = ({ userId, sendEvent, isTesting, lastResult }) => {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!phone || !message) return;
    await sendEvent('notification.whatsapp', { phone, message, type: 'whatsapp' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <i className="fa-brands fa-whatsapp text-emerald-500"></i>
          WhatsApp
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Envie mensagens WhatsApp via Twilio, Evolution API ou Baileys configurados no n8n.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4 shadow-sm border dark:border-slate-800">
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Telefone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="258840000000"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Mensagem</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite a mensagem..."
            rows={4}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white resize-none"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={isTesting || !phone || !message}
          className="w-full bg-emerald-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isTesting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-brands fa-whatsapp"></i>}
          {isTesting ? 'Enviando...' : 'Enviar WhatsApp'}
        </button>
      </div>

      <QuickActions
        actions={[
          { label: 'Lembrete Pagamento', onClick: () => sendEvent('notification.whatsapp', { phone: '258840000000', message: '⏰ Lembrete: Fatura #0001 vence amanhã!', type: 'whatsapp' }) },
          { label: 'Confirmação', onClick: () => sendEvent('notification.whatsapp', { phone: '258840000000', message: '✅ Pagamento recebido com sucesso!', type: 'whatsapp' }) },
        ]}
      />

      {lastResult && <ResultDisplay result={lastResult} />}
    </div>
  );
};

// ---------- CHATBOT ----------
const ChatbotSection: React.FC<SectionProps> = ({ userId, sendEvent, isTesting, lastResult }) => {
  const [platform, setPlatform] = useState('telegram');
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!recipientId || !message) return;
    await sendEvent('notification.chatbot', { platform, recipientId, message, type: 'chatbot' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <i className="fa-solid fa-robot text-amber-500"></i>
          Chatbot
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Integre com Telegram, Messenger, Slack ou Discord via n8n.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4 shadow-sm border dark:border-slate-800">
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Plataforma</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white"
          >
            <option value="telegram">Telegram</option>
            <option value="messenger">Messenger</option>
            <option value="slack">Slack</option>
            <option value="discord">Discord</option>
            <option value="whatsapp">WhatsApp Business API</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">ID do Destinatário</label>
          <input
            type="text"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            placeholder="123456789"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Mensagem</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite a mensagem..."
            rows={4}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white resize-none"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={isTesting || !recipientId || !message}
          className="w-full bg-amber-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-amber-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isTesting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-robot"></i>}
          {isTesting ? 'Enviando...' : 'Enviar para Chatbot'}
        </button>
      </div>

      <QuickActions
        actions={[
          { label: 'Notificar Documento', onClick: () => sendEvent('notification.chatbot', { platform: 'telegram', recipientId: '123456789', message: '📄 Novo documento gerado!', type: 'chatbot' }) },
          { label: 'Alerta Pagamento', onClick: () => sendEvent('notification.chatbot', { platform: 'slack', recipientId: 'C123456', message: '💰 Pagamento recebido: 1.500 MZN', type: 'chatbot' }) },
        ]}
      />

      {lastResult && <ResultDisplay result={lastResult} />}
    </div>
  );
};

// ---------- DOCUMENTOS ----------
const DocumentsSection: React.FC<SectionProps> = ({ userId, sendEvent, isTesting, lastResult }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <i className="fa-solid fa-file-invoice text-rose-500"></i>
          Documentos
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Notificações automáticas quando documentos são criados, editados ou compartilhados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ActionCard
          icon="fa-solid fa-plus-circle"
          title="Documento Criado"
          description="Notificar quando uma fatura/recibo for criado"
          color="rose"
          onClick={() => sendEvent('document.created', {
            documentId: 'doc-001',
            documentNumber: 'FAT-0001',
            documentType: 'INVOICE',
            clientName: 'Cliente Exemplo',
            total: 1500.00,
            currency: 'MZN',
          })}
          loading={isTesting}
        />
        <ActionCard
          icon="fa-solid fa-pen"
          title="Documento Atualizado"
          description="Notificar quando um documento for editado"
          color="blue"
          onClick={() => sendEvent('document.updated', {
            documentId: 'doc-001',
            documentNumber: 'FAT-0001',
            documentType: 'INVOICE',
            updatedAt: new Date().toISOString(),
          })}
          loading={isTesting}
        />
        <ActionCard
          icon="fa-solid fa-trash"
          title="Documento Excluído"
          description="Notificar quando um documento for removido"
          color="red"
          onClick={() => sendEvent('document.deleted', {
            documentId: 'doc-001',
            documentNumber: 'FAT-0001',
            deletedAt: new Date().toISOString(),
          })}
          loading={isTesting}
        />
        <ActionCard
          icon="fa-solid fa-share"
          title="Documento Compartilhado"
          description="Notificar quando um documento for enviado"
          color="emerald"
          onClick={() => sendEvent('document.shared', {
            method: 'whatsapp',
            recipient: '258840000000',
            documentId: 'doc-001',
            documentNumber: 'FAT-0001',
          })}
          loading={isTesting}
        />
      </div>

      {lastResult && <ResultDisplay result={lastResult} />}
    </div>
  );
};

// ---------- PAGAMENTOS ----------
const PaymentsSection: React.FC<SectionProps> = ({ userId, sendEvent, isTesting, lastResult }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <i className="fa-solid fa-credit-card text-violet-500"></i>
          Pagamentos
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Notificações de pagamentos recebidos, solicitados ou rejeitados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ActionCard
          icon="fa-solid fa-check-circle"
          title="Pagamento Recebido"
          description="Notificar quando um pagamento for confirmado"
          color="emerald"
          onClick={() => sendEvent('payment.received', {
            paymentId: 'pay-001',
            amount: 1500.00,
            currency: 'MZN',
            payerName: 'Cliente Exemplo',
            method: 'transferencia',
            status: 'approved',
          })}
          loading={isTesting}
        />
        <ActionCard
          icon="fa-solid fa-clock"
          title="Pagamento Solicitado"
          description="Notificar quando um pagamento for solicitado"
          color="amber"
          onClick={() => sendEvent('payment.requested', {
            paymentId: 'pay-002',
            amount: 2500.00,
            currency: 'MZN',
            payerName: 'Cliente Exemplo',
            dueDate: '2026-06-01',
          })}
          loading={isTesting}
        />
      </div>

      {lastResult && <ResultDisplay result={lastResult} />}
    </div>
  );
};

// ---------- CRM ----------
const CrmSection: React.FC<SectionProps> = ({ userId, sendEvent, isTesting, lastResult }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <i className="fa-solid fa-users text-indigo-500"></i>
          CRM
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Integração com sistemas de CRM. Sincronize clientes, histórico e interações.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border dark:border-slate-800 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-users text-2xl text-indigo-500"></i>
        </div>
        <h4 className="text-base font-bold dark:text-white mb-2">Integração CRM</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Configure a sincronização com seu CRM favorito via n8n.
        </p>
        <button
          onClick={() => sendEvent('sync.completed', { system: 'crm', action: 'test_connection', test: true })}
          disabled={isTesting}
          className="bg-indigo-600 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isTesting ? 'Testando...' : 'Testar Conexão CRM'}
        </button>
      </div>

      {lastResult && <ResultDisplay result={lastResult} />}
    </div>
  );
};

// ---------- ERP ----------
const ErpSection: React.FC<SectionProps> = ({ userId, sendEvent, isTesting, lastResult }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <i className="fa-solid fa-building text-cyan-500"></i>
          ERP
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Integração com sistemas ERP. Sincronize documentos fiscais, estoque e financeiro.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border dark:border-slate-800 text-center">
        <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-building text-2xl text-cyan-500"></i>
        </div>
        <h4 className="text-base font-bold dark:text-white mb-2">Integração ERP</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Conecte com sistemas como SAP, Oracle, Odoo ou ERPs customizados.
        </p>
        <button
          onClick={() => sendEvent('sync.completed', { system: 'erp', action: 'test_connection', test: true })}
          disabled={isTesting}
          className="bg-cyan-600 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-cyan-700 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isTesting ? 'Testando...' : 'Testar Conexão ERP'}
        </button>
      </div>

      {lastResult && <ResultDisplay result={lastResult} />}
    </div>
  );
};

// ---------- PERSONALIZADO ----------
const CustomSection: React.FC<SectionProps> = ({ userId, sendEvent, isTesting, lastResult }) => {
  const [eventType, setEventType] = useState('test.connection');
  const [payloadJson, setPayloadJson] = useState('{\n  "message": "Hello from BizFlow!",\n  "timestamp": "' + new Date().toISOString() + '"\n}');

  const handleSend = async () => {
    try {
      const data = JSON.parse(payloadJson);
      await sendEvent(eventType as any, data);
    } catch (e) {
      // JSON inválido
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold dark:text-white flex items-center gap-2">
          <i className="fa-solid fa-code text-slate-500"></i>
          Webhook Personalizado
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Envie payloads customizados para qualquer evento do webhook n8n.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 space-y-4 shadow-sm border dark:border-slate-800">
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Tipo de Evento</label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm dark:text-white"
          >
            <option value="test.connection">test.connection</option>
            <option value="document.created">document.created</option>
            <option value="document.updated">document.updated</option>
            <option value="document.deleted">document.deleted</option>
            <option value="document.shared">document.shared</option>
            <option value="payment.received">payment.received</option>
            <option value="payment.requested">payment.requested</option>
            <option value="notification.email">notification.email</option>
            <option value="notification.whatsapp">notification.whatsapp</option>
            <option value="notification.chatbot">notification.chatbot</option>
            <option value="sync.completed">sync.completed</option>
            <option value="error.occurred">error.occurred</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Payload (JSON)</label>
          <textarea
            value={payloadJson}
            onChange={(e) => setPayloadJson(e.target.value)}
            rows={8}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm font-mono dark:text-white resize-none"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={isTesting}
          className="w-full bg-slate-800 dark:bg-slate-700 text-white rounded-xl py-3 text-sm font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isTesting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
          {isTesting ? 'Enviando...' : 'Enviar Payload'}
        </button>
      </div>

      {lastResult && <ResultDisplay result={lastResult} />}
    </div>
  );
};

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

interface QuickActionsProps {
  actions: Array<{ label: string; onClick: () => void }>;
}

const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => (
  <div>
    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2">Ações Rápidas</p>
    <div className="flex flex-wrap gap-2">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={action.onClick}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
        >
          {action.label}
        </button>
      ))}
    </div>
  </div>
);

interface ActionCardProps {
  icon: string;
  title: string;
  description: string;
  color: 'rose' | 'blue' | 'red' | 'emerald' | 'amber' | 'violet';
  onClick: () => void;
  loading?: boolean;
}

const colorMap: Record<ActionCardProps['color'], { bg: string; hover: string; icon: string }> = {
  rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', hover: 'hover:bg-rose-100 dark:hover:bg-rose-900/30', icon: 'text-rose-500' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30', icon: 'text-blue-500' },
  red: { bg: 'bg-red-50 dark:bg-red-900/20', hover: 'hover:bg-red-100 dark:hover:bg-red-900/30', icon: 'text-red-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30', icon: 'text-emerald-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30', icon: 'text-amber-500' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/30', icon: 'text-violet-500' },
};

const ActionCard: React.FC<ActionCardProps> = ({ icon, title, description, color, onClick, loading }) => {
  const colors = colorMap[color];

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`${colors.bg} ${colors.hover} rounded-2xl p-5 text-left transition-all active:scale-[0.98] disabled:opacity-50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700`}
    >
      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center mb-3`}>
        <i className={`${icon} ${colors.icon}`}></i>
      </div>
      <h4 className="text-sm font-bold dark:text-white mb-1">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </button>
  );
};

const ResultDisplay: React.FC<{ result: N8nWebhookResponse }> = ({ result }) => (
  <div
    className={`rounded-2xl p-4 text-sm font-mono ${
      result.success
        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
    }`}
  >
    <div className="font-bold mb-1 flex items-center gap-2">
      {result.success ? (
        <><i className="fa-solid fa-check-circle text-emerald-500"></i> Sucesso</>
      ) : (
        <><i className="fa-solid fa-exclamation-circle text-red-500"></i> Erro</>
      )}
    </div>
    <p className="text-xs opacity-80">{result.message || result.error}</p>
    {!!result.data && (
      <pre className="mt-2 text-[10px] opacity-60 overflow-x-auto">
        {JSON.stringify(result.data, null, 2)}
      </pre>
    )}
  </div>
);

export default N8nPage;
