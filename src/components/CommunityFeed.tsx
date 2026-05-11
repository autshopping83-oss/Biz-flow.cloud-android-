
import React, { useState, useEffect } from 'react';
import { Comment, CompanySettings } from '../types';
import { getComments, saveComment, deleteComment } from '../services/storageService';
import { useToast } from './ToastContext';

interface Props {
  currentUser: CompanySettings;
  t: (key: any) => string;
}

export const CommunityFeed: React.FC<Props> = ({ currentUser, t }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newContent, setNewContent] = useState('');
  const { notify } = useToast();

  useEffect(() => {
    setComments(getComments());
  }, []);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newComment: Comment = {
      id: crypto.randomUUID(),
      userName: currentUser.name || 'Usuário Anônimo',
      userLogo: currentUser.logo,
      content: newContent,
      timestamp: Date.now(),
      location: currentUser.address ? currentUser.address.split(',')[0] : 'Desconhecido',
      likes: 0
    };

    const updated = saveComment(newComment);
    setComments(updated);
    setNewContent('');
  };

  const formatTime = (ts: number) => {
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return 'agora mesmo';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  const handleDeleteComment = (commentId: string, authorName: string) => {
    if (currentUser.name !== authorName) {
      notify('Só pode eliminar seus próprios comentários.', 'error');
      return;
    }
    
    if (confirm('Tem a certeza que deseja eliminar este comentário?')) {
      const updated = deleteComment(commentId);
      setComments(updated);
      notify('Comentário eliminado com sucesso!', 'success');
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20 animate-[fadeIn_0.3s_ease-out]">
      <div className="mb-8 text-center md:text-left">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Comunidade Biz-flow</h2>
        <p className="text-slate-500 dark:text-slate-400">Conecte-se com outros empreendedores e tire dúvidas.</p>
      </div>

      {/* WHATSAPP OFFICIAL BANNER */}
      <div className="bg-[#25D366]/10 dark:bg-[#25D366]/5 border border-[#25D366]/30 dark:border-[#25D366]/20 rounded-2xl p-6 mb-10 flex flex-col md:flex-row items-center gap-6 shadow-sm">
         <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center text-white text-3xl shadow-lg shadow-[#25D366]/30 flex-none animate-[pulse_3s_infinite]">
            <i className="fa-brands fa-whatsapp"></i>
         </div>
         <div className="flex-grow text-center md:text-left">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Grupo Oficial do WhatsApp</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm mt-1 mb-4 md:mb-0 max-w-md">
               {t('whatsappPromo')}
            </p>
         </div>
         <a 
            href="https://chat.whatsapp.com/HCqTa1jG2cU3sufJww1EPT?mode=wwt" 
            target="_blank"
            rel="noopener noreferrer" 
            className="bg-[#25D366] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#20bd5a] transition-all shadow-lg shadow-[#25D366]/20 hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap"
         >
            <i className="fa-brands fa-whatsapp text-lg"></i>
            {t('joinCommunity')}
         </a>
      </div>

      {/* Input Box */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Atividade Recente</h4>
        <div className="flex gap-3">
           <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex-none flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
              {currentUser.logo ? (
                <img src={currentUser.logo} alt="Me" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-blue-600 dark:text-blue-400">{currentUser.name?.substring(0,2).toUpperCase() || 'EU'}</span>
              )}
           </div>
           <form onSubmit={handlePost} className="flex-grow">
              <textarea 
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="O que você está pensando? Compartilhe uma dica ou dúvida..."
                className="w-full bg-slate-50 dark:bg-slate-800 dark:text-white border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none min-h-[80px]"
              />
              <div className="flex justify-end mt-2">
                <button type="submit" disabled={!newContent.trim()} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50">
                  Publicar
                </button>
              </div>
           </form>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4">
        {comments.map(comment => (
          <div key={comment.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
             <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex-none flex items-center justify-center overflow-hidden">
                   {comment.userLogo ? (
                     <img src={comment.userLogo} alt={comment.userName} className="w-full h-full object-cover" />
                   ) : (
                     <i className="fa-solid fa-user text-slate-400"></i>
                   )}
                </div>
                <div className="flex-grow">
                   <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{comment.userName}</h4>
                        <p className="text-xs text-slate-400">{comment.location} • {formatTime(comment.timestamp)}</p>
                      </div>
                   </div>
                   <p className="text-slate-700 dark:text-slate-300 mt-2 text-sm leading-relaxed">{comment.content}</p>
                   
                   <div className="flex items-center gap-4 mt-4 text-xs font-bold text-slate-400 dark:text-slate-500">
                      <button className="flex items-center gap-1.5 hover:text-red-500 transition">
                        <i className="fa-regular fa-heart"></i> {comment.likes}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-blue-600 transition">
                        <i className="fa-regular fa-comment"></i> Responder
                      </button>
                      {currentUser.name === comment.userName && (
                        <button 
                          onClick={() => handleDeleteComment(comment.id, comment.userName)}
                          className="flex items-center gap-1.5 hover:text-red-600 transition ml-auto text-red-500 hover:text-red-700"
                        >
                          <i className="fa-solid fa-trash-alt"></i> Eliminar
                        </button>
                      )}
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
