'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DollarSign, Package, Plus, RefreshCw, Pencil, History } from 'lucide-react'

interface StripeProduct {
  stripe_id: string
  tooltime_id: string
  name: string
  description: string
  active: boolean
}

interface StripePrice {
  stripe_id: string
  tooltime_id: string
  tooltime_key: string
  product_id: string
  active: boolean
  unit_amount: number
  currency: string
  recurring: { interval: string; interval_count: number } | null
}

type ModalMode = 'create_product' | 'update_product' | 'create_price' | 'update_price' | null

export default function AdminPricingPage() {
  const [products, setProducts] = useState<StripeProduct[]>([])
  const [prices, setPrices] = useState<StripePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [showAuditLog, setShowAuditLog] = useState(false)

  // Form state for product
  const [productForm, setProductForm] = useState({
    product_id: '',
    tooltime_id: '',
    name: '',
    description: '',
    active: true,
    prices: [{ key: 'monthly', amount: '', interval: 'month' }] as Array<{
      key: string
      amount: string
      interval: string
    }>,
  })

  // Form state for price
  const [priceForm, setPriceForm] = useState({
    old_price_id: '',
    product_id: '',
    tooltime_id: '',
    key: 'monthly',
    amount: '',
    interval: 'month',
  })

  const [selectedProduct, setSelectedProduct] = useState<StripeProduct | null>(null)

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }, [])

  const callApi = useCallback(async (body: Record<string, unknown>) => {
    const token = await getToken()
    if (!token) throw new Error('Not authenticated')

    const res = await fetch('/.netlify/functions/stripe-price-management', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
    return data
  }, [getToken])

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await callApi({ action: 'list_products' })
      setProducts(data.products || [])
      setPrices(data.prices || [])
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [callApi])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // --- Handlers ---

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const priceDefs = productForm.prices
        .filter((p) => p.amount)
        .map((p) => ({
          key: p.key,
          amount_cents: Math.round(parseFloat(p.amount) * 100),
          interval: p.interval || undefined,
        }))

      await callApi({
        action: 'create_product',
        tooltime_id: productForm.tooltime_id,
        name: productForm.name,
        description: productForm.description,
        prices: priceDefs,
      })
      setModalMode(null)
      await fetchProducts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await callApi({
        action: 'update_product',
        product_id: productForm.product_id,
        name: productForm.name,
        description: productForm.description,
        active: productForm.active,
      })
      setModalMode(null)
      await fetchProducts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update product')
    } finally {
      setSaving(false)
    }
  }

  const handleCreatePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await callApi({
        action: 'create_price',
        product_id: priceForm.product_id,
        tooltime_id: priceForm.tooltime_id,
        key: priceForm.key,
        amount_cents: Math.round(parseFloat(priceForm.amount) * 100),
        interval: priceForm.interval || undefined,
      })
      setModalMode(null)
      await fetchProducts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create price')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await callApi({
        action: 'update_price',
        old_price_id: priceForm.old_price_id,
        product_id: priceForm.product_id,
        tooltime_id: priceForm.tooltime_id,
        key: priceForm.key,
        new_amount_cents: Math.round(parseFloat(priceForm.amount) * 100),
        interval: priceForm.interval || undefined,
      })
      setModalMode(null)
      await fetchProducts()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update price')
    } finally {
      setSaving(false)
    }
  }

  // --- Modal openers ---

  const openCreateProduct = () => {
    setProductForm({
      product_id: '',
      tooltime_id: '',
      name: '',
      description: '',
      active: true,
      prices: [{ key: 'monthly', amount: '', interval: 'month' }],
    })
    setModalMode('create_product')
  }

  const openEditProduct = (product: StripeProduct) => {
    setProductForm({
      product_id: product.stripe_id,
      tooltime_id: product.tooltime_id,
      name: product.name,
      description: product.description || '',
      active: product.active,
      prices: [],
    })
    setModalMode('update_product')
  }

  const openCreatePrice = (product: StripeProduct) => {
    setSelectedProduct(product)
    setPriceForm({
      old_price_id: '',
      product_id: product.stripe_id,
      tooltime_id: product.tooltime_id,
      key: 'monthly',
      amount: '',
      interval: 'month',
    })
    setModalMode('create_price')
  }

  const openUpdatePrice = (product: StripeProduct, price: StripePrice) => {
    setSelectedProduct(product)
    setPriceForm({
      old_price_id: price.stripe_id,
      product_id: product.stripe_id,
      tooltime_id: product.tooltime_id,
      key: price.tooltime_key,
      amount: (price.unit_amount / 100).toFixed(2),
      interval: price.recurring?.interval || '',
    })
    setModalMode('update_price')
  }

  // --- Helpers ---

  const getPricesForProduct = (productStripeId: string) =>
    prices.filter((p) => p.product_id === productStripeId && p.active)

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`

  const addPriceRow = () => {
    setProductForm({
      ...productForm,
      prices: [...productForm.prices, { key: '', amount: '', interval: 'month' }],
    })
  }

  const removePriceRow = (index: number) => {
    setProductForm({
      ...productForm,
      prices: productForm.prices.filter((_, i) => i !== index),
    })
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchProducts}
            className="mt-4 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Stripe Price Management</h1>
          <p className="text-gray-400 mt-1">Manage products and prices in your Stripe account</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchProducts}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => setShowAuditLog(!showAuditLog)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 text-sm"
          >
            <History size={16} />
            Audit Log
          </button>
          <button
            onClick={openCreateProduct}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
          >
            <Plus size={16} />
            New Product
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Products</p>
              <p className="text-2xl font-bold text-white mt-1">{products.length}</p>
            </div>
            <Package size={22} className="text-blue-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Prices</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {prices.filter((p) => p.active).length}
              </p>
            </div>
            <DollarSign size={22} className="text-green-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Inactive Products</p>
              <p className="text-2xl font-bold text-gray-500 mt-1">
                {products.filter((p) => !p.active).length}
              </p>
            </div>
            <Package size={22} className="text-gray-500" />
          </div>
        </div>
      </div>

      {/* Audit Log Panel */}
      {showAuditLog && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">Audit Log</h3>
          <p className="text-sm text-amber-300/80">
            Audit logs are stored in the <code className="bg-gray-800 px-1.5 py-0.5 rounded text-amber-400 text-xs">stripe_audit_logs</code> table
            and accessible via Supabase dashboard (Table Editor) or SQL Editor.
          </p>
          <p className="text-xs text-gray-500 mt-2 font-mono">
            SELECT * FROM stripe_audit_logs ORDER BY created_at DESC LIMIT 50;
          </p>
        </div>
      )}

      {/* Products */}
      {products.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <Package size={40} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No products found</h3>
          <p className="text-gray-400 mb-4">
            No ToolTime products exist in Stripe yet.
          </p>
          <button
            onClick={openCreateProduct}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
          >
            Create First Product
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const productPrices = getPricesForProduct(product.stripe_id)
            return (
              <div
                key={product.stripe_id}
                className={`bg-gray-800 rounded-xl border border-gray-700 overflow-hidden ${!product.active ? 'opacity-50' : ''}`}
              >
                {/* Product header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.active
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-gray-700 text-gray-400 border border-gray-600'
                      }`}
                    >
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{product.name}</h3>
                      <p className="text-xs text-gray-500">
                        {product.tooltime_id} &middot; {product.stripe_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openCreatePrice(product)}
                      className="flex items-center gap-1 text-sm px-3 py-1.5 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700"
                    >
                      <Plus size={14} /> Price
                    </button>
                    <button
                      onClick={() => openEditProduct(product)}
                      className="flex items-center gap-1 text-sm px-3 py-1.5 text-orange-400 hover:text-orange-300 font-medium"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <div className="px-6 py-2 text-sm text-gray-400 border-b border-gray-700/50">
                    {product.description}
                  </div>
                )}

                {/* Prices */}
                {productPrices.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-6 py-2 text-left">Price Key</th>
                        <th className="px-6 py-2 text-left">Amount</th>
                        <th className="px-6 py-2 text-left">Billing</th>
                        <th className="px-6 py-2 text-left">Stripe ID</th>
                        <th className="px-6 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {productPrices.map((price) => (
                        <tr key={price.stripe_id} className="hover:bg-gray-700/30">
                          <td className="px-6 py-3 text-sm font-medium text-white">
                            {price.tooltime_key}
                          </td>
                          <td className="px-6 py-3 text-sm text-green-400 font-semibold">
                            {formatAmount(price.unit_amount)}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-400">
                            {price.recurring ? `per ${price.recurring.interval}` : 'One-time'}
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-500 font-mono">
                            {price.stripe_id}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => openUpdatePrice(product, price)}
                              className="text-sm text-orange-400 hover:text-orange-300 font-medium"
                            >
                              Change Price
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-4 text-sm text-gray-500">No active prices</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Modals ─── */}

      {/* Create Product Modal */}
      {modalMode === 'create_product' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Create New Product</h2>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">ToolTime ID *</label>
                <input
                  type="text"
                  required
                  value={productForm.tooltime_id}
                  onChange={(e) => setProductForm({ ...productForm, tooltime_id: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., starter, jenny_pro, extra_worker"
                />
                <p className="text-xs text-gray-500 mt-1">Snake_case identifier for NEXT_PUBLIC_STRIPE_PRICES</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., ToolTime Pro — Starter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Price rows */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-300">Prices *</label>
                  <button type="button" onClick={addPriceRow} className="text-sm text-orange-400 hover:text-orange-300">
                    + Add price tier
                  </button>
                </div>
                {productForm.prices.map((row, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      required
                      value={row.key}
                      onChange={(e) => {
                        const updated = [...productForm.prices]
                        updated[i] = { ...updated[i], key: e.target.value }
                        setProductForm({ ...productForm, prices: updated })
                      }}
                      className="w-28 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500"
                      placeholder="Key"
                    />
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0"
                        value={row.amount}
                        onChange={(e) => {
                          const updated = [...productForm.prices]
                          updated[i] = { ...updated[i], amount: e.target.value }
                          setProductForm({ ...productForm, prices: updated })
                        }}
                        className="w-full pl-7 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00"
                      />
                    </div>
                    <select
                      value={row.interval}
                      onChange={(e) => {
                        const updated = [...productForm.prices]
                        updated[i] = { ...updated[i], interval: e.target.value }
                        setProductForm({ ...productForm, prices: updated })
                      }}
                      className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Annual</option>
                      <option value="">One-time</option>
                    </select>
                    {productForm.prices.length > 1 && (
                      <button type="button" onClick={() => removePriceRow(i)} className="text-red-400 hover:text-red-300 px-1">
                        X
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Product Modal */}
      {modalMode === 'update_product' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Edit Product</h2>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.active}
                    onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                    className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-300">Active</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Price Modal */}
      {modalMode === 'create_price' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-1">Add Price</h2>
            <p className="text-sm text-gray-400 mb-4">For: {selectedProduct?.name}</p>
            <form onSubmit={handleCreatePrice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Price Key *</label>
                <input
                  type="text"
                  required
                  value={priceForm.key}
                  onChange={(e) => setPriceForm({ ...priceForm, key: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="e.g., monthly, annual, one_time"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Amount ($) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={priceForm.amount}
                  onChange={(e) => setPriceForm({ ...priceForm, amount: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="59.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Billing Interval</label>
                <select
                  value={priceForm.interval}
                  onChange={(e) => setPriceForm({ ...priceForm, interval: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="month">Monthly</option>
                  <option value="year">Annual</option>
                  <option value="">One-time</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Creating...' : 'Add Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Price Modal */}
      {modalMode === 'update_price' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-1">Change Price</h2>
            <p className="text-sm text-gray-400 mb-4">
              For: {selectedProduct?.name} ({priceForm.key})
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-300/80">
                Stripe prices are immutable. This will deactivate the old price and create a new one.
                Existing subscribers stay on the old price until their subscription is updated.
              </p>
            </div>
            <form onSubmit={handleUpdatePrice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">New Amount ($) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={priceForm.amount}
                  onChange={(e) => setPriceForm({ ...priceForm, amount: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="65.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Billing Interval</label>
                <select
                  value={priceForm.interval}
                  onChange={(e) => setPriceForm({ ...priceForm, interval: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="month">Monthly</option>
                  <option value="year">Annual</option>
                  <option value="">One-time</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Updating...' : 'Update Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
