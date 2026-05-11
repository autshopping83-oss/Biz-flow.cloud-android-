# 🛠️ SOLUÇÕES IMPLEMENTÁVEIS

Este arquivo contém código pronto para copiar/colar com correções para os principais problemas.

---

## 1️⃣ CRIAR UTILITY DE VALIDAÇÃO

**Arquivo**: `src/utils/validators.ts` (NOVO)

```typescript
/**
 * Validators - Funções reutilizáveis de validação
 */

export const validators = {
  /**
   * Valida email usando regex RFC 5322 simplificado
   */
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Valida força de senha
   * - Mínimo 8 caracteres
   * - Pelo menos uma letra maiúscula
   * - Pelo menos um número
   * - Pelo menos um caractere especial
   */
  password: (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) errors.push("Mínimo 8 caracteres");
    if (!/[A-Z]/.test(password)) errors.push("Uma letra maiúscula");
    if (!/[0-9]/.test(password)) errors.push("Um número");
    if (!/[!@#$%^&*]/.test(password)) errors.push("Um caractere especial (!@#$%^&*)");
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Valida número de telefone
   * - Entre 10 e 15 dígitos
   * - Apenas números possível
   */
  phone: (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  },

  /**
   * Sanitiza nome de arquivo
   * - Remove caracteres perigosos
   * - Limita tamanho
   * - Substitui espaços por underscore
   */
  fileName: (name: string, maxLength: number = 100): string => {
    return name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, maxLength)
      .toLowerCase();
  },

  /**
   * Valida NUIT (Número Único de Identificação Tributária - Moçambique)
   */
  nuit: (nuit: string): boolean => {
    const cleaned = nuit.replace(/\D/g, '');
    return cleaned.length === 9; // NUIT tem 9 dígitos
  },

  /**
   * Verifica se arquivo é imagem permitida
   */
  imageFile: (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: "Tipo não permitido. Use PNG, JPEG ou WebP." 
      };
    }

    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: "Arquivo muito grande. Máximo 2MB." 
      };
    }

    return { valid: true };
  }
};

export default validators;
```

---

## 2️⃣ CRIAR SECURITY UTILITY

**Arquivo**: `src/utils/security.ts` (NOVO)

```typescript
/**
 * Security utilities - Funções para proteção contra XSS, CSRF, etc
 */
import DOMPurify from 'dompurify';

export const security = {
  /**
   * Sanitiza texto para remover XSS
   */
  sanitizeText: (text: string): string => {
    return DOMPurify.sanitize(text, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    });
  },

  /**
   * Sanitiza HTML preservando tags seguras
   */
  sanitizeHTML: (html: string): string => {
    return DOMPurify.sanitize(html, { 
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
      ALLOWED_ATTR: ['href', 'title']
    });
  },

  /**
   * Sanitiza URL para evitar javascript: e data: injections
   */
  sanitizeURL: (url: string): string | null => {
    try {
      const parsed = new URL(url);
      // Só permitir http e https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  },

  /**
   * Gera token CSRF básico (deve ser implementado melhor no backend)
   */
  generateCSRFToken: (): string => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Sanitiza objeto para JSON (Remove funções, undefined, etc)
   */
  sanitizeJSON: (obj: any): any => {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Hash simples (SHA-256) para dados não-sensíveis
   * NÃO USE PARA SENHAS!
   */
  hashSHA256: async (text: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
};

export default security;
```

---

## 3️⃣ CUSTOM HOOK: useAuth COM VALIDAÇÕES

**Arquivo**: `src/hooks/useAuth.ts` (NOVO)

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { validators } from '../utils/validators';
import { useToast } from '../components/ToastContext';

export const useAuth = () => {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const mounted = useRef(true);
  const { notify } = useToast();

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      // Validações
      if (!email.trim() || !validators.email(email)) {
        notify("Email inválido", "error");
        return;
      }

      if (!password || password.length < 6) {
        notify("Senha muito curta", "error");
        return;
      }

      setAuthLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({ 
          email: email.trim(),
          password 
        });

        if (!mounted.current) return;

        if (error) {
          // Mensagem genérica para segurança
          if (error.message.includes('Invalid login credentials')) {
            notify("Email ou senha incorretos", "error");
          } else {
            notify("Erro ao fazer login. Tente novamente.", "error");
          }
          return;
        }

        notify("Login bem-sucedido!", "success");
      } catch (e: any) {
        if (!mounted.current) return;
        console.error("[AUTH] Login error:", e);
        notify("Erro no servidor. Tente mais tarde.", "error");
      } finally {
        if (mounted.current) {
          setAuthLoading(false);
        }
      }
    },
    [notify]
  );

  const handleRegister = useCallback(
    async (email: string, password: string, data: any) => {
      // Validações
      if (!email.trim() || !validators.email(email)) {
        notify("Email inválido", "error");
        return;
      }

      const passwordValidation = validators.password(password);
      if (!passwordValidation.valid) {
        notify(`Senha fraca. Necessário: ${passwordValidation.errors.join(', ')}`, "error");
        return;
      }

      if (!data.companyName?.trim()) {
        notify("Nome da empresa obrigatório", "error");
        return;
      }

      setAuthLoading(true);
      try {
        const { data: authData, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: data.name?.trim() || '',
              company_name: data.companyName.trim()
            }
          }
        });

        if (!mounted.current) return;

        if (error) {
          if (error.message.includes('already registered')) {
            notify("Este email já está registado", "error");
          } else {
            notify("Erro no registo. Tente novamente.", "error");
          }
          return;
        }

        if (authData.user) {
          await supabase.from('profiles').insert({
            id: authData.user.id,
            company_name: data.companyName.trim(),
            address: data.address?.trim() || '',
            currency: data.currency || 'MZN',
            language: data.language || 'pt',
            logo: data.logo || null
          });
        }

        notify("Conta criada! Verifique seu email para confirmar.", "success");
      } catch (e: any) {
        if (!mounted.current) return;
        console.error("[AUTH] Register error:", e);
        notify("Erro ao registar. Tente novamente.", "error");
      } finally {
        if (mounted.current) {
          setAuthLoading(false);
        }
      }
    },
    [notify]
  );

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      if (mounted.current) {
        setSession(null);
        notify("Logout realizado", "success");
      }
    } catch (e: any) {
      console.error("[AUTH] Logout error:", e);
      notify("Erro ao fazer logout", "error");
    }
  }, [notify]);

  return {
    session,
    authLoading,
    handleLogin,
    handleRegister,
    handleLogout
  };
};
```

---

## 4️⃣ CORRIGIR FILE UPLOAD

**Arquivo**: `App.tsx` - Substituir `handleLogoChange`

```typescript
import validators from './utils/validators';

const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar arquivo
    const validation = validators.imageFile(file);
    if (!validation.valid) {
      notify(validation.error || "Arquivo inválido", "error");
      return;
    }

    // Validar tipo MIME (segurança adicional)
    if (!file.type.startsWith('image/')) {
      notify("Apenas imagens permitidas", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Verificar tamanho do data URL
      if (result.length > 3 * 1024 * 1024) { // 3MB data URL
        notify("Arquivo convertido muito grande", "error");
        return;
      }
      setCompanySettings(prev => ({ ...prev, logo: result }));
      notify("Logo carregado com sucesso!", "success");
    };
    reader.onerror = () => {
      notify("Erro ao ler arquivo", "error");
    };
    reader.readAsDataURL(file);
};
```

---

## 5️⃣ SANITIZAR NOMES DE ARQUIVO

**Arquivo**: `App.tsx` - Substituir em `generatePDFBlob`

```typescript
import { security } from './utils/security';
import { validators } from './utils/validators';

const generatePDFBlob = async (): Promise<{ blob: Blob, fileName: string, base64: string } | null> => {
    const targetRef = ghostReceiptRef.current || receiptRef.current;
    if (!targetRef) return null;

    try {
      // ... html2canvas code ...

      // SANITIZAR NOME DO ARQUIVO
      const sanitizedNumber = validators.fileName(formData.number);
      const sanitizedClientName = validators.fileName(formData.clientName);
      const fileName = sanitizedClientName 
        ? `${sanitizedNumber}_${sanitizedClientName}.pdf`
        : `${sanitizedNumber}_documento.pdf`;

      return { blob: pdf.output('blob'), fileName, base64: pdf.output('datauristring').split(',')[1] };
    } catch (e) {
      console.error(e);
      return null;
    }
};
```

---

## 6️⃣ CORRIGIR WHATSAPP SHARE

**Arquivo**: `App.tsx` - Substituir `handleShareWhatsApp`

```typescript
const handleShareWhatsApp = async () => {
    if (isSharing) return;
    
    // Validar telefone ANTES de usar
    if (!validators.phone(formData.clientContact)) {
      notify("Número de telefone inválido", "error");
      return;
    }

    setIsSharing(true);
    notify("Preparando partilha direta...", "info");

    try {
        const pdfData = await generatePDFBlob();
        if (!pdfData) throw new Error("Erro ao gerar ficheiro.");

        const { blob, fileName } = pdfData;
        const file = new File([blob], fileName, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: fileName,
                text: `Envio de ${formData.type === 'INVOICE' ? 'Fatura' : 'Documento'} - ${formData.number}`,
            });
            notify("Partilha concluída!", "success");
        } else {
            const text = `Olá, segue o documento ${formData.number}. Pode descarregar no aplicativo.`;
            // Sanitizar e validar telefone
            const cleanPhone = formData.clientContact.replace(/\D/g, '');
            if (cleanPhone.length < 10) {
              throw new Error("Número de telefone inválido");
            }
            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
            notify("Aviso: Abrindo WhatsApp...", "info");
        }
    } catch (e: any) {
        if (e.name !== 'AbortError') {
            const errorMsg = e.message.includes('phone') 
              ? "Número de telefone inválido"
              : "Erro ao partilhar documento";
            notify(errorMsg, "error");
        }
    } finally {
        setIsSharing(false);
    }
};
```

---

## 7️⃣ APLICAR ROW LEVEL SECURITY

**Arquivo**: `SQL no Supabase Console`

```sql
-- Ativar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policies para receipts
CREATE POLICY "Users can view their own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert receipts with their user_id"
  ON receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts"
  ON receipts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts"
  ON receipts FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para clients
CREATE POLICY "Users can view their own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- Mesmo para products table
-- ...
```

---

## 8️⃣ CRIAR ERROR BOUNDARY

**Arquivo**: `src/components/ErrorBoundary.tsx` (NOVO)

```typescript
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Enviar para Sentry, LogRocket, etc
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
          <div className="text-center max-w-md p-6">
            <h1 className="text-3xl font-bold text-red-600 mb-4">Oops! Erro</h1>
            <p className="text-gray-600 mb-6">
              Algo correu mal na aplicação. Por favor, tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Recarregar Página
            </button>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left text-xs text-gray-500">
                <summary>Detalhes do Erro</summary>
                <pre className="mt-2 p-2 bg-gray-900 text-gray-100 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 9️⃣ USAR NO APP.tsx

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

// Envolver o componente principal
export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
```

---

## 🔟 LOGGER UTILITY

**Arquivo**: `src/utils/logger.ts` (NOVO)

```typescript
/**
 * Logger centralizado para debugging e monitoring
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      stack: new Error().stack
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove entry mais antiga
    }

    // Log no console se desenvolvimento
    if (import.meta.env.DEV) {
      const style = this.getStyle(level);
      console.log(`%c[${level.toUpperCase()}]%c ${message}`, style, '', data);
    }

    // Enviar para Sentry etc em produção
    if (import.meta.env.PROD && level === 'error') {
      this.reportError(message, data);
    }
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  private getStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #999;',
      info: 'color: #0099ff;',
      warn: 'color: #ff9900;',
      error: 'color: #ff0000; font-weight: bold;'
    };
    return styles[level];
  }

  private reportError(message: string, data?: any) {
    // Aqui você integraria Sentry, LogRocket, etc
    // fetch('https://your-error-tracking.com/api/errors', {
    //   method: 'POST',
    //   body: JSON.stringify({ message, data, timestamp: Date.now() })
    // });
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();
```

---

## 📝 COMO USAR

```bash
# Instalar dependências
npm install dompurify

# Atualizar imports no App.tsx
import validators from './utils/validators';
import { security } from './utils/security';
import { useAuth } from './hooks/useAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logger } from './utils/logger';

# Testar segurança
# - Tentar ?guest=true - deve falhr
# - Upload de arquivo >2MB - deve falhar
# - Caracteres especiais em nomes - devem ser sanitizados
```

