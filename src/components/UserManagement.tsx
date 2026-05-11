import React, { useState, useEffect } from 'react';
import { orgService, OrgMember } from '../services/orgService';
import { useToast } from './ToastContext';
import { supabase } from '../services/supabaseClient';

interface Props {
  userId: string;
  orgId: string;
  isAdmin: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

export const UserManagement: React.FC<Props> = ({
  userId,
  orgId,
  isAdmin,
  onClose,
  currentUserEmail
}) => {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);
  const { notify } = useToast();
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    loadMembers();
    loadOrgDetails();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    const data = await orgService.listMembers(orgId);
    setMembers(data);
    setLoading(false);
  };

  const loadOrgDetails = async () => {
    const org = await orgService.getUserOrganization(userId);
    if (org) {
      setOrgName(org.name);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) {
      notify('Preencha todos os campos.', 'error');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      notify('Email inválido.', 'error');
      return;
    }

    setInviting(true);
    const result = await orgService.inviteMember(orgId, inviteEmail, inviteName, userId);
    setInviting(false);

    if (result.success) {
      notify(result.message, 'success');
      setInviteEmail('');
      setInviteName('');
      setShowInviteForm(false);
      loadMembers();
    } else {
      notify(result.message, 'error');
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Tem a certeza que deseja remover ${memberEmail} da organização?`)) {
      return;
    }

    const success = await orgService.removeMember(orgId, memberId);
    if (success) {
      notify(`Membro ${memberEmail} removido com sucesso.`, 'success');
      loadMembers();
    } else {
      notify('Erro ao remover membro.', 'error');
    }
  };

  const handleToggleRole = async (memberId: string, currentRole: string, memberEmail: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const confirmMsg = currentRole === 'admin'
      ? `Remover privilégios de admin de ${memberEmail}?`
      : `Tornar ${memberEmail} administrador?`;

    if (!confirm(confirmMsg)) return;

    const success = await orgService.changeMemberRole(orgId, memberId, newRole as 'admin' | 'member');
    if (success) {
      notify(`Papel atualizado para ${newRole === 'admin' ? 'Administrador' : 'Membro'}.`, 'success');
      loadMembers();
    } else {
      notify('Erro ao alterar papel.', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full">Ativo</span>;
      case 'invited':
        return <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">Convidado</span>;
      case 'disabled':
        return <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">Desativado</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">{status}</span>;
    }
  };

  const getInitials = (name: string, email: string) => {
    if (name) return name.charAt(0).toUpperCase();
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-slideUp">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <i className="fa-solid fa-users text-xl"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Equipa</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{orgName || 'Organização'}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          >
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Admin Controls */}
          {isAdmin && (
            <div className="mb-6">
              {!showInviteForm ? (
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 px-6 rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3"
                >
                  <i className="fa-solid fa-user-plus"></i>
                  Convidar Novo Membro
                </button>
              ) : (
                <form onSubmit={handleInvite} className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900 dark:text-white">Convidar Membro</h3>
                    <button
                      type="button"
                      onClick={() => setShowInviteForm(false)}
                      className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      Cancelar
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Nome</label>
                    <input
                      type="text"
                      required
                      placeholder="Nome do membro"
                      className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                      value={inviteName}
                      onChange={e => setInviteName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="email@exemplo.com"
                      className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={inviting}
                    className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {inviting ? (
                      <><i className="fa-solid fa-circle-notch animate-spin"></i> A convidar...</>
                    ) : (
                      <><i className="fa-solid fa-paper-plane"></i> Convidar</>
                    )}
                  </button>
                  
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                    Se o email já tiver uma conta, será adicionado automaticamente.
                    Caso contrário, precisará criar uma conta com este email.
                  </p>
                </form>
              )}
            </div>
          )}

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">
                Membros ({members.length})
              </h3>
              <button
                onClick={loadMembers}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
              >
                <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`}></i>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-10">
                <i className="fa-solid fa-circle-notch animate-spin text-3xl text-slate-300 dark:text-slate-600"></i>
                <p className="text-slate-400 mt-3 text-sm">A carregar membros...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <i className="fa-solid fa-user-plus text-4xl text-slate-300 dark:text-slate-600 mb-3"></i>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum membro encontrado</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                  {isAdmin ? 'Convide membros para a sua equipa.' : 'Aguarde o convite do administrador.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => {
                  const isCurrentUser = member.id === userId;
                  const isOwner = member.role === 'admin' && member.status === 'active';
                  
                  return (
                    <div
                      key={member.id}
                      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 transition-all hover:shadow-md ${
                        isCurrentUser ? 'ring-2 ring-blue-500/30 border-blue-200 dark:border-blue-800' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Avatar */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                            member.role === 'admin'
                              ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          }`}>
                            <i className={`fa-solid ${member.role === 'admin' ? 'fa-crown' : 'fa-user'}`}></i>
                          </div>
                          
                          {/* Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {member.name || member.email}
                              </p>
                              {isCurrentUser && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full">
                                  EU
                                </span>
                              )}
                              {member.role === 'admin' && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                              {member.email}
                            </p>
                            <div className="mt-1">
                              {getStatusBadge(member.status)}
                            </div>
                          </div>
                        </div>

                        {/* Admin Actions */}
                        {isAdmin && !isCurrentUser && (
                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            <button
                              onClick={() => handleToggleRole(member.id, member.role, member.email)}
                              className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center justify-center transition-colors"
                              title={member.role === 'admin' ? 'Remover admin' : 'Tornar admin'}
                            >
                              <i className={`fa-solid ${member.role === 'admin' ? 'fa-user' : 'fa-crown'}`}></i>
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id, member.email)}
                              className="w-9 h-9 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"
                              title="Remover membro"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Additional info for invited members */}
                      {member.status === 'invited' && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                            <i className="fa-solid fa-clock"></i>
                            Pendente - O utilizador precisa criar uma conta com este email
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-emerald-500"></i>
              {isAdmin ? 'Administrador' : 'Membro da equipa'}
            </span>
            <span>
              {members.filter(m => m.status === 'active').length} membro(s) ativo(s)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
