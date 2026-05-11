/**
 * API Dashboard - Painel de Integração da API
 * 
 * Painel dedicado dentro do aplicativo para:
 * - Visualizar status da API
 * - Gerar/gerenciar chaves de API
 * - Testar endpoints
 * - Ver documentação
 * - Monitorar webhooks n8n
 */

import React, { useState, useEffect } from 'react';
import { apiService, ApiEndpoint } from '../services/apiService';
import { n8nWebhookService } from '../services/n8nWebhookService';

interface ApiDashboardProps {
  userId?: string;
  onBack?: () => void;
  onOpenDocs?: () => void;
}

export const ApiDashboard: React.FC<ApiDashboardProps> = ({ userId, onBack, onOpenDocs }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'test' | 'webhooks'>('overview');
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [testMethod, setTestMethod] = useState<'GET' | 'POST'>('GET');
  const [testPath, setTestPath] = useState('/health');
  const [testBody, setTestBody] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [webhookLogs, setWebhookLogs] = useState<Array<{ event: string; timestamp: number; status: string }>>([]);

  useEffect(() => {
    try {
      const eps = apiService.listEndpoints();
      setEndpoints(eps);
      const key = apiService.getApiKey();
      if (key) setApiKey(key);
    } catch {}
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateNewKey = () => {
    const newKey = apiService.generateApiKey();
    setApiKey(newKey);
    setShowKey(true);
  };

  const testEndpoint = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await apiService.handleRequest({
        method: testMethod,
        path: testPath,
        body: testBody ? JSON.parse(testBody) : undefined,
        userId,
      });
      setTestResult(JSON.stringify(result, null, 2));
    } catch (e: any) {
      setTestResult(`Erro: ${e.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const testWebhookConnection = async () => {
    setWebhookStatus('unknown');
    try {
      const result = await n8nWebhookService.testConnection();
      setWebhookStatus(result.success ? 'connected' : 'error');
    } catch {
      setWebhookStatus('error');
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-emerald-500';
      case 'POST': return 'bg-blue-500';
      case 'PUT': return 'bg-amber-500';
      case 'PATCH': return 'bg-purple-500';
      case 'DELETE': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">
                <i className="fa-solid fa-arrow-left text-xs"></i>
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <i className="fa-solid fa-code text-white text-xs"></i>
            </div>
            <div>
              <h1 className="text-sm font-bold dark:text-white">API Dashboard</h1>
              <p className="text-[10px] text-slate-400">Painel de Integração</p>
            </div>
          </div>
          <button
            onClick={onOpenDocs}
            className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <i className="fa-solid fa-book mr-1"></i>
            Documentação
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 flex gap-0 overflow-x-auto">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon="fa-solid fa-gauge-high" label="Visão Geral" />
          <TabButton active={activeTab === 'keys'} onClick={() => setActiveTab('keys')} icon="fa-solid fa-key" label="Chaves de API" />
          <TabButton active={activeTab === 'test'} onClick={() => setActiveTab('test')} icon="fa-solid fa-flask" label="Testar API" />
          <TabButton active={activeTab === 'webhooks'} onClick={() => setActiveTab('webhooks')} icon="fa-solid fa-plug" label="Webhooks" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <OverviewTab endpoints={endpoints} getMethodColor={getMethodColor} />
        )}
        {activeTab === 'keys' && (
          <KeysTab apiKey={apiKey} showKey={showKey} setShowKey={setShowKey} generateNewKey={generateNewKey} copyToClipboard={copyToClipboard} copied={copied} />
        )}
        {activeTab === 'test' && (
          <TestTab
            testMethod={testMethod} setTestMethod={setTestMethod}
            testPath={testPath} setTestPath={setTestPath}
            testBody={testBody} setTestBody={setTestBody}
            testResult={testResult} testLoading={testLoading}
            testEndpoint={testEndpoint}
          />
        )}
        {activeTab === 'webhooks' && (
          <WebhooksTab
            webhookStatus={webhookStatus}
            testWebhookConnection={testWebhookConnection}
            webhookLogs={webhookLogs}
            userId={userId}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================
// TAB BUTTON
// ============================================================

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
      active
        ? 'text-blue-600 border-blue-600'
        : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'
    }`}
  >
    <i className={`${icon} ${active ? 'text-blue-600' : ''}`}></i>
    {label}
  </button>
);

// ============================================================
// OVERVIEW TAB
// ============================================================

const OverviewTab: React.FC<{ endpoints: ApiEndpoint[]; getMethodColor: (m: string) => string }> = ({ endpoints, getMethodColor }) => {
  const publicCount = endpoints.filter(e => !e.auth).length;
  const authCount = endpoints.filter(e => e.auth).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="fa-solid fa-code" value={endpoints.length.toString()} label="Total Endpoints" color="blue" />
        <StatCard icon="fa-solid fa-unlock" value={publicCount.toString()} label="Públicos" color="emerald" />
        <StatCard icon="fa-solid fa-lock" value={authCount.toString()} label="Autenticados" color="amber" />
        <StatCard icon="fa-solid fa-plug" value="4" label="Eventos n8n" color="purple" />
      </div>

      {/* Endpoints List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b dark:border-slate-800">
          <h3 className="text-sm font-bold dark:text-white">Endpoints Registados</h3>
        </div>
        <div className="divide-y dark:divide-slate-800">
          {endpoints.map((ep, i) => (
            <div key={i} className="p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${getMethodColor(ep.method)}`}>
                {ep.method}
              </span>
              <code className="text-xs font-mono text-slate-700 dark:text-slate-300 flex-1">{ep.path}</code>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                ep.auth
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              }`}>
                {ep.auth ? 'Auth' : 'Public'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: string; value: string; label: string; color: string }> = ({ icon, value, label, color }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border dark:border-slate-800">
      <div className={`w-8 h-8 rounded-lg ${colorMap[color]} flex items-center justify-center mb-2`}>
        <i className={`${icon} text-sm`}></i>
      </div>
      <p className="text-2xl font-black dark:text-white">{value}</p>
      <p className="text-[10px] text-slate-400 font-bold mt-1">{label}</p>
    </div>
  );
};

// ============================================================
// KEYS TAB
// ============================================================

const KeysTab: React.FC<{
  apiKey: string | null;
  showKey: boolean;
  setShowKey: (v: boolean) => void;
  generateNewKey: () => void;
  copyToClipboard: (text: string, label: string) => void;
  copied: string | null;
}> = ({ apiKey, showKey, setShowKey, generateNewKey, copyToClipboard, copied }) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
      <h3 className="text-sm font-bold dark:text-white mb-2">Chave de API</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Use esta chave para autenticar requisições à API. Mantenha-a segura.
      </p>

      {apiKey ? (
        <div className="space-y-3">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between">
            <code className="text-sm font-mono text-blue-600 dark:text-blue-400 break-all">
              {showKey ? apiKey : '••••••••••••••••••••••••••••'}
            </code>
            <div className="flex gap-2 ml-2">
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-xs text-slate-400 hover:text-blue-500 p-1"
              >
                <i className={`fa-solid ${showKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
              <button
                onClick={() => copyToClipboard(apiKey, 'api-key')}
                className="text-xs text-slate-400 hover:text-blue-500 p-1"
              >
                {copied === 'api-key' ? <i className="fa-solid fa-check text-emerald-500"></i> : <i className="fa-solid fa-copy"></i>}
              </button>
            </div>
          </div>
          <button
            onClick={generateNewKey}
            className="text-xs text-red-500 hover:text-red-700 font-bold"
          >
            <i className="fa-solid fa-rotate mr-1"></i>
            Gerar nova chave (a anterior será invalidada)
          </button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-amber-500 mb-3">Nenhuma chave de API gerada ainda.</p>
          <button
            onClick={generateNewKey}
            className="bg-blue-600 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-blue-700 transition-all active:scale-[0.98]"
          >
            <i className="fa-solid fa-key mr-2"></i>
            Gerar Chave de API
          </button>
        </div>
      )}
    </div>

    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
      <h3 className="text-sm font-bold dark:text-white mb-2">Como usar</h3>
      <div className="space-y-3">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
          <p className="text-[10px] font-bold text-slate-500 mb-1">Header HTTP</p>
          <code className="text-xs font-mono text-blue-600 dark:text-blue-400">x-api-key: bf_sua_chave_aqui</code>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
          <p className="text-[10px] font-bold text-slate-500 mb-1">Query Parameter</p>
          <code className="text-xs font-mono text-blue-600 dark:text-blue-400">?api_key=bf_sua_chave_aqui</code>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================
// TEST TAB
// ============================================================

const TestTab: React.FC<{
  testMethod: 'GET' | 'POST';
  setTestMethod: (v: 'GET' | 'POST') => void;
  testPath: string;
  setTestPath: (v: string) => void;
  testBody: string;
  setTestBody: (v: string) => void;
  testResult: string | null;
  testLoading: boolean;
  testEndpoint: () => void;
}> = ({ testMethod, setTestMethod, testPath, setTestPath, testBody, setTestBody, testResult, testLoading, testEndpoint }) => (
  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
    <h3 className="text-sm font-bold dark:text-white mb-4">
      <i className="fa-solid fa-flask text-purple-500 mr-2"></i>
      Testar Endpoint
    </h3>

    <div className="space-y-4">
      {/* Method + Path */}
      <div className="flex gap-3">
        <select
          value={testMethod}
          onChange={(e) => setTestMethod(e.target.value as any)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold dark:text-white w-24"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
        <input
          type="text"
          value={testPath}
          onChange={(e) => setTestPath(e.target.value)}
          placeholder="/health"
          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono dark:text-white"
        />
      </div>

      {/* Body (for POST) */}
      {testMethod === 'POST' && (
        <div>
          <label className="text-[10px] font-bold text-slate-500 mb-1 block">Body (JSON)</label>
          <textarea
            value={testBody}
            onChange={(e) => setTestBody(e.target.value)}
            placeholder='{"event": "test.connection"}'
            rows={4}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono dark:text-white"
          />
        </div>
      )}

      <button
        onClick={testEndpoint}
        disabled={testLoading}
        className="bg-purple-600 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-purple-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
      >
        {testLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-play"></i>}
        {testLoading ? 'Testando...' : 'Executar'}
      </button>

      {testResult && (
        <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 overflow-x-auto mt-4">
          <pre className="text-xs text-emerald-400 font-mono">{testResult}</pre>
        </div>
      )}
    </div>
  </div>
);

// ============================================================
// WEBHOOKS TAB
// ============================================================

const WebhooksTab: React.FC<{
  webhookStatus: 'unknown' | 'connected' | 'error';
  testWebhookConnection: () => void;
  webhookLogs: Array<{ event: string; timestamp: number; status: string }>;
  userId?: string;
}> = ({ webhookStatus, testWebhookConnection, webhookLogs, userId }) => (
  <div className="space-y-6">
    {/* Status */}
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold dark:text-white">
          <i className="fa-solid fa-plug text-purple-500 mr-2"></i>
          Webhook n8n
        </h3>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
          webhookStatus === 'connected' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
          webhookStatus === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
          'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          <i className={`fa-solid mr-1 ${
            webhookStatus === 'connected' ? 'fa-check-circle' :
            webhookStatus === 'error' ? 'fa-exclamation-circle' :
            'fa-question-circle'
          }`}></i>
          {webhookStatus === 'connected' ? 'Conectado' : webhookStatus === 'error' ? 'Erro' : 'Não testado'}
        </span>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-4">
        <p className="text-[10px] font-bold text-slate-500 mb-1">Webhook URL</p>
        <code className="text-sm font-mono text-purple-600 dark:text-purple-400">POST /api/n8n/webhook</code>
      </div>

      <button
        onClick={testWebhookConnection}
        className="bg-purple-600 text-white rounded-xl px-6 py-2.5 text-sm font-bold hover:bg-purple-700 transition-all active:scale-[0.98]"
      >
        <i className="fa-solid fa-plug mr-2"></i>
        Testar Conexão
      </button>
    </div>

    {/* Eventos Suportados */}
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
      <h3 className="text-sm font-bold dark:text-white mb-4">Eventos Suportados</h3>
      <div className="space-y-2">
        <EventRow event="document.create" description="Criar documento" />
        <EventRow event="sync.trigger" description="Forçar sincronização" />
        <EventRow event="notification.sent" description="Notificação enviada" />
        <EventRow event="test.connection" description="Testar conexão" />
      </div>
    </div>

    {/* Logs */}
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border dark:border-slate-800">
      <h3 className="text-sm font-bold dark:text-white mb-4">Histórico de Webhooks</h3>
      {webhookLogs.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <i className="fa-solid fa-clock text-2xl mb-2"></i>
          <p className="text-xs">Nenhum webhook recebido ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhookLogs.map((log, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div>
                <code className="text-xs font-mono text-purple-600 dark:text-purple-400">{log.event}</code>
                <p className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {log.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const EventRow: React.FC<{ event: string; description: string }> = ({ event, description }) => (
  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 flex items-center justify-between">
    <div>
      <code className="text-xs font-mono text-purple-600 dark:text-purple-400">{event}</code>
      <p className="text-[10px] text-slate-400">{description}</p>
    </div>
    <i className="fa-solid fa-arrow-right text-slate-300 text-xs"></i>
  </div>
);

export default ApiDashboard;
