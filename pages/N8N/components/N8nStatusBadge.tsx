/**
 * Componente de badge de status para integrações N8N
 */

import React from 'react';
import { N8nIntegrationStatus } from '../types/n8n';

interface N8nStatusBadgeProps {
  status: N8nIntegrationStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<N8nIntegrationStatus, { color: string; bg: string; label: string; dot: string }> = {
  connected: {
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    label: 'Conectado',
    dot: 'bg-emerald-500',
  },
  disconnected: {
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800',
    label: 'Desconectado',
    dot: 'bg-slate-400',
  },
  error: {
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-900/20',
    label: 'Erro',
    dot: 'bg-red-500',
  },
  testing: {
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    label: 'Testando...',
    dot: 'bg-amber-500 animate-pulse',
  },
};

export const N8nStatusBadge: React.FC<N8nStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const config = statusConfig[status] || statusConfig.disconnected;
  const isSmall = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold ${
        isSmall ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'
      } rounded-full ${config.bg} ${config.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
