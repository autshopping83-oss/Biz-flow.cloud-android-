/**
 * useAuth - Hook de autenticação
 * 
 * Gerencia login, registro, logout e recuperação de senha.
 * Isolado do App.tsx para respeitar SRP e limite de 30 linhas por função.
 */

import { useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { validators } from '../../../utils/validators';

interface AuthData {
  name?: string;
  companyName?: string;
  address?: string;
  currency?: string;
  language?: string;
  logo?: string | null;
}

interface UseAuthReturn {
  authLoading: boolean;
  handleLogin: (email: string, pass: string) => Promise<{ success: boolean; message: string }>;
  handleRegister: (email: string, pass: string, data: AuthData) => Promise<{ success: boolean; message: string }>;
  handleLogout: () => Promise<void>;
  handleGoogleLogin: () => Promise<void>;
}

export function useAuth(notify: (msg: string, type: 'success' | 'error' | 'info') => void): UseAuthReturn {
  const [authLoading, setAuthLoading] = useState(false);

  const handleLogin = async (email: string, pass: string): Promise<{ success: boolean; message: string }> => {
    if (!email.trim() || !validators.email(email)) {
      notify('Email inválido', 'error');
      return { success: false, message: 'Email inválido' };
    }
    if (!pass || pass.length < 6) {
      notify('Senha deve ter pelo menos 6 caracteres', 'error');
      return { success: false, message: 'Senha inválida' };
    }

    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      if (error) throw error;
      notify('Login bem-sucedido!', 'success');
      return { success: true, message: 'Login bem-sucedido' };
    } catch (e: any) {
      const msg = e.message?.includes('Invalid login credentials')
        ? 'Email ou senha incorretos'
        : 'Erro ao fazer login. Tente novamente.';
      notify(msg, 'error');
      return { success: false, message: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (email: string, pass: string, data: AuthData): Promise<{ success: boolean; message: string }> => {
    if (!email.trim() || !validators.email(email)) {
      notify('Email inválido', 'error');
      return { success: false, message: 'Email inválido' };
    }

    const passwordValidation = validators.password(pass);
    if (!passwordValidation.valid) {
      const msg = `Senha fraca. Necessário: ${passwordValidation.errors.join(', ')}`;
      notify(msg, 'error');
      return { success: false, message: msg };
    }

    setAuthLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: data?.name?.trim() || '',
            company_name: data?.companyName?.trim() || '',
          },
        },
      });
      if (error) throw error;

      if (authData.user) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          company_name: data?.companyName?.trim() || '',
          address: data?.address?.trim() || '',
          currency: data?.currency || 'MZN',
          language: data?.language || 'pt',
          logo: data?.logo || null,
        });
      }

      notify('Conta criada! Verifique seu email para confirmar.', 'success');
      return { success: true, message: 'Conta criada com sucesso' };
    } catch (e: any) {
      const msg = e.message?.includes('already registered')
        ? 'Este email já está registado'
        : 'Erro no registo. Tente novamente mais tarde.';
      notify(msg, 'error');
      return { success: false, message: msg };
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const handleGoogleLogin = async (): Promise<void> => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return { authLoading, handleLogin, handleRegister, handleLogout, handleGoogleLogin };
}
