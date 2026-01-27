'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Invoice } from '@/types/database';

export interface InvoiceWithDetails extends Invoice {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  job: {
    id: string;
    title: string;
  } | null;
}

interface InvoiceStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  totalOutstanding: number;
  totalPaid: number;
}

interface UseInvoicesReturn {
  invoices: InvoiceWithDetails[];
  stats: InvoiceStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createInvoice: (invoice: Partial<Invoice>) => Promise<{ data: Invoice | null; error: Error | null }>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<{ error: Error | null }>;
  deleteInvoice: (id: string) => Promise<{ error: Error | null }>;
  sendInvoice: (id: string) => Promise<{ error: Error | null }>;
  markPaid: (id: string) => Promise<{ error: Error | null }>;
}

export function useInvoices(): UseInvoicesReturn {
  const { company } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    total: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    totalOutstanding: 0,
    totalPaid: 0,
  });
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
          customer:customers(id, name, email, phone),
          job:jobs(id, title)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const invoicesData = (data as unknown as InvoiceWithDetails[]) || [];
      setInvoices(invoicesData);

      // Calculate stats
      const now = new Date();
      const outstanding = invoicesData.filter((i) =>
        ['sent', 'viewed', 'partial'].includes(i.status)
      );
      const overdue = invoicesData.filter(
        (i) =>
          ['sent', 'viewed'].includes(i.status) &&
          i.due_date &&
          new Date(i.due_date) < now
      );

      setStats({
        total: invoicesData.length,
        draft: invoicesData.filter((i) => i.status === 'draft').length,
        sent: invoicesData.filter((i) => ['sent', 'viewed'].includes(i.status)).length,
        paid: invoicesData.filter((i) => i.status === 'paid').length,
        overdue: overdue.length,
        totalOutstanding: outstanding.reduce((sum, i) => sum + (i.total - i.amount_paid), 0),
        totalPaid: invoicesData
          .filter((i) => i.status === 'paid')
          .reduce((sum, i) => sum + i.total, 0),
      });
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  const createInvoice = async (invoiceData: Partial<Invoice>) => {
    if (!company?.id) {
      return { data: null, error: new Error('No company found') };
    }

    try {
      const { data, error: insertError } = await supabase
        .from('invoices')
        .insert({
          ...invoiceData,
          company_id: company.id,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError };
      }

      await fetchInvoices();
      return { data: data as Invoice, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
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

  const deleteInvoice = async (id: string) => {
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

  const sendInvoice = async (id: string) => {
    try {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        return { error: updateError };
      }

      // Send SMS notification if customer has phone number
      const invoice = invoices.find((i) => i.id === id);
      if (invoice?.customer?.phone && company?.id) {
        const invoiceLink = `${window.location.origin}/invoice/${id}`;
        try {
          await fetch('/api/sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: invoice.customer.phone,
              template: 'invoice_sent',
              data: {
                customerName: invoice.customer.name || 'Customer',
                companyName: company.name || 'Our team',
                invoiceLink,
              },
              companyId: company.id,
            }),
          });
        } catch {
          // SMS is optional - don't fail if it fails
          console.log('SMS notification skipped or failed for invoice:', id);
        }
      }

      await fetchInvoices();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const markPaid = async (id: string) => {
    try {
      // Get the invoice to set amount_paid
      const invoice = invoices.find((i) => i.id === id);
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          amount_paid: invoice?.total || 0,
        })
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

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Set up real-time subscription
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

  return {
    invoices,
    stats,
    isLoading,
    error,
    refetch: fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
    markPaid,
  };
}
