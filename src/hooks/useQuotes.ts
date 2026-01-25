'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Quote } from '@/types/database';

export interface QuoteWithDetails extends Quote {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  lead: {
    id: string;
    name: string;
    service_requested: string | null;
  } | null;
}

interface QuoteStats {
  total: number;
  draft: number;
  sent: number;
  viewed: number;
  approved: number;
  rejected: number;
  expired: number;
  totalValue: number;
  approvedValue: number;
  conversionRate: number;
}

interface UseQuotesReturn {
  quotes: QuoteWithDetails[];
  stats: QuoteStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createQuote: (quote: Partial<Quote>) => Promise<{ data: Quote | null; error: Error | null }>;
  updateQuote: (id: string, updates: Partial<Quote>) => Promise<{ error: Error | null }>;
  deleteQuote: (id: string) => Promise<{ error: Error | null }>;
  sendQuote: (id: string) => Promise<{ error: Error | null }>;
}

export function useQuotes(): UseQuotesReturn {
  const { company } = useAuth();
  const [quotes, setQuotes] = useState<QuoteWithDetails[]>([]);
  const [stats, setStats] = useState<QuoteStats>({
    total: 0,
    draft: 0,
    sent: 0,
    viewed: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    totalValue: 0,
    approvedValue: 0,
    conversionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    if (!company?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('quotes')
        .select(`
          *,
          customer:customers(id, name, email, phone),
          lead:leads(id, name, service_requested)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const quotesData = (data as unknown as QuoteWithDetails[]) || [];
      setQuotes(quotesData);

      // Calculate stats
      const approved = quotesData.filter((q) => q.status === 'approved');
      const rejected = quotesData.filter((q) => q.status === 'rejected');
      const decidedCount = approved.length + rejected.length;

      setStats({
        total: quotesData.length,
        draft: quotesData.filter((q) => q.status === 'draft').length,
        sent: quotesData.filter((q) => q.status === 'sent').length,
        viewed: quotesData.filter((q) => q.status === 'viewed').length,
        approved: approved.length,
        rejected: rejected.length,
        expired: quotesData.filter((q) => q.status === 'expired').length,
        totalValue: quotesData.reduce((sum, q) => sum + (q.total || 0), 0),
        approvedValue: approved.reduce((sum, q) => sum + (q.total || 0), 0),
        conversionRate: decidedCount > 0 ? Math.round((approved.length / decidedCount) * 100) : 0,
      });
    } catch (err) {
      console.error('Error fetching quotes:', err);
      setError('Failed to load quotes');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  const createQuote = async (quoteData: Partial<Quote>) => {
    if (!company?.id) {
      return { data: null, error: new Error('No company found') };
    }

    try {
      const { data, error: insertError } = await supabase
        .from('quotes')
        .insert({
          ...quoteData,
          company_id: company.id,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError };
      }

      await fetchQuotes();
      return { data: data as Quote, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const updateQuote = async (id: string, updates: Partial<Quote>) => {
    try {
      const { error: updateError } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        return { error: updateError };
      }

      await fetchQuotes();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deleteQuote = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return { error: deleteError };
      }

      await fetchQuotes();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const sendQuote = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        return { error: updateError };
      }

      await fetchQuotes();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Set up real-time subscription
  useEffect(() => {
    if (!company?.id) return;

    const subscription = supabase
      .channel('quotes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchQuotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [company?.id, fetchQuotes]);

  return {
    quotes,
    stats,
    isLoading,
    error,
    refetch: fetchQuotes,
    createQuote,
    updateQuote,
    deleteQuote,
    sendQuote,
  };
}
