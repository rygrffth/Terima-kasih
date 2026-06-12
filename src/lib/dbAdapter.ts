import { supabase } from './supabase';
import { LhuDocument, LhuUser } from '../types';

export interface DatabaseAdapter {
  getAllDocuments(): Promise<LhuDocument[]>;
  getDocumentsByStatus(statuses: string[]): Promise<LhuDocument[]>;
  updateDocumentStatus(id: string | number, status: string, additionalData?: any): Promise<void>;
  getUserByToken(token: string): Promise<LhuUser | null>;

}

class SupabaseAdapter implements DatabaseAdapter {
  async getAllDocuments(): Promise<LhuDocument[]> {
    const { data, error } = await supabase
      .from('lhu_document')
      .select('*')
      .order('nomor_lhu', { ascending: false });

    if (error) {
      console.error('DatabaseAdapter getAllDocuments error:', error);
      throw error;
    }
    return (data || []) as LhuDocument[];
  }

  async getDocumentsByStatus(statuses: string[]): Promise<LhuDocument[]> {
    const { data, error } = await supabase
      .from('lhu_document')
      .select('*')
      .in('status', statuses)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('DatabaseAdapter getDocumentsByStatus error:', error);
      throw error;
    }
    return (data || []) as LhuDocument[];
  }

  async updateDocumentStatus(id: string | number, status: string, additionalData?: any): Promise<void> {
    const payload = { status, ...additionalData };
    const { error } = await supabase
      .from('lhu_document')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('DatabaseAdapter updateDocumentStatus error:', error);
      throw error;
    }
  }

  async getUserByToken(token: string): Promise<LhuUser | null> {
    const { data, error } = await supabase
      .from('lhu_users')
      .select('*')
      .eq('login_token', token)
      .single();

    if (error) {
      console.error('DatabaseAdapter getUserByToken error:', error);
      return null;
    }
    return data as LhuUser;
  }
}

export const dbAdapter: DatabaseAdapter = new SupabaseAdapter();
