/**
 * PayPal Server-Side Singleton
 * 
 * Handles authentication (OAuth2), order creation, and capture.
 * Fixes "401 Unauthorized" issues by automatically trimming keys, 
 * resolving them dynamically to avoid load-time race conditions,
 * and managing access token lifecycle.
 */

interface PayPalToken {
    access_token: string;
    expires_at: number;
}

class PayPalService {
    private static instance: PayPalService;
    private tokenCache: PayPalToken | null = null;

    private constructor() {
        // Initialization without capturing environment variables prematurely.
    }

    public static getInstance(): PayPalService {
        if (!PayPalService.instance) {
            PayPalService.instance = new PayPalService();
        }
        return PayPalService.instance;
    }

    private getCredentials() {
        const clientId = (process.env.PAYPAL_CLIENT_ID || "").trim();
        const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || "").trim();
        const mode = (process.env.PAYPAL_MODE || "sandbox").trim().toLowerCase();
        
        // Default to sandbox unless specified otherwise
        const apiBase = mode === "live" 
            ? "https://api-m.paypal.com" 
            : "https://api-m.sandbox.paypal.com";
            
        return { clientId, clientSecret, mode, apiBase };
    }

    /**
     * Generates or retrieves a cached access token from PayPal
     */
    private async getAccessToken(): Promise<string> {
        // Use cached token if valid (with 60s buffer)
        if (this.tokenCache && Date.now() < this.tokenCache.expires_at - 60000) {
            return this.tokenCache.access_token;
        }

        const { clientId, clientSecret, apiBase } = this.getCredentials();

        if (!clientId || !clientSecret) {
            throw new Error("PayPal configuration error: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing.");
        }

        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        
        console.log(`[PayPal] Fetching new access token from ${apiBase}...`);
        
        const response = await fetch(`${apiBase}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            if (response.status === 401) {
                console.error("[PayPal] Auth failed! The specific Client ID and Secret combination is invalid or revoked by PayPal.");
                throw new Error("PayPal configuration error: Invalid Client ID or Secret. Please verify your PayPal App credentials in .env.local");
            }

            console.error("[PayPal] Token request failed:", response.status, errorData);
            throw new Error(`PayPal auth failed: ${response.status} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        this.tokenCache = {
            access_token: data.access_token,
            expires_at: Date.now() + (data.expires_in * 1000),
        };

        return data.access_token;
    }

    /**
     * Generic PayPal REST API request helper
     */
    public async request(endpoint: string, options: RequestInit = {}) {
        const token = await this.getAccessToken();
        const { apiBase } = this.getCredentials();
        const url = `${apiBase}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`[PayPal] API Error (${endpoint}):`, response.status, errorData);
            throw new Error(errorData.message || `PayPal API error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Create a new PayPal order
     */
    public async createOrder(amount: number, currency: string = "USD", description: string = "Booking Deposit") {
        return this.request("/v2/checkout/orders", {
            method: "POST",
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [{
                    amount: {
                        currency_code: currency,
                        value: (amount / 100).toFixed(2),
                    },
                    description,
                }],
            }),
        });
    }

    /**
     * Capture an approved PayPal order
     */
    public async captureOrder(paypalOrderId: string) {
        return this.request(`/v2/checkout/orders/${paypalOrderId}/capture`, {
            method: "POST",
        });
    }
}

export const paypalServer = PayPalService.getInstance();
