/**
 * Organization User Management Service
 * 
 * Gerencia utilizadores dentro de uma organização:
 * - Admin: cria, edita, remove membros
 * - Membros: acedem à plataforma com as suas próprias credenciais
 * - Os dados (faturas, recibos, etc) são partilhados dentro da organização
 */

import { supabase } from './supabaseClient';

export interface OrgMember {
  id: string;
  org_id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  created_at: string;
  status: 'active' | 'invited' | 'disabled';
  invited_by?: string;
  last_login?: string;
}

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  max_members: number;
}

class OrgService {
  /**
   * Criar uma organização quando um utilizador se regista
   */
  async createOrganization(ownerId: string, companyName: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name: companyName || 'Minha Empresa',
          owner_id: ownerId,
          max_members: 10
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating organization:', error);
        return null;
      }

      // Add owner as admin
      const { error: memberError } = await supabase
        .from('org_members')
        .insert({
          org_id: data.id,
          user_id: ownerId,
          role: 'admin',
          status: 'active'
        });

      if (memberError) {
        console.error('Error adding admin to org:', memberError);
      }

      return data;
    } catch (e) {
      console.error('Create organization error:', e);
      return null;
    }
  }

  /**
   * Obter a organização do utilizador
   */
  async getUserOrganization(userId: string): Promise<Organization | null> {
    try {
      // Primeiro, obter o membro
      const { data: member, error: memberError } = await supabase
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', userId)
        .single();

      if (memberError || !member) return null;

      // Depois, obter a organização
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', member.org_id)
        .single();

      if (orgError) return null;
      return org;
    } catch (e) {
      return null;
    }
  }

  /**
   * Verificar se o utilizador é admin da organização
   */
  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error || !data) return false;
      return data.role === 'admin';
    } catch {
      return false;
    }
  }

  /**
   * Listar todos os membros da organização
   */
  async listMembers(orgId: string): Promise<OrgMember[]> {
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listing members:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error('List members error:', e);
      return [];
    }
  }

  /**
   * Convidar um novo membro (apenas admin)
   */
  async inviteMember(
    orgId: string,
    email: string,
    name: string,
    invitedBy: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar se o email já está registado
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        // Verificar se já é membro desta organização
        const { data: existingMember } = await supabase
          .from('org_members')
          .select('id')
          .eq('org_id', orgId)
          .eq('user_id', existingUser.id)
          .maybeSingle();

        if (existingMember) {
          return { success: false, message: 'Este utilizador já é membro da organização.' };
        }

        // Adicionar como membro
        const { error } = await supabase
          .from('org_members')
          .insert({
            org_id: orgId,
            user_id: existingUser.id,
            email: email,
            name: name,
            role: 'member',
            status: 'active',
            invited_by: invitedBy
          });

        if (error) {
          return { success: false, message: 'Erro ao adicionar membro: ' + error.message };
        }

        return { success: true, message: 'Membro adicionado com sucesso!' };
      } else {
        // Enviar convite por email (funcionalidade futura - Supabase Auth invite)
        // Por enquanto, adicionamos como "invited"
        const { error } = await supabase
          .from('org_members')
          .insert({
            org_id: orgId,
            email: email,
            name: name,
            role: 'member',
            status: 'invited',
            invited_by: invitedBy
          });

        if (error) {
          return { success: false, message: 'Erro ao convidar: ' + error.message };
        }

        return {
          success: true,
          message: `Convite enviado para ${email}. O utilizador precisa criar uma conta com este email.`
        };
      }
    } catch (e: any) {
      return { success: false, message: 'Erro ao convidar membro: ' + e.message };
    }
  }

  /**
   * Remover um membro da organização (apenas admin)
   */
  async removeMember(orgId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('org_id', orgId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing member:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Remove member error:', e);
      return false;
    }
  }

  /**
   * Alterar papel de um membro (apenas admin)
   */
  async changeMemberRole(
    orgId: string,
    userId: string,
    newRole: 'admin' | 'member'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('org_members')
        .update({ role: newRole })
        .eq('org_id', orgId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error changing role:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Change role error:', e);
      return false;
    }
  }

  /**
   * Obter o ID da organização de um utilizador (do cache local)
   */
  async getOrgId(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;
      return data.org_id;
    } catch {
      return null;
    }
  }

  /**
   * Contar membros ativos de uma organização
   */
  async countActiveMembers(orgId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('org_members')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'active');

      if (error) return 1;
      return count || 1;
    } catch {
      return 1;
    }
  }
}

export const orgService = new OrgService();
