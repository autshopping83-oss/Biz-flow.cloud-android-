/**
 * ApiKeyManager - Gerenciamento de Chaves de API
 * 
 * Permite que usuários criem, visualizem e gerenciem suas chaves de API
 * para integração com serviços externos.
 */

import React, { useState, useEffect } from 'react';
import { ApiKeyService, ApiKey } from '../services/apiKeyService';
import { IconKey, IconPlus, IconTrash, IconCopy, IconCheck, IconSpinner, IconEye, IconEyeOff, IconRefresh } from './Icons';

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
    } catch (err: any) {
      setError(err.message);
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
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta chave?')) return;
    try {
      await ApiKeyService.delete(id);
      await loadKeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (key: ApiKey) => {
    try {
      await ApiKeyService.toggleActive(key.id, !key.is_active);
      await loadKeys();
    } catch (err: any) {
      setError(err.message);
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
          <IconPlus size={16} />
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
            <IconCheck size={18} />
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
              {copiedId === createdKey.id ? <IconCheck size={16} className="text-green-600" /> : <IconCopy size={16} />}
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
