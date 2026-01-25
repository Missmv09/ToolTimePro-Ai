'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  invoice_number: string | null;
  customer_id: string | null;
  job_id: string | null;
  quote_id: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue';
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  items?: InvoiceItem[];
}

export interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  totalOutstanding: number;
  totalPaid: number;
}

interface UseInvoicesReturn {
  invoices: Invoice[];
  stats: InvoiceStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createInvoice: (invoice: Partial<Invoice>, items?: Partial<InvoiceItem>[]) => Promise<{ data: Invoice | null; error: Error | null }>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<{ error: Error | null }>;
  deleteInvoice: (id: string) => Promise<{ error: Error | null }>;
  markAsPaid: (id: string) => Promise<{ error: Error | null }>;
  markAsSent: (id: string) => Promise<{ error: Error | null }>;
}

export function useInvoices(): UseInvoicesReturn {
  const { company } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!company?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, email, phone)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setInvoices((data as Invoice[]) || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Real-time subscription
  useEffect(() => {
    if (!company?.id) return;

    const subscription = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchInvoices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [company?.id, fetchInvoices]);

  const createInvoice = async (
    invoice: Partial<Invoice>,
    items?: Partial<InvoiceItem>[]
  ): Promise<{ data: Invoice | null; error: Error | null }> => {
    if (!company?.id) {
      return { data: null, error: new Error('No company found') };
    }

    try {
      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices')
        .insert({
          ...invoice,
          company_id: company.id,
        })
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError };
      }

      // Insert items if provided
      if (items && items.length > 0 && newInvoice) {
        const itemsWithInvoiceId = items.map((item, index) => ({
          ...item,
          invoice_id: newInvoice.id,
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsWithInvoiceId);

        if (itemsError) {
          console.error('Error inserting invoice items:', itemsError);
        }
      }

      await fetchInvoices();
      return { data: newInvoice as Invoice, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>): Promise<{ error: Error | null }> => {
    try {
      const { error: updateError } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        return { error: updateError };
      }

      await fetchInvoices();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deleteInvoice = async (id: string): Promise<{ error: Error | null }> => {
    try {
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return { error: deleteError };
      }

      await fetchInvoices();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const markAsPaid = async (id: string): Promise<{ error: Error | null }> => {
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) {
      return { error: new Error('Invoice not found') };
    }

    return updateInvoice(id, {
      status: 'paid',
      amount_paid: invoice.total,
      paid_at: new Date().toISOString(),
    });
  };

  const markAsSent = async (id: string): Promise<{ error: Error | null }> => {
    return updateInvoice(id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  };

  // Calculate stats
  const now = new Date();
  const stats: InvoiceStats = {
    total: invoices.length,
    draft: invoices.filter((inv) => inv.status === 'draft').length,
    sent: invoices.filter((inv) => inv.status === 'sent' || inv.status === 'viewed').length,
    paid: invoices.filter((inv) => inv.status === 'paid').length,
    overdue: invoices.filter((inv) => {
      if (inv.status === 'paid') return false;
      if (!inv.due_date) return false;
      return new Date(inv.due_date) < now;
    }).length,
    totalOutstanding: invoices
      .filter((inv) => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.total - inv.amount_paid), 0),
    totalPaid: invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0),
  };

  return {
    invoices,
    stats,
    isLoading,
    error,
    refetch: fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markAsPaid,
    markAsSent,
  };
}
