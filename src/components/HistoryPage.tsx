
import React, { useState, useMemo } from 'react';
import { ReceiptData } from '../types';
import { formatMoney } from '../services/translationService';

interface Props {
  history: ReceiptData[];
  onBack: () => void;
  onLoadDocument: (doc: ReceiptData) => void;
  onDeleteDocument: (id: string) => void;
  onDuplicateDocument: (doc: ReceiptData) => void;
  currency: string;
  lang: string;
}

export const HistoryPage: React.FC<Props> = ({ history, onBack, onLoadDocument, onDeleteDocument, onDuplicateDocument, currency, lang }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INVOICE' | 'RECEIPT' | 'QUOTE' | 'INVOICE_RECEIPT'>('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'total-desc' | 'total-asc'>('date-desc');

  const filteredHistory = useMemo(() => {
    let items = [...history];

    // Filter by type
    if (filterType !== 'ALL') {
      items = items.filter(doc => doc.type === filterType);
    }

    // Filter by search term (client name, number)
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      items = items.filter(doc =>
        doc.clientName?.toLowerCase().includes(lowercasedTerm) ||
        doc.number?.toLowerCase().includes(lowercasedTerm)
      );
    }

    // Sort
    items.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'total-desc':
          return b.total - a.total;
        case 'total-asc':
          return a.total - b.total;
        case 'date-desc':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return items;
  }, [history, searchTerm, filterType, sortBy]);

  const DocumentRow = ({ doc, index }: { doc: ReceiptData, index: number }) => (
    <div
      className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800"
      style={{ animation: 'fadeInUp 0.3s ease-out both', animationDelay: `${index * 0.03}s` }}
    >
      <div className="flex items-center gap-4 flex-1 overflow-hidden">
        <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black shadow-inner ${doc.type === 'INVOICE' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50' : doc.type === 'INVOICE_RECEIPT' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50' : doc.type === 'QUOTE' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/50' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/50'}`}>
            {doc.type === 'INVOICE' ? 'FAT' : doc.type === 'INVOICE_RECEIPT' ? 'FAT-REC' : doc.type === 'QUOTE' ? 'COT' : 'REC'}
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-slate-900 dark:text-white truncate">{doc.clientName || 'Sem Cliente'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{doc.number} &bull; {doc.date}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <p className="font-extrabold text-slate-800 dark:text-slate-100 text-lg tabular-nums flex-1 sm:flex-none">
          {formatMoney(doc.total, doc.currency, lang)}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => onDuplicateDocument(doc)} title="Duplicar" className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600 transition-colors">
            <i className="fa-solid fa-copy"></i>
          </button>
          <button onClick={() => onLoadDocument(doc)} title="Editar" className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-green-600 transition-colors">
            <i className="fa-solid fa-pencil"></i>
          </button>
          <button onClick={() => onDeleteDocument(doc.id)} title="Excluir" className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-red-600 transition-colors">
            <i className="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold text-sm transition-colors">
            <i className="fa-solid fa-arrow-left"></i>
            Voltar
          </button>
          <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Histórico de Documentos</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
          <div className="relative md:col-span-2">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Pesquisar por cliente ou nº do documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-transparent rounded-lg pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-transparent rounded-lg px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="ALL">Todos Tipos</option>
              <option value="INVOICE">Faturas</option>
              <option value="INVOICE_RECEIPT">Factura-Recibo</option>
              <option value="RECEIPT">Recibos</option>
              <option value="QUOTE">Cotações</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-transparent rounded-lg px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="date-desc">Mais Recentes</option>
              <option value="date-asc">Mais Antigos</option>
              <option value="total-desc">Maior Valor</option>
              <option value="total-asc">Menor Valor</option>
            </select>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-4">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((doc, i) => <DocumentRow key={doc.id} doc={doc} index={i} />)
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <i className="fa-solid fa-file-circle-xmark text-5xl text-slate-300 dark:text-slate-600 mb-4"></i>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Nenhum Documento Encontrado</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tente ajustar os seus filtros de pesquisa.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
