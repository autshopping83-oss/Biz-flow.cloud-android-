/**
 * ApiKeyManager - Gerenciamento de Chaves de API
 * 
 * Permite que usuários criem, visualizem e gerenciem suas chaves de API
 * para integração com serviços externos.
 */

import React, { useState, useEffect } from 'react';
import { ApiKeyService, ApiKey } from '../services/apiKeyService';

export const ApiKeyManager: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read']);
  const [createdKey, setCreatedKey] = useState<{ id: string; key: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => { loadKeys(); }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const data = await ApiKeyService.list();
      setKeys(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar chaves');
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setError('');
    try {
      const result = await ApiKeyService.create({
        name: newKeyName.trim(),
        permissions: newKeyPermissions,
      });
      setCreatedKey(result);
      setNewKeyName('');
      setShowNewForm(false);
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar chave');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta chave?')) return;
    try {
      await ApiKeyService.delete(id);
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao remover chave');
    }
  };

  const handleToggleActive = async (key: ApiKey) => {
    try {
      await ApiKeyService.toggleActive(key.id, !key.is_active);
      await loadKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar estado da chave');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleVisibility = (id: string) => {
    const newSet = new Set(visibleKeys);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setVisibleKeys(newSet);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  const permissions = ['read', 'write', 'admin'];

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Chaves de API</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie suas chaves para integração com serviços externos
          </p>
        </div>
        <button
          onClick={() => { setShowNewForm(true); setCreatedKey(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <i className="fa-solid fa-plus"></i>
          Nova Chave
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Nova chave criada */}
      {createdKey && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
            <i className="fa-solid fa-circle-check text-green-600"></i>
            Chave criada com sucesso!
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Copie sua chave agora. Por segurança, ela não será mostrada novamente.
          </p>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded border border-green-300 dark:border-green-700">
            <code className="flex-1 text-sm font-mono break-all">{createdKey.key}</code>
            <button
              onClick={() => copyToClipboard(createdKey.key, createdKey.id)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Copiar"
            >
              {copiedId === createdKey.id ? <i className="fa-solid fa-check text-green-600"></i> : <i className="fa-solid fa-copy"></i>}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Formulário de nova chave */}
      {showNewForm && !createdKey && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-800 dark:text-white mb-3">Nova Chave de API</h3>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Chave</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Ex: Integração n8n, API Externa"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissões</label>
            <div className="flex gap-3">
              {permissions.map((perm) => (
                <label key={perm} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newKeyPermissions.includes(perm)}
                    onChange={() => {
                      setNewKeyPermissions((prev) =>
                        prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
                      );
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{perm}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newKeyName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Criar Chave
            </button>
            <button
              onClick={() => { setShowNewForm(false); setNewKeyName(''); }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de chaves */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <i className="fa-solid fa-spinner animate-spin text-2xl text-gray-400"></i>
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <i className="fa-solid fa-key text-4xl mb-2 block opacity-30"></i>
          <p className="mt-3 text-sm">Nenhuma chave de API criada</p>
          <p className="text-xs mt-1">Crie sua primeira chave para começar a integrar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={key.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800 dark:text-white">{key.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded">
                      {visibleKeys.has(key.id) ? key.key : maskKey(key.key)}
                    </code>
                    <button onClick={() => toggleVisibility(key.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title={visibleKeys.has(key.id) ? 'Ocultar' : 'Mostrar'}>
                      {visibleKeys.has(key.id) ? <i className="fa-solid fa-eye-slash text-xs"></i> : <i className="fa-solid fa-eye text-xs"></i>}
                    </button>
                    <button onClick={() => copyToClipboard(key.key, key.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Copiar">
                      {copiedId === key.id ? <i className="fa-solid fa-check text-green-500 text-xs"></i> : <i className="fa-solid fa-copy text-xs"></i>}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Criada: {new Date(key.created_at).toLocaleDateString('pt-PT')}</span>
                    {key.last_used_at && <span>Último uso: {new Date(key.last_used_at).toLocaleDateString('pt-PT')}</span>}
                    {key.expires_at && <span className="text-amber-600">Expira: {new Date(key.expires_at).toLocaleDateString('pt-PT')}</span>}
                  </div>
                  <div className="flex gap-1.5 mt-1.5">
                    {key.permissions?.map((perm) => (
                      <span key={perm} className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded capitalize">{perm}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(key)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${key.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'}`}
                  >
                    {key.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button onClick={() => handleDelete(key.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remover">
                    <i className="fa-solid fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button onClick={loadKeys} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <i className="fa-solid fa-rotate"></i>
          Atualizar
        </button>
      </div>
    </div>
  );
};
