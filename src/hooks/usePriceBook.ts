'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  type PriceBookItem,
  type PriceBookItemInput,
  STARTER_PRICE_BOOK,
  normalizeUnit,
} from '@/lib/price-book';

interface UsePriceBookReturn {
  items: PriceBookItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createItem: (input: PriceBookItemInput) => Promise<{ error: Error | null }>;
  updateItem: (id: string, updates: Partial<PriceBookItemInput>) => Promise<{ error: Error | null }>;
  /** Soft delete — flips active to false so historical quotes keep their reference. */
  archiveItem: (id: string) => Promise<{ error: Error | null }>;
  /** One-click bootstrap: insert the trade-neutral starter list. No-op if the book is non-empty. */
  loadStarterList: () => Promise<{ error: Error | null; skipped?: boolean }>;
}

export function usePriceBook(): UsePriceBookReturn {
  const { company } = useAuth();
  const [items, setItems] = useState<PriceBookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!company?.id) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('price_book_items')
        .select('*')
        .eq('company_id', company.id)
        .eq('active', true)
        .order('category', { ascending: true, nullsFirst: false })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      const rows = ((data as PriceBookItem[]) || []).map((row) => ({
        ...row,
        unit: normalizeUnit(row.unit),
        default_price: Number(row.default_price) || 0,
      }));
      setItems(rows);
    } catch (err) {
      console.error('Error fetching price book:', err);
      setError('Failed to load price book');
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  const createItem = async (input: PriceBookItemInput) => {
    if (!company?.id) return { error: new Error('No company found') };
    const { error: insertError } = await supabase.from('price_book_items').insert({
      company_id: company.id,
      name: input.name.trim(),
      default_price: Number(input.default_price) || 0,
      unit: normalizeUnit(input.unit),
      category: input.category?.trim() || null,
      taxable: input.taxable ?? true,
      sort_order: input.sort_order ?? items.length,
    });
    if (insertError) return { error: insertError };
    await fetchItems();
    return { error: null };
  };

  const updateItem = async (id: string, updates: Partial<PriceBookItemInput>) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) patch.name = updates.name.trim();
    if (updates.default_price !== undefined) patch.default_price = Number(updates.default_price) || 0;
    if (updates.unit !== undefined) patch.unit = normalizeUnit(updates.unit);
    if (updates.category !== undefined) patch.category = updates.category?.trim() || null;
    if (updates.taxable !== undefined) patch.taxable = updates.taxable;
    if (updates.sort_order !== undefined) patch.sort_order = updates.sort_order;

    const { error: updateError } = await supabase.from('price_book_items').update(patch).eq('id', id);
    if (updateError) return { error: updateError };
    await fetchItems();
    return { error: null };
  };

  const archiveItem = async (id: string) => {
    const { error: archiveError } = await supabase
      .from('price_book_items')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (archiveError) return { error: archiveError };
    await fetchItems();
    return { error: null };
  };

  const loadStarterList = async () => {
    if (!company?.id) return { error: new Error('No company found') };
    // Don't clobber an existing book.
    const { count, error: countError } = await supabase
      .from('price_book_items')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('active', true);
    if (countError) return { error: countError };
    if ((count || 0) > 0) return { error: null, skipped: true };

    const rows = STARTER_PRICE_BOOK.map((item) => ({
      company_id: company.id,
      name: item.name,
      default_price: item.default_price,
      unit: item.unit,
      category: item.category ?? null,
      taxable: item.taxable ?? true,
      sort_order: item.sort_order ?? 0,
    }));
    const { error: insertError } = await supabase.from('price_book_items').insert(rows);
    if (insertError) return { error: insertError };
    await fetchItems();
    return { error: null };
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    isLoading,
    error,
    refetch: fetchItems,
    createItem,
    updateItem,
    archiveItem,
    loadStarterList,
  };
}
