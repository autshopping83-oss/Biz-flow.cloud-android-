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
  static async list(): Promise<ApiKey[]> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[apiKeyService.list]', error);
        throw error;
      }
      return data ?? [];
    } catch (err) {
      console.error('[apiKeyService.list] unexpected error:', err);
      throw new Error('Falha ao listar chaves de API');
    }
  }

  static async create(params: CreateApiKeyParams): Promise<{ id: string; key: string }> {
    try {
      const { data, error } = await supabase
        .rpc('create_api_key', {
          key_name: params.name,
          key_permissions: params.permissions ?? ['read'],
          key_expires_at: params.expires_at ?? null
        });

      if (error) {
        console.error('[apiKeyService.create]', error);
        throw error;
      }
      return data as { id: string; key: string };
    } catch (err) {
      console.error('[apiKeyService.create] unexpected error:', err);
      throw new Error('Falha ao criar chave de API');
    }
  }

  static async update(id: string, updates: Partial<ApiKey>): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({
          name: updates.name,
          permissions: updates.permissions,
          is_active: updates.is_active,
          expires_at: updates.expires_at
        })
        .eq('id', id);

      if (error) {
        console.error('[apiKeyService.update]', error);
        throw error;
      }
    } catch (err) {
      console.error('[apiKeyService.update] unexpected error:', err);
      throw new Error('Falha ao atualizar chave de API');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[apiKeyService.delete]', error);
        throw error;
      }
    } catch (err) {
      console.error('[apiKeyService.delete] unexpected error:', err);
      throw new Error('Falha ao remover chave de API');
    }
  }

  static async toggleActive(id: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) {
        console.error('[apiKeyService.toggleActive]', error);
        throw error;
      }
    } catch (err) {
      console.error('[apiKeyService.toggleActive] unexpected error:', err);
      throw new Error('Falha ao alternar estado da chave de API');
    }
  }
}
