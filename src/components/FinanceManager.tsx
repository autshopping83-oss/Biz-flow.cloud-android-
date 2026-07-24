import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType } from '../types';
import { formatMoney } from '../services/translationService';
import { useToast } from './ToastContext';
import { getTransactions, addTransaction, deleteTransaction } from '../services/storageService';

interface Props {
  currency: string;
  t: (key: string) => string;
  userId: string;
  lang: string;
  refreshKey?: number;
}

type TimeRange = 'WEEK' | 'MONTH' | 'YEAR';

// Pie Chart Slice coordinate helper
const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
};

const DonutChart: React.FC<{ income: number; expense: number; currency: string; lang: string }> = ({ income, expense, currency, lang }) => {
  const total = income + expense;
  if (total <= 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm p-10">
        <i className="fa-solid fa-chart-pie mr-2"></i>
        Sem dados financeiros.
      </div>
    );
  }

  const incomePct = income / total;
  const expensePct = expense / total;

  // Gerar path para o donut
  const getArcPath = (startPct: number, endPct: number, radius: number) => {
    const startAngle = startPct * 2 * Math.PI - Math.PI / 2;
    const endAngle = endPct * 2 * Math.PI - Math.PI / 2;
    const x1 = radius * Math.cos(startAngle);
    const y1 = radius * Math.sin(startAngle);
    const x2 = radius * Math.cos(endAngle);
    const y2 = radius * Math.sin(endAngle);
    const largeArc = endPct - startPct > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L 0 0 Z`;
  };

  const innerRadius = 52;  // Para efeito donut (buraco)
  const outerRadius = 80;

  // Fatias: income (verde) de 0 a incomePct, expense (vermelho) de incomePct a 1
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-44 h-44">
        <svg viewBox="-90 -90 180 180" className="w-full h-full transform -rotate-90">
          {/* Fundo cinza */}
          <circle cx="0" cy="0" r={outerRadius} fill="none" stroke="#e2e8f0" strokeWidth={outerRadius - innerRadius} className="dark:stroke-slate-700" />
          {/* Income (verde) */}
          {incomePct > 0 && (
            <circle cx="0" cy="0" r={(outerRadius + innerRadius) / 2}
              fill="none" stroke="#22c55e" strokeWidth={outerRadius - innerRadius}
              strokeDasharray={`${incomePct * 100} ${(1 - incomePct) * 100}`}
              strokeLinecap="round"
              className="animate-[dash_1s_ease-out]"
              style={{ strokeDashoffset: 0 }} />
          )}
          {/* Expense (vermelho) — começa onde income termina */}
          {expensePct > 0 && (
            <circle cx="0" cy="0" r={(outerRadius + innerRadius) / 2}
              fill="none" stroke="#f43f5e" strokeWidth={outerRadius - innerRadius}
              strokeDasharray={`${expensePct * 100} ${(1 - expensePct) * 100}`}
              strokeDashoffset={-incomePct * 100}
              strokeLinecap="round"
              className="animate-[dash_1s_ease-out_0.3s]"
              style={{ strokeDashoffset: -incomePct * 100 }} />
          )}
        </svg>
        {/* Valor central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-400">Total</span>
          <span className="text-lg font-black text-slate-900 dark:text-white">{formatMoney(total, currency, lang)}</span>
        </div>
      </div>
      {/* Legenda */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-slate-600 dark:text-slate-300">Entradas</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">{(incomePct * 100).toFixed(0)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-500"></div>
          <span className="text-slate-600 dark:text-slate-300">Saídas</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">{(expensePct * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};

// Pie Chart original (despesas por categoria)
const PieChart: React.FC<{ data: { labels: string[], data: number[], total: number }, currency: string, lang: string }> = ({ data, currency, lang }) => {
    if (!data || data.data.length === 0 || data.total <= 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm p-10">
                <i className="fa-solid fa-chart-pie mr-2"></i>
                Sem dados de despesas para analisar.
            </div>
        );
    }

    const colors = ['#f43f5e', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'];
    let cumulativePercent = 0;
    
    const slices = data.data.map((value, index) => {
        const percent = value / data.total;
        if (percent === 0) return null;

        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += percent;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        
        const largeArcFlag = percent > 0.5 ? 1 : 0;
        
        const pathData = [
            `M ${startX} ${startY}`,
            `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `L 0 0`,
        ].join(' ');

        return <path key={index} d={pathData} fill={colors[index % colors.length]} />;
    }).filter(Boolean);

    const legend = data.labels.map((label, index) => {
        if(data.data[index] === 0) return null;
        const percentage = ((data.data[index] ?? 0) / data.total) * 100;
        return (
            <div key={label} className="flex items-center justify-between gap-4 text-xs w-full">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[index % colors.length] }}></div>
                    <span className="text-slate-600 dark:text-slate-300 capitalize truncate">{label}</span>
                </div>
                <div className="flex items-baseline gap-2 flex-shrink-0">
                  <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px]">{formatMoney(data.data[index] ?? 0, currency, lang)}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 w-10 text-right">{percentage.toFixed(0)}%</span>
                </div>
            </div>
        )
    }).filter(Boolean);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="w-40 h-40 mx-auto transition-transform hover:scale-105">
                 <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
                    {slices}
                </svg>
            </div>
            <div className="flex flex-col gap-3 w-full">
                {legend}
            </div>
        </div>
    );
};


export const FinanceManager: React.FC<Props> = ({ currency, t, userId, lang, refreshKey }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('WEEK');
  const [hoveredData, setHoveredData] = useState<any | null>(null);
  const { notify } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [newTrans, setNewTrans] = useState({
    type: 'INCOME' as TransactionType,
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0] ?? ''
  });

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId, refreshKey]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const data = await getTransactions(userId);
      setTransactions(data);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      notify('Erro ao carregar finanças', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTrans.amount || !newTrans.description) return;

    try {
      const t: Transaction = {
        id: crypto.randomUUID(),
        type: newTrans.type,
        amount: parseFloat(newTrans.amount),
        description: newTrans.description,
        category: newTrans.category || 'Geral',
        date: newTrans.date ?? new Date().toISOString().split('T')[0] ?? '',
        timestamp: Date.now()
      };

      const updated = await addTransaction(t, userId);
      setTransactions(updated);

      notify('Transação adicionada com sucesso!', 'success');
      setNewTrans({ ...newTrans, amount: '', description: '', category: '' });
      setShowForm(false);
    } catch (error: any) {
      notify('Erro ao salvar transação: ' + error.message, 'error');
    }
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setShowForm(true);
    notify("Funcionalidade de IA não disponível. Preencha manualmente.", "info");
    setIsScanning(false);
  };

  const handleDelete = async (id: string) => {
    if(confirm('Remover esta transação?')) {
      try {
        const updated = await deleteTransaction(id, userId);
        setTransactions(updated);
        notify('Transação removida.', 'info');
      } catch (error: any) {
        notify('Erro ao remover: ' + error.message, 'error');
      }
    }
  };

  const processedData = useMemo(() => {
    const today = new Date();
    let groupingMap = new Map<string, { income: number, expense: number, label: string, dateFull: string }>();

    if (timeRange === 'WEEK') {
       for (let i = 6; i >= 0; i--) {
         const d = new Date();
         d.setDate(today.getDate() - i);
          const key = d.toISOString().split('T')[0] ?? '';
          const label = `${d.getDate()}/${d.getMonth()+1}`;
         groupingMap.set(key, { income: 0, expense: 0, label, dateFull: key });
       }
    } else if (timeRange === 'MONTH') {
       const year = today.getFullYear();
       const month = today.getMonth();
       const daysInMonth = new Date(year, month + 1, 0).getDate();
       for (let i = 1; i <= daysInMonth; i++) {
         const key = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
         const label = String(i);
         groupingMap.set(key, { income: 0, expense: 0, label, dateFull: key });
       }
    } else if (timeRange === 'YEAR') {
       const year = today.getFullYear();
       const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
       for (let i = 0; i < 12; i++) {
         const key = `${year}-${String(i+1).padStart(2,'0')}`;
          groupingMap.set(key, { income: 0, expense: 0, label: monthNames[i] ?? '', dateFull: key });
       }
    }

    transactions.forEach(tr => {
       const trDate = new Date(tr.date);
       let key = '';
       if (timeRange === 'YEAR') {
         if (trDate.getFullYear() === today.getFullYear()) {
            key = `${trDate.getFullYear()}-${String(trDate.getMonth()+1).padStart(2,'0')}`;
         }
       } else {
         key = tr.date; 
       }
       if (groupingMap.has(key)) {
         const entry = groupingMap.get(key)!;
         if (tr.type === 'INCOME') entry.income += tr.amount;
         else entry.expense += tr.amount;
       }
    });

    const data = Array.from(groupingMap.values());
    const maxIncome = Math.max(...data.map(d => d.income), 1);
    const maxExpense = Math.max(...data.map(d => d.expense), 1);
    return { data, maxIncome, maxExpense, maxValue: Math.max(maxIncome, maxExpense) };
  }, [transactions, timeRange]);
  
  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    transactions
        .filter(t => t.type === 'EXPENSE' && t.amount > 0)
        .forEach(t => {
            const category = t.category || 'Outros';
            const currentTotal = categoryMap.get(category) || 0;
            categoryMap.set(category, currentTotal + t.amount);
        });

    const sortedCategories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1]); // Sort descending

    const labels = sortedCategories.map(item => item[0]);
    const data = sortedCategories.map(item => item[1]);
    const total = data.reduce((a, b) => a + b, 0);

    return { labels, data, total };
  }, [transactions]);


  const totalIncome = transactions.reduce((sum, t) => t.type === 'INCOME' ? sum + t.amount : sum, 0);
  const totalExpense = transactions.reduce((sum, t) => t.type === 'EXPENSE' ? sum + t.amount : sum, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="animate-[fadeIn_0.3s_ease-out] max-w-5xl mx-auto pb-20">
      <style>{`
        @keyframes growUp { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes dash { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('finance')}</h2>
          <p className="text-slate-500 dark:text-slate-400">Gestão inteligente de fluxo de caixa</p>
        </div>
        <div className="flex gap-2">
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleScanReceipt} />
            <button 
                onClick={() => fileInputRef.current?.click()} 
                className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition shadow-lg flex items-center gap-2"
            >
                <i className="fa-solid fa-camera"></i> Scan Recibo
            </button>
            <button 
                onClick={() => setShowForm(!showForm)} 
                className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
            >
                <i className="fa-solid fa-plus"></i> {t('newTransaction')}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group transition-all hover:shadow-md">
           <div className="absolute right-0 top-0 p-3 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity"><i className="fa-solid fa-wallet text-5xl text-blue-600"></i></div>
           <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">{t('balance')}</p>
           {isLoading ? (
             <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-2"></div>
           ) : (
             <p className={`text-xl font-black mt-1 ${balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>{formatMoney(balance, currency, lang)}</p>
           )}
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group transition-all hover:shadow-md">
           <div className="absolute right-0 top-0 p-3 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity"><i className="fa-solid fa-arrow-trend-up text-5xl text-emerald-500"></i></div>
           <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">{t('income')}</p>
           {isLoading ? (
             <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-2"></div>
           ) : (
             <p className="text-xl font-black mt-1 text-emerald-600">{formatMoney(totalIncome, currency, lang)}</p>
           )}
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group transition-all hover:shadow-md">
           <div className="absolute right-0 top-0 p-3 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity"><i className="fa-solid fa-arrow-trend-down text-5xl text-rose-500"></i></div>
           <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">{t('expense')}</p>
           {isLoading ? (
             <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-2"></div>
           ) : (
             <p className="text-xl font-black mt-1 text-rose-500">{formatMoney(totalExpense, currency, lang)}</p>
           )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800 mb-8 animate-[slideDown_0.2s] relative overflow-hidden">
          {isScanning && (
            <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center animate-pulse">
                <i className="fa-solid fa-wand-magic-sparkles text-blue-600 text-3xl mb-2 animate-bounce"></i>
                <p className="font-black text-blue-700 uppercase tracking-widest text-xs">A analisar recibo com IA...</p>
            </div>
          )}
          <h3 className="font-bold text-slate-900 dark:text-white mb-4">{t('newTransaction')}</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button type="button" onClick={() => setNewTrans({...newTrans, type: 'INCOME'})} className={`flex-1 py-2 rounded font-bold text-sm transition-all ${newTrans.type === 'INCOME' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Entrada</button>
                <button type="button" onClick={() => setNewTrans({...newTrans, type: 'EXPENSE'})} className={`flex-1 py-2 rounded font-bold text-sm transition-all ${newTrans.type === 'EXPENSE' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-sm' : 'text-slate-400'}`}>Saída</button>
             </div>
             <input required type="date" value={newTrans.date} onChange={e => setNewTrans({...newTrans, date: e.target.value})} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white" />
             <input required type="text" placeholder={t('description')} value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white" />
             <input required type="number" step="any" placeholder="Valor" value={newTrans.amount} onChange={e => setNewTrans({...newTrans, amount: e.target.value})} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 dark:text-white" />
             <input type="text" placeholder="Categoria (ex: Marketing, Salários, Renda)" value={newTrans.category} onChange={e => setNewTrans({...newTrans, category: e.target.value})} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 md:col-span-2 dark:text-white" />
             <button className="md:col-span-2 bg-slate-900 dark:bg-blue-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition">{t('save')}</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Análise de Período</h3>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                  <button onClick={() => setTimeRange('WEEK')} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${timeRange === 'WEEK' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-500'}`}>Semana</button>
                  <button onClick={() => setTimeRange('MONTH')} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${timeRange === 'MONTH' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-500'}`}>Mês</button>
                  <button onClick={() => setTimeRange('YEAR')} className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${timeRange === 'YEAR' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-500'}`}>Ano</button>
              </div>
          </div>

          <div className="w-full overflow-x-auto">
              <div className="min-w-[320px] h-[200px] relative">
                  <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                      {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                          <line key={tick} x1="0" y1={tick * 45 + 5} x2="100" y2={tick * 45 + 5} stroke="#e2e8f0" strokeDasharray="2 3" strokeWidth="0.5" className="dark:stroke-slate-800" />
                      ))}
                      {processedData.data.map((d, i) => {
                          const barSpace = 100 / processedData.data.length;
                          const barCenter = barSpace * i + barSpace / 2;
                          const barW = Math.min(barSpace * 0.28, 3);
                          const gap = Math.min(barSpace * 0.08, 0.5);
                          const maxH = 42;
                          const incH = (d.income / processedData.maxValue) * maxH;
                          const expH = (d.expense / processedData.maxValue) * maxH;
                          return (
                              <g key={i} onMouseEnter={() => setHoveredData(d)} onMouseLeave={() => setHoveredData(null)} className="cursor-pointer">
                                  <rect x={barCenter - barW - gap} y={50 - 5 - incH} width={barW} height={Math.max(incH, 0.5)} fill="#22c55e" rx="1" className="transition-all duration-300 hover:opacity-80" style={{ animation: `growUp 0.6s ease-out forwards`, transformOrigin: 'bottom' }} />
                                  <rect x={barCenter + gap} y={50 - 5 - expH} width={barW} height={Math.max(expH, 0.5)} fill="#f43f5e" rx="1" className="transition-all duration-300 hover:opacity-80" style={{ animation: `growUp 0.6s ease-out ${i * 0.05}s forwards`, transformOrigin: 'bottom' }} />
                              </g>
                          )
                      })}
                  </svg>
                  {hoveredData && (
                      <div className="absolute top-0 right-0 bg-slate-900/90 text-white p-2 rounded-lg shadow-lg pointer-events-none backdrop-blur-sm z-10 text-xs">
                          <p className="font-bold mb-1 text-slate-300 border-b border-slate-700 pb-1">{hoveredData.label}</p>
                          <div className="flex justify-between gap-3 text-emerald-400"><span>Entrada:</span><span>{formatMoney(hoveredData.income, currency, lang)}</span></div>
                          <div className="flex justify-between gap-3 text-rose-400"><span>Saída:</span><span>{formatMoney(hoveredData.expense, currency, lang)}</span></div>
                      </div>
                  )}
              </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">Entradas vs Saídas</h3>
            <DonutChart income={totalIncome} expense={totalExpense} currency={currency} lang={lang} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-6">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">Despesas por Categoria</h3>
        <PieChart data={expenseByCategory} currency={currency} lang={lang} />
      </div>


      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-400 font-bold">
            <tr>
              <th className="p-4 hidden sm:table-cell">{t('date')}</th>
              <th className="p-4">{t('description')}</th>
              <th className="p-4 text-right">{t('total')}</th>
              <th className="p-4 text-center"></th>
            </tr>
          </thead>
          <tbody className="text-sm dark:text-slate-300">
            {transactions.slice(0, 15).map((t) => (
              <tr key={t.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <td className="p-4 hidden sm:table-cell whitespace-nowrap text-slate-500">{t.date}</td>
                <td className="p-4">
                    <div className="font-medium text-slate-800 dark:text-white">{t.description}</div>
                    <div className="sm:hidden text-xs text-slate-400">{t.date} • {t.category}</div>
                </td>
                <td className={`p-4 text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {t.type === 'INCOME' ? '+' : '-'} {formatMoney(t.amount, currency, lang)}
                </td>
                <td className="p-4 text-center">
                   <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-rose-500 transition p-2"><i className="fa-solid fa-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
