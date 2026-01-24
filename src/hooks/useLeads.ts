'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  service_requested: string | null;
  message: string | null;
  source: string;
  status: 'new' | 'contacted' | 'quoted' | 'won' | 'lost';
  estimated_value: number | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadStats {
  new: number;
  contacted: number;
  quoted: number;
  totalValue: number;
}

interface UseLeadsReturn {
  leads: Lead[];
  stats: LeadStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createLead: (lead: Partial<Lead>) => Promise<{ error: Error | null }>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<{ error: Error | null }>;
  deleteLead: (id: string) => Promise<{ error: Error | null }>;
}

export function useLeads(): UseLeadsReturn {
  const { company } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!company?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setLeads((data as Lead[]) || []);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Real-time subscription for new leads
  useEffect(() => {
    if (!company?.id) return;

    const subscription = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [company?.id, fetchLeads]);

  const createLead = async (lead: Partial<Lead>): Promise<{ error: Error | null }> => {
    if (!company?.id) {
      return { error: new Error('No company found') };
    }

    try {
      const { error: insertError } = await supabase
        .from('leads')
        .insert({
          ...lead,
          company_id: company.id,
        });

      if (insertError) {
        return { error: insertError };
      }

      await fetchLeads();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>): Promise<{ error: Error | null }> => {
    try {
      const { error: updateError } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        return { error: updateError };
      }

      await fetchLeads();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deleteLead = async (id: string): Promise<{ error: Error | null }> => {
    try {
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return { error: deleteError };
      }

      await fetchLeads();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  // Calculate stats
  const stats: LeadStats = {
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    quoted: leads.filter((l) => l.status === 'quoted').length,
    totalValue: leads
      .filter((l) => l.status !== 'lost')
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0),
  };

  return {
    leads,
    stats,
    isLoading,
    error,
    refetch: fetchLeads,
    createLead,
    updateLead,
    deleteLead,
  };
}
