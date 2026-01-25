'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Customer } from '@/types/database';

interface CustomerStats {
  total: number;
  thisMonth: number;
  totalRevenue: number;
}

interface UseCustomersReturn {
  customers: Customer[];
  stats: CustomerStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCustomer: (customer: Partial<Customer>) => Promise<{ data: Customer | null; error: Error | null }>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<{ error: Error | null }>;
  deleteCustomer: (id: string) => Promise<{ error: Error | null }>;
}

export function useCustomers(): UseCustomersReturn {
  const { company } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    thisMonth: 0,
    totalRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
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

      const customersData = (data as Customer[]) || [];
      setCustomers(customersData);

      // Calculate stats
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      setStats({
        total: customersData.length,
        thisMonth: customersData.filter(
          (c) => new Date(c.created_at) >= monthStart
        ).length,
        totalRevenue: 0, // Would need to join with invoices table
      });
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  const createCustomer = async (customerData: Partial<Customer>) => {
    if (!company?.id) {
      return { data: null, error: new Error('No company found') };
    }

    try {
      const { data, error: insertError } = await supabase
        .from('customers')
        .insert({
          ...customerData,
          company_id: company.id,
        })
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError };
      }

      await fetchCustomers();
      return { data: data as Customer, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const { error: updateError } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        return { error: updateError };
      }

      await fetchCustomers();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return { error: deleteError };
      }

      await fetchCustomers();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Set up real-time subscription
  useEffect(() => {
    if (!company?.id) return;

    const subscription = supabase
      .channel('customers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          fetchCustomers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [company?.id, fetchCustomers]);

  return {
    customers,
    stats,
    isLoading,
    error,
    refetch: fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
