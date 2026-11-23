'use client';

import { useMemo, useState } from 'react';
import { Tags, Plus, Pencil, Trash2, Sparkles, X } from 'lucide-react';
import { usePriceBook } from '@/hooks/usePriceBook';
import { usePermissions } from '@/hooks/usePermissions';
import {
  PRICE_BOOK_UNITS,
  PRICE_BOOK_UNIT_LABELS,
  type PriceBookItem,
  type PriceBookItemInput,
  type PriceBookUnit,
} from '@/lib/price-book';

const UNCATEGORIZED = 'Uncategorized';

const emptyDraft: PriceBookItemInput = {
  name: '',
  default_price: 0,
  unit: 'each',
  category: '',
  taxable: true,
};

export default function PriceBookPage() {
  const { items, isLoading, error, createItem, updateItem, archiveItem, loadStarterList } = usePriceBook();
  const { can } = usePermissions();
  const canEdit = can('quotes');

  const [editing, setEditing] = useState<PriceBookItem | null>(null);
  const [draft, setDraft] = useState<PriceBookItemInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [starterLoading, setStarterLoading] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, PriceBookItem[]>();
    for (const item of items) {
      const key = item.category || UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  const openAdd = () => {
    setEditing(null);
    setDraft({ ...emptyDraft });
    setFormError('');
  };

  const openEdit = (item: PriceBookItem) => {
    setEditing(item);
    setDraft({
      name: item.name,
      default_price: item.default_price,
      unit: item.unit,
      category: item.category || '',
      taxable: item.taxable,
    });
    setFormError('');
  };

  const closeModal = () => {
    setDraft(null);
    setEditing(null);
    setFormError('');
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    setSaving(true);
    const { error: saveError } = editing
      ? await updateItem(editing.id, draft)
      : await createItem(draft);
    setSaving(false);
    if (saveError) {
      setFormError(saveError.message || 'Could not save this item.');
      return;
    }
    closeModal();
  };

  const handleStarter = async () => {
    setStarterLoading(true);
    const { error: starterError } = await loadStarterList();
    setStarterLoading(false);
    if (starterError) alert('Could not load the starter list: ' + starterError.message);
  };

  const handleArchive = async (item: PriceBookItem) => {
    if (!confirm(`Remove "${item.name}" from your price book? Existing quotes keep it.`)) return;
    const { error: archiveError } = await archiveItem(item.id);
    if (archiveError) alert('Could not remove this item: ' + archiveError.message);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center">
            <Tags className="w-6 h-6 text-navy-500" />
          </div>
          <h1 className="text-2xl font-bold text-navy-500">Price Book</h1>
        </div>
        {canEdit && (
          <button
            onClick={openAdd}
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2"
          >
            <Plus size={18} /> Add item
          </button>
        )}
      </div>
      <p className="text-gray-600 mb-6">
        Your reusable services and prices. Add them from your price book while building a quote,
        instead of re-typing them every time.
      </p>

      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {isLoading ? (
        <div className="text-gray-500 py-12 text-center">Loading your price book…</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-gold-50 rounded-full flex items-center justify-center mb-4">
            <Tags className="w-6 h-6 text-gold-500" />
          </div>
          <h2 className="text-lg font-semibold text-navy-500 mb-1">Your price book is empty</h2>
          <p className="text-gray-600 mb-6">
            Add your services one at a time, or start from a ready-made list you can edit.
          </p>
          {canEdit && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={openAdd} className="btn-secondary inline-flex items-center justify-center gap-2 px-5 py-2.5">
                <Plus size={18} /> Add your first item
              </button>
              <button
                onClick={handleStarter}
                disabled={starterLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Sparkles size={18} /> {starterLoading ? 'Loading…' : 'Load starter list'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, rows]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-2">{category}</h3>
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {rows.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <div className="font-medium text-navy-500 truncate">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        ${item.default_price.toLocaleString(undefined, { minimumFractionDigits: 2 })} / {PRICE_BOOK_UNIT_LABELS[item.unit]}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEdit(item)} className="p-2 text-gray-400 hover:text-navy-500" aria-label="Edit">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleArchive(item)} className="p-2 text-gray-400 hover:text-red-600" aria-label="Remove">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / edit modal */}
      {draft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={closeModal}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-navy-500">{editing ? 'Edit item' : 'Add item'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="input-label">Name</label>
                <input
                  className="input"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Lawn mowing"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Price</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="input"
                    value={draft.default_price}
                    onChange={(e) => setDraft({ ...draft, default_price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="input-label">Unit</label>
                  <select
                    className="input"
                    value={draft.unit}
                    onChange={(e) => setDraft({ ...draft, unit: e.target.value as PriceBookUnit })}
                  >
                    {PRICE_BOOK_UNITS.map((u) => (
                      <option key={u} value={u}>{PRICE_BOOK_UNIT_LABELS[u]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Category <span className="text-gray-400">(optional)</span></label>
                <input
                  className="input"
                  value={draft.category || ''}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="e.g. Lawn & Garden"
                />
              </div>

              {formError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{formError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={saveDraft} disabled={saving} className="btn-secondary flex-1 px-4 py-2.5 disabled:opacity-50">
                  {saving ? 'Saving…' : editing ? 'Save' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
