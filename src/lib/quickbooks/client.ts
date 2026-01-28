import OAuthClient from 'intuit-oauth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

// QuickBooks environment configuration
const isProduction = process.env.QUICKBOOKS_ENVIRONMENT === 'production'
const QBO_BASE_URL = isProduction
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com'

// Initialize OAuth client
export function getOAuthClient() {
  return new OAuthClient({
    clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
    environment: isProduction ? 'production' : 'sandbox',
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || '',
  })
}

// QBO Connection type
export interface QBOConnection {
  id: string
  user_id: string
  qbo_realm_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  connected_at: string
  last_sync_at: string | null
  sync_status: string
  created_at: string
  updated_at: string
}

// Get user's QBO connection
export async function getQBOConnection(userId: string): Promise<QBOConnection | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('qbo_connections')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data as QBOConnection
}

// Check if token is expired
function isTokenExpired(connection: QBOConnection): boolean {
  const expiresAt = new Date(connection.token_expires_at)
  const now = new Date()
  // Add 5 minute buffer
  return expiresAt.getTime() - 5 * 60 * 1000 < now.getTime()
}

// Refresh the access token
async function refreshToken(connection: QBOConnection): Promise<QBOConnection | null> {
  try {
    const oauthClient = getOAuthClient()

    // Set the token on the client
    oauthClient.setToken({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      token_type: 'bearer',
      expires_in: 3600,
      x_refresh_token_expires_in: 8726400,
      realmId: connection.qbo_realm_id,
    })

    // Refresh the token
    const authResponse = await oauthClient.refresh()
    const token = authResponse.getJson()

    // Calculate new expiration time
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + token.expires_in)

    // Update the connection in the database
    const { data, error } = await getSupabaseAdmin()
      .from('qbo_connections')
      .update({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating token:', error)
      return null
    }

    return data as QBOConnection
  } catch (error) {
    console.error('Error refreshing QBO token:', error)
    return null
  }
}

// Get a valid token, refreshing if needed
export async function getValidToken(userId: string): Promise<string | null> {
  let connection = await getQBOConnection(userId)

  if (!connection) {
    return null
  }

  // Check if token needs refresh
  if (isTokenExpired(connection)) {
    connection = await refreshToken(connection)
    if (!connection) {
      return null
    }
  }

  return connection.access_token
}

// Make a QBO API request with auto token refresh
export async function makeQBORequest<T>(
  userId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: object
): Promise<{ data: T | null; error: string | null }> {
  const connection = await getQBOConnection(userId)

  if (!connection) {
    return { data: null, error: 'No QuickBooks connection found' }
  }

  let accessToken = connection.access_token

  // Check if token needs refresh
  if (isTokenExpired(connection)) {
    const refreshedConnection = await refreshToken(connection)
    if (!refreshedConnection) {
      return { data: null, error: 'Failed to refresh QuickBooks token' }
    }
    accessToken = refreshedConnection.access_token
  }

  const url = `${QBO_BASE_URL}/v3/company/${connection.qbo_realm_id}${endpoint}`

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('QBO API Error:', errorText)
      return { data: null, error: `QuickBooks API error: ${response.status}` }
    }

    const data = await response.json()
    return { data: data as T, error: null }
  } catch (error) {
    console.error('QBO Request Error:', error)
    return { data: null, error: 'Failed to make QuickBooks request' }
  }
}

// Log a sync operation
export async function logSync(
  userId: string,
  syncType: string,
  direction: 'to_qbo' | 'from_qbo',
  status: 'success' | 'error',
  recordId?: string,
  qboId?: string,
  errorMessage?: string
): Promise<void> {
  await getSupabaseAdmin().from('qbo_sync_log').insert({
    user_id: userId,
    sync_type: syncType,
    direction,
    record_id: recordId,
    qbo_id: qboId,
    status,
    error_message: errorMessage,
  })
}

// Update last sync timestamp
export async function updateLastSync(userId: string): Promise<void> {
  await getSupabaseAdmin()
    .from('qbo_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}
