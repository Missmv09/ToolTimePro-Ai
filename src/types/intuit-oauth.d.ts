declare module 'intuit-oauth' {
  interface OAuthClientConfig {
    clientId: string
    clientSecret: string
    environment: 'sandbox' | 'production'
    redirectUri: string
    logging?: boolean
  }

  interface Token {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
    x_refresh_token_expires_in: number
    realmId?: string
  }

  interface AuthResponse {
    getJson(): Token
    json: Token
    token: Token
  }

  interface AuthorizeUriOptions {
    scope: string[]
    state?: string
  }

  class OAuthClient {
    constructor(config: OAuthClientConfig)
    authorizeUri(options: AuthorizeUriOptions): string
    createToken(url: string): Promise<AuthResponse>
    refresh(): Promise<AuthResponse>
    setToken(token: Partial<Token>): void
    getToken(): Token
    isAccessTokenValid(): boolean
  }

  export default OAuthClient
}
