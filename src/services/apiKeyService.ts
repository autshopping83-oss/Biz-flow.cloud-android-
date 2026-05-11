/**
 * API Key Service
 * 
 * Gerencia chaves de API para usuários acessarem serviços externos.
 * Cada usuário pode criar múltiplas chaves com diferentes permissões.
 */

import { supabase } from './supabaseClient';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface CreateApiKeyParams {
  name: string;
  permissions?: string[];
  expires_at?: string | null;
}

export class ApiKeyService {
  /**
   * Lista todas as chaves do usuário (sem mostrar o valor completo)
   */
  static async list(): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Cria uma nova chave de API
   */
  static async create(params: CreateApiKeyParams): Promise<{ id: string; key: string }> {
    const { data, error } = await supabase
      .rpc('create_api_key', {
        key_name: params.name,
        key_permissions: params.permissions || ['read'],
        key_expires_at: params.expires_at || null
      });

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza uma chave (nome, permissões, status)
   */
  static async update(id: string, updates: Partial<ApiKey>): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({
        name: updates.name,
        permissions: updates.permissions,
        is_active: updates.is_active,
        expires_at: updates.expires_at
      })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Remove uma chave
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Alterna status ativo/inativo
   */
  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
  }
}
