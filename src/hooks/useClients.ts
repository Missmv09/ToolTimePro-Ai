'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientStats {
  total: number;
  thisMonth: number;
  withEmail: number;
  withPhone: number;
}

interface UseClientsReturn {
  clients: Client[];
  stats: ClientStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createClient: (client: Partial<Client>) => Promise<{ error: Error | null }>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<{ error: Error | null }>;
  deleteClient: (id: string) => Promise<{ error: Error | null }>;
}

export function useClients(): UseClientsReturn {
  const { company } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    if (!company?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setClients((data as Client[]) || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Real-time subscription for client changes
  useEffect(() => {
    if (!company?.id) return;

    const subscription = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [company?.id, fetchClients]);

  const createClient = async (client: Partial<Client>): Promise<{ error: Error | null }> => {
    if (!company?.id) {
      return { error: new Error('No company found') };
    }

    try {
      const { error: insertError } = await supabase
        .from('customers')
        .insert({
          ...client,
          company_id: company.id,
        });

      if (insertError) {
        return { error: insertError };
      }

      await fetchClients();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>): Promise<{ error: Error | null }> => {
    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        return { error: updateError };
      }

      await fetchClients();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deleteClient = async (id: string): Promise<{ error: Error | null }> => {
    try {
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return { error: deleteError };
      }

      await fetchClients();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Calculate stats
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats: ClientStats = {
    total: clients.length,
    thisMonth: clients.filter((c) => new Date(c.created_at) >= thisMonthStart).length,
    withEmail: clients.filter((c) => c.email).length,
    withPhone: clients.filter((c) => c.phone).length,
  };

  return {
    clients,
    stats,
    isLoading,
    error,
    refetch: fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
}
