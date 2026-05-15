/**
 * Security utilities - Funções para proteção contra XSS, CSRF, etc
 */
import DOMPurify from 'dompurify';

export const security = {
  /**
   * Sanitiza texto para remover XSS
   */
  sanitizeText: (text: string): string => {
    if (!text) return '';
    return DOMPurify.sanitize(text, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    });
  },

  /**
   * Sanitiza HTML preservando tags seguras
   */
  sanitizeHTML: (html: string): string => {
    if (!html) return '';
    return DOMPurify.sanitize(html, { 
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
      ALLOWED_ATTR: ['href', 'title']
    });
  },

  /**
   * Sanitiza URL para evitar javascript: e data: injections
   */
  sanitizeURL: (url: string): string | null => {
    if (!url || typeof url !== 'string') return null;
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
   * Gera token CSRF básico
   */
  generateCSRFToken: (): string => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Sanitiza objeto para JSON (deep clone seguro)
   */
  sanitizeJSON: <T>(obj: T): T | Record<string, never> => {
    try {
      return JSON.parse(JSON.stringify(obj)) as T;
    } catch {
      return {};
    }
  }
};

export default security;
