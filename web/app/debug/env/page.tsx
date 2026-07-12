import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Environment Diagnostics | Misericordia Hair Designs",
  robots: "noindex, nofollow",
};

export default async function DebugEnvPage() {
  // --- Firebase Checks ---
  const fbKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const fbKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;
  const googleADC = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  let firebaseMode = "None";
  if (fbKeyBase64) firebaseMode = "Service Account (Base64)";
  else if (fbKey) firebaseMode = "Service Account (JSON)";
  else if (googleADC) firebaseMode = "Google ADC Path";

  // --- Stripe Checks ---
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripePresent = !!stripeKey;
  const stripePrefix = stripeKey ? stripeKey.substring(0, 8) : "N/A";
  const stripeValidPrefix = stripeKey?.startsWith("sk_test_") || stripeKey?.startsWith("sk_live_");

  // --- PayPal Checks ---
  const paypalId = process.env.PAYPAL_CLIENT_ID;
  const paypalSecret = process.env.PAYPAL_CLIENT_SECRET;

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gray-900 p-6 text-white border-b border-gray-800">
          <h1 className="text-2xl font-bold">Environment Diagnostics</h1>
          <p className="text-gray-400 mt-1">Verification of server-side credentials (Dev Only)</p>
        </div>

        <div className="p-6 space-y-8">
          {/* Firebase Section */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${firebaseMode !== "None" ? "bg-green-500" : "bg-red-500"}`} />
              Firebase Admin SDK
            </h2>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-sm font-medium text-gray-500">Credential Mode</div>
              <div className="text-sm font-semibold">{firebaseMode}</div>
              
              <div className="text-sm font-medium text-gray-500">PROJECT_ID</div>
              <div className="text-sm">{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "(default)"}</div>
            </div>
          </section>

          {/* Stripe Section */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${stripePresent && stripeValidPrefix ? "bg-green-500" : "bg-red-500"}`} />
              Stripe Payments
            </h2>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-sm font-medium text-gray-500">Secret Key Present</div>
              <div className="text-sm font-semibold">{stripePresent ? "Yes" : "No"}</div>
              
              <div className="text-sm font-medium text-gray-500">Key Prefix</div>
              <div className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200">{stripePrefix}...</div>

              <div className="text-sm font-medium text-gray-500">Valid Format</div>
              <div className={`text-sm font-semibold ${stripeValidPrefix ? "text-green-600" : "text-red-600"}`}>
                {stripeValidPrefix ? "Valid (sk_test/sk_live)" : "Invalid"}
              </div>
            </div>
          </section>

          {/* PayPal Section */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${paypalId && paypalSecret ? "bg-green-500" : "bg-red-500"}`} />
              PayPal Payments
            </h2>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-sm font-medium text-gray-500">Client ID Present</div>
              <div className="text-sm">{paypalId ? "Yes" : "No"}</div>

              <div className="text-sm font-medium text-gray-500">Secret Present</div>
              <div className="text-sm">{paypalSecret ? "Yes" : "No"}</div>
            </div>
          </section>
        </div>

        <div className="p-6 bg-yellow-50 border-t border-yellow-100 italic text-sm text-yellow-800">
          Note: This page only checks for the existence and basic format of environment variables. 
          It does not verify the actual credentials with the providers. No sensitive values are displayed.
        </div>
      </div>
    </div>
  );
}
