'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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

interface AuditEntry {
  id: string
  admin_email: string
  action: string
  target_type: string
  target_id: string
  details: Record<string, unknown>
  created_at: string
}

type ModalMode = 'create_product' | 'update_product' | 'create_price' | 'update_price' | null

export default function AdminPricingPage() {
  const [products, setProducts] = useState<StripeProduct[]>([])
  const [prices, setPrices] = useState<StripePrice[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
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

  // Selected product for context
  const [selectedProduct, setSelectedProduct] = useState<StripeProduct | null>(null)

  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

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
      const data = await callApi({ action: 'list_products' })
      setProducts(data.products || [])
      setPrices(data.prices || [])
      setIsAdmin(true)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load'
      if (message.includes('Forbidden') || message.includes('403')) {
        setIsAdmin(false)
        setError('You do not have platform admin access.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }, [callApi])

  const fetchAuditLogs = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return

      // Audit logs are in Supabase — read via service role is not available client-side,
      // so we read through the anon client (RLS blocks this). Show a note instead.
      setAuditLogs([])
    } catch {
      // Audit logs not accessible from client — expected
    }
  }, [getToken])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/auth/login')
      return
    }
    fetchProducts()
  }, [authLoading, user, router, fetchProducts])

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

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin || error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">{error || 'Platform admin access required.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stripe Price Management</h1>
          <p className="text-gray-500 mt-1">
            Manage products and prices in your Stripe account
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowAuditLog(!showAuditLog)
              if (!showAuditLog) fetchAuditLogs()
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            {showAuditLog ? 'Hide' : 'Show'} Audit Log
          </button>
          <button
            onClick={openCreateProduct}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>+</span> New Product
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Products</p>
          <p className="text-2xl font-bold text-gray-900">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Active Prices</p>
          <p className="text-2xl font-bold text-green-600">
            {prices.filter((p) => p.active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Inactive Products</p>
          <p className="text-2xl font-bold text-gray-400">
            {products.filter((p) => !p.active).length}
          </p>
        </div>
      </div>

      {/* Audit Log Panel */}
      {showAuditLog && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-amber-800 mb-2">Audit Log</h3>
          <p className="text-sm text-amber-700">
            Audit logs are stored in the <code className="bg-amber-100 px-1 rounded">stripe_audit_logs</code> table
            and accessible via Supabase dashboard (Table Editor) or SQL Editor. Client-side access is
            blocked by RLS for security.
          </p>
          <p className="text-xs text-amber-600 mt-2">
            Query: <code className="bg-amber-100 px-1 rounded">SELECT * FROM stripe_audit_logs ORDER BY created_at DESC LIMIT 50;</code>
          </p>
        </div>
      )}

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 mb-4">
            No ToolTime products exist in Stripe yet. Create one or run the setup-products endpoint first.
          </p>
          <button
            onClick={openCreateProduct}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
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
                className={`bg-white rounded-xl border overflow-hidden ${!product.active ? 'opacity-60' : ''}`}
              >
                {/* Product header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-xs text-gray-500">
                        {product.tooltime_id} &middot; {product.stripe_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openCreatePrice(product)}
                      className="text-sm px-3 py-1 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                    >
                      + Price
                    </button>
                    <button
                      onClick={() => openEditProduct(product)}
                      className="text-sm px-3 py-1 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Product description */}
                {product.description && (
                  <div className="px-6 py-2 text-sm text-gray-500 border-b">
                    {product.description}
                  </div>
                )}

                {/* Prices table */}
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
                    <tbody className="divide-y divide-gray-100">
                      {productPrices.map((price) => (
                        <tr key={price.stripe_id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">
                            {price.tooltime_key}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-900">
                            {formatAmount(price.unit_amount)}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-500">
                            {price.recurring
                              ? `per ${price.recurring.interval}`
                              : 'One-time'}
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-400 font-mono">
                            {price.stripe_id}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => openUpdatePrice(product, price)}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Change Price
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-4 text-sm text-gray-400">No active prices</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Modals ─── */}

      {/* Create Product Modal */}
      {modalMode === 'create_product' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Product</h2>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ToolTime ID *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.tooltime_id}
                  onChange={(e) =>
                    setProductForm({ ...productForm, tooltime_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., starter, jenny_pro, extra_worker"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Snake_case identifier used in NEXT_PUBLIC_STRIPE_PRICES
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., ToolTime Pro — Starter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({ ...productForm, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Price rows */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Prices *</label>
                  <button
                    type="button"
                    onClick={addPriceRow}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
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
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      placeholder="Key"
                    />
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2 text-gray-400">$</span>
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
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="month">Monthly</option>
                      <option value="year">Annual</option>
                      <option value="">One-time</option>
                    </select>
                    {productForm.prices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePriceRow(i)}
                        className="text-red-400 hover:text-red-600 px-1"
                      >
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Product</h2>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({ ...productForm, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.active}
                    onChange={(e) =>
                      setProductForm({ ...productForm, active: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Add Price</h2>
            <p className="text-sm text-gray-500 mb-4">
              For: {selectedProduct?.name}
            </p>
            <form onSubmit={handleCreatePrice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Key *
                </label>
                <input
                  type="text"
                  required
                  value={priceForm.key}
                  onChange={(e) => setPriceForm({ ...priceForm, key: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., monthly, annual, one_time"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={priceForm.amount}
                  onChange={(e) => setPriceForm({ ...priceForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="59.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Interval
                </label>
                <select
                  value={priceForm.interval}
                  onChange={(e) => setPriceForm({ ...priceForm, interval: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Change Price</h2>
            <p className="text-sm text-gray-500 mb-4">
              For: {selectedProduct?.name} ({priceForm.key})
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-700">
                Stripe prices are immutable. This will deactivate the old price and create a new one.
                Existing subscribers stay on the old price until their subscription is updated.
              </p>
            </div>
            <form onSubmit={handleUpdatePrice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Amount ($) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={priceForm.amount}
                  onChange={(e) => setPriceForm({ ...priceForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="65.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Interval
                </label>
                <select
                  value={priceForm.interval}
                  onChange={(e) => setPriceForm({ ...priceForm, interval: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
