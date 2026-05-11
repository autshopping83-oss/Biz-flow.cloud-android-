
import React, { useState } from 'react';
import { CURRENCIES, LANGUAGES } from '../services/translationService';
import { Logo } from './Logo';
import { useToast } from './ToastContext';
import { supabase } from '../services/supabaseClient'; // Import supabase client

interface AuthProps {
  onLogin: (email: string, pass: string) => void;
  onRegister: (email: string, pass: string, data: any) => void;
  onGoogleLogin: () => void;
  view: 'login' | 'register' | 'forgotPassword' | 'updatePassword';
  setView: (view: 'login' | 'register' | 'forgotPassword' | 'updatePassword') => void;
  isLoading?: boolean;
  onInstall?: () => void;
  showInstallButton?: boolean;
}

// --- Shared Layout (Moved Outside) ---
const AuthLayout = ({ children, title, subtitle }: any) => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
    <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 w-full max-w-md border border-slate-100 dark:border-slate-800 transition-all duration-300 animate-scaleIn">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
            <Logo className="w-16 h-16 shadow-lg shadow-blue-500/20 rounded-2xl" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">{subtitle}</p>
      </div>
      {children}
    </div>
    <div className="absolute bottom-4 text-center w-full text-slate-400 dark:text-slate-600 text-xs">
      &copy; {new Date().getFullYear()} Biz-flow. Global Invoicing.
    </div>
  </div>
);

export const AuthScreens: React.FC<AuthProps> = ({ onLogin, onRegister, onGoogleLogin, view, setView, isLoading = false, onInstall, showInstallButton }) => {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    address: '',
    currency: 'MZN',
    language: 'pt',
    logo: ''
  });
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [updatePasswordData, setUpdatePasswordData] = useState({ password: '', confirmPassword: '' });


  // Use Toast Hook
  const { notify } = useToast();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegisterData(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister(registerData.email, registerData.password, registerData);
  };

  const handleSubmitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(loginData.email, loginData.password);
  }
  
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
        notify("Por favor, insira o seu e-mail.", 'error');
        return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: window.location.origin + '?view=updatePassword' // Redirect to update password page
    });
    if (error) {
        notify("Erro ao enviar o e-mail de recuperação: " + error.message, 'error');
    } else {
        notify("E-mail de recuperação enviado com sucesso!", 'success');
        setView('login');
    }
}

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updatePasswordData.password !== updatePasswordData.confirmPassword) {
        notify("As senhas não coincidem.", 'error');
        return;
    }

    const { error } = await supabase.auth.updateUser({ password: updatePasswordData.password });

    if (error) {
        notify("Erro ao atualizar a senha: " + error.message, 'error');
    } else {
        notify("Senha atualizada com sucesso!", 'success');
        setView('login');
    }
  }


  // --- GOOGLE BUTTON COMPONENT ---
  const GoogleButton = () => (
    <div className="mt-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-slate-900 text-slate-500">Ou continue com</span>
        </div>
      </div>
      <button 
        type="button"
        onClick={onGoogleLogin}
        className="w-full bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3"
      >
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
        Google
      </button>
    </div>
  );

  // --- VIEWS ---

  if (view === 'login') {
    return (
      <AuthLayout title="Bem-vindo ao Biz-flow" subtitle="Acesse sua conta">
        <form onSubmit={handleSubmitLogin} className="space-y-5">
          <div>
             <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Email</label>
             <div className="relative">
                 <i className="fa-solid fa-envelope absolute left-3 top-3.5 text-slate-400"></i>
                 <input 
                    type="email" required 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-slate-400" 
                    placeholder="nome@exemplo.com" 
                    value={loginData.email}
                    onChange={e => setLoginData({...loginData, email: e.target.value})}
                 />
             </div>
          </div>
          <div>
             <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Palavra-passe</label>
                <button type="button" onClick={() => setView('forgotPassword')} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">Esqueceu?</button>
             </div>
             <div className="relative">
                 <i className="fa-solid fa-lock absolute left-3 top-3.5 text-slate-400"></i>
                 <input 
                    type="password" required 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-slate-400" 
                    placeholder="••••••••" 
                    value={loginData.password}
                    onChange={e => setLoginData({...loginData, password: e.target.value})}
                 />
             </div>
          </div>
          <button disabled={isLoading} className="w-full bg-slate-900 dark:bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {isLoading && <i className="fa-solid fa-circle-notch animate-spin"></i>}
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-4 space-y-3">
             {/* Install Button if available */}
            {showInstallButton && onInstall && (
                <button
                    type="button"
                    onClick={onInstall}
                    className="w-full bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold py-3 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2"
                >
                    <i className="fa-solid fa-download"></i> Instalar App
                </button>
            )}

            <a
                href="/?guest=true"
                className="w-full bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold py-3 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-all flex items-center justify-center gap-2"
            >
                <i className="fa-solid fa-bolt"></i> Biz-flow (Modo Simples)
            </a>
        </div>

        <GoogleButton />

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
           <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-3">Não tem uma conta Biz-flow?</p>
           <button 
             onClick={() => setView('register')} 
             className="w-full bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-2 border-blue-100 dark:border-slate-700 font-bold py-3 rounded-xl hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center justify-center gap-2 group"
           >
             Criar conta grátis
             <i className="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
           </button>
        </div>
      </AuthLayout>
    );
  }

  if (view === 'forgotPassword') {
    return (
      <AuthLayout title="Recuperar Acesso" subtitle="Enviaremos um link para seu email">
        <form onSubmit={handleForgotSubmit} className="space-y-5">
          <div>
             <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Email</label>
             <div className="relative">
                <i className="fa-solid fa-envelope absolute left-3 top-3.5 text-slate-400"></i>
                <input type="email" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white" 
                placeholder="nome@exemplo.com"
                value={forgotPasswordEmail}
                onChange={e => setForgotPasswordEmail(e.target.value)}
                 />
             </div>
          </div>
          <button className="w-full bg-slate-900 dark:bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-lg shadow-slate-900/20">
            Enviar Link
          </button>
        </form>
        <div className="mt-6 text-center">
           <button onClick={() => setView('login')} className="text-slate-500 dark:text-slate-400 text-sm hover:text-slate-900 dark:hover:text-white font-medium flex items-center justify-center gap-2">
             <i className="fa-solid fa-arrow-left"></i> Voltar ao Login
           </button>
        </div>
      </AuthLayout>
    );
  }

  if (view === 'updatePassword') {
    return (
        <AuthLayout title="Atualizar Senha" subtitle="Crie uma nova senha para sua conta">
            <form onSubmit={handleUpdatePasswordSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Nova Senha</label>
                    <div className="relative">
                        <i className="fa-solid fa-lock absolute left-3 top-3.5 text-slate-400"></i>
                        <input
                            type="password"
                            required
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-slate-400"
                            placeholder="••••••••"
                            value={updatePasswordData.password}
                            onChange={e => setUpdatePasswordData({ ...updatePasswordData, password: e.target.value })}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Confirmar Nova Senha</label>
                    <div className="relative">
                        <i className="fa-solid fa-lock absolute left-3 top-3.5 text-slate-400"></i>
                        <input
                            type="password"
                            required
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white transition-all placeholder:text-slate-400"
                            placeholder="••••••••"
                            value={updatePasswordData.confirmPassword}
                            onChange={e => setUpdatePasswordData({ ...updatePasswordData, confirmPassword: e.target.value })}
                        />
                    </div>
                </div>
                <button className="w-full bg-slate-900 dark:bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-lg shadow-slate-900/20">
                    Atualizar Senha
                </button>
            </form>
        </AuthLayout>
    );
}


  // Register View
  return (
    <AuthLayout title="Criar Conta" subtitle="Configure seu perfil profissional">
        <form onSubmit={handleSubmitRegister} className="space-y-4">
          {/* Logo Upload Minimalist */}
          <div className="flex justify-center mb-6">
              <div className="relative group cursor-pointer">
                  <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden hover:border-blue-500 transition-colors shadow-inner">
                      {registerData.logo ? (
                          <img src={registerData.logo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                          <i className="fa-solid fa-camera text-slate-300 dark:text-slate-500 text-xl group-hover:text-blue-500 transition-colors"></i>
                      )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {!registerData.logo && <span className="absolute -bottom-6 text-[10px] text-slate-400 uppercase font-bold">Add Logo</span>}
              </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="relative">
                <i className="fa-solid fa-user absolute left-3 top-3.5 text-slate-400 text-xs"></i>
                <input required placeholder="Seu Nome" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white" 
                    value={registerData.name} onChange={e => setRegisterData({...registerData, name: e.target.value})}
                />
             </div>
             <div className="relative">
                <i className="fa-solid fa-building absolute left-3 top-3.5 text-slate-400 text-xs"></i>
                <input required placeholder="Empresa" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white" 
                    value={registerData.companyName} onChange={e => setRegisterData({...registerData, companyName: e.target.value})}
                />
             </div>
          </div>

          <div className="relative">
             <i className="fa-solid fa-envelope absolute left-3 top-3.5 text-slate-400 text-xs"></i>
             <input required type="email" placeholder="Email" 
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white" 
                value={registerData.email} onChange={e => setRegisterData({...registerData, email: e.target.value})}
             />
          </div>
          
          <div className="relative">
             <i className="fa-solid fa-lock absolute left-3 top-3.5 text-slate-400 text-xs"></i>
             <input required type="password" placeholder="Senha" 
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white" 
                value={registerData.password} onChange={e => setRegisterData({...registerData, password: e.target.value})}
             />
          </div>

          <div className="relative">
             <i className="fa-solid fa-location-dot absolute left-3 top-3.5 text-slate-400 text-xs"></i>
             <input placeholder="Morada da Empresa"
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-white"
                value={registerData.address}
                onChange={e => setRegisterData({...registerData, address: e.target.value})}
             />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
             <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Moeda</label>
                <div className="relative">
                    <select value={registerData.currency} onChange={e => setRegisterData({...registerData, currency: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-2 py-2.5 text-sm mt-1 dark:text-white appearance-none"
                    >
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.code})</option>)}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-3 top-4 text-slate-400 text-xs pointer-events-none"></i>
                </div>
             </div>
             <div>
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Idioma</label>
                <div className="relative">
                    <select value={registerData.language} onChange={e => setRegisterData({...registerData, language: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-2 py-2.5 text-sm mt-1 dark:text-white appearance-none"
                    >
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-3 top-4 text-slate-400 text-xs pointer-events-none"></i>
                </div>
             </div>
          </div>

          <button disabled={isLoading} className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 mt-2 flex items-center justify-center gap-2 disabled:opacity-70">
            {isLoading && <i className="fa-solid fa-circle-notch animate-spin"></i>}
            {isLoading ? 'Criando Conta...' : 'Começar Agora'}
          </button>
        </form>
        
        <GoogleButton />

        <div className="mt-4 text-center">
           <button onClick={() => setView('login')} className="text-slate-500 dark:text-slate-400 text-xs hover:text-slate-900 dark:hover:text-white font-medium">Já tem conta? Entrar</button>
        </div>
    </AuthLayout>
  );
};
