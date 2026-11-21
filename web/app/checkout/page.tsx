"use client";

import { errorMessage } from "@/src/lib/errors";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui";
import { loadDraft, isDraftValid, BookingDraft, saveConfirmedBooking, newDraftId } from "@/src/lib/bookingDraft";
import { buildBookingDraftDocument, buildConfirmedBooking } from "@/src/lib/checkout/draftDocument";
import { normalizePromoCode, promoDiscountPercent } from "@/src/lib/checkout/promo";
import { resolveInspirationPhotoUrl } from "@/src/lib/checkout/photo";
import { attemptAccountCreation } from "@/src/lib/checkout/accountCreation";
import { createPayPalOrder } from "@/src/lib/checkout/paypal";
import { BRAID_STYLES, BraidStyle } from "@/src/lib/styles";
import { calculateBookingPrice } from "@/src/lib/pricing";

import type { PaymentProvider, PaymentChoice, PaymentStatus } from "@/src/lib/payments/types";
import { subscribeToStyles, subscribeToPresets, subscribeToAddons } from "@/src/lib/firebase/ownerService";
import type { AddonDoc } from "@/src/lib/firebase/ownerService";
import { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import { useAuth } from "@/src/providers/AuthProvider";
import { signUpUser } from "@/src/lib/firebase/auth";
import { getDb } from "@/src/lib/firebase";
import { getStorageInstance } from "@/src/lib/firebase/client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import StripeCheckout from "@/components/StripeCheckout";
import { NoBookingState } from "@/components/checkout/NoBookingState";
import { PaymentChoiceSection } from "@/components/checkout/PaymentChoiceSection";
import { PaymentMethodSection } from "@/components/checkout/PaymentMethodSection";
import { PolicyNotice } from "@/components/checkout/PolicyNotice";
import { ErrorBanner } from "@/components/checkout/ErrorBanner";
import { PromoCodeBox } from "@/components/checkout/PromoCodeBox";
import { OrderSummary } from "@/components/checkout/OrderSummary";


// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Main component ───────────────────────────────────────────────────────────

function CheckoutPageInner() {

    const { showToast } = useToast();
    const [draft, setDraft] = useState<BookingDraft | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("deposit");
    const [provider, setProvider] = useState<PaymentProvider>("stripe");
    const { user } = useAuth();
    const [flowStatus, setFlowStatus] = useState<PaymentStatus>("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [promoCode, setPromoCode] = useState("");
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [appliedDiscountPercent, setAppliedDiscountPercent] = useState(0);
    // draftId is the server-side identifier for this booking session (stable per draft load)
    const [draftId, setDraftId] = useState<string | null>(null);

    const [styles, setStyles] = useState<BraidStyle[]>([]);
    const [loadingStyles, setLoadingStyles] = useState(true);
    const [sizePresets, setSizePresets] = useState<SizePreset[]>([]);
    const [lengthPresets, setLengthPresets] = useState<LengthPreset[]>([]);
    const [addons, setAddons] = useState<AddonDoc[]>([]);

    useEffect(() => {
        const unsubStyles = subscribeToStyles((data) => {
            setStyles(data);
            setLoadingStyles(false);
        });

        const unsubPresets = subscribeToPresets((data) => {
            const sizes = data.filter(p => p.type === "size") as SizePreset[];
            const lengths = data.filter(p => p.type === "length") as LengthPreset[];
            setSizePresets(sizes);
            setLengthPresets(lengths);
        });

        const unsubAddons = subscribeToAddons((data) => {
            setAddons(data);
        });

        return () => {
            unsubStyles();
            unsubPresets();
            unsubAddons();
        };
    }, []);

    // Hydrate draft client-side (avoids SSR mismatch)
    useEffect(() => {
        const d = loadDraft();
        setDraft(d);
        setLoaded(true);
        // Generate a stable draftId for this checkout session
        if (d) {
            let id = sessionStorage.getItem("checkoutDraftId");
            if (!id) {
                id = newDraftId();
                sessionStorage.setItem("checkoutDraftId", id);
            }
            setDraftId(id);
        }
    }, []);

    if (!loaded) {
        // Skeleton while hydrating
        return (
            <main className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-pulse">
                    <div className="lg:col-span-7 space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
                        ))}
                    </div>
                    <div className="lg:col-span-5">
                        <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
                    </div>
                </div>
            </main>
        );
    }

    if (!isDraftValid(draft)) {
        return <NoBookingState />;
    }

    if (loadingStyles) {
        return (
            <main className="max-w-7xl mx-auto px-6 py-16 flex items-center justify-center min-h-[50vh]">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-icons animate-spin text-[#9F2D5C] text-4xl">autorenew</span>
                    <p className="text-slate-500 font-medium">Loading style details...</p>
                </div>
            </main>
        );
    }

    const style = styles.find((s) => s.id === draft.styleId) || BRAID_STYLES.find(s => s.id === draft.styleId) || BRAID_STYLES[0];

    // Use unified pricing utility
    const pricing = calculateBookingPrice({
        stylePrice: style.price,
        sizeId: draft.sizeId || "",
        lengthId: draft.lengthId || "",
        washingAddon: !!draft.washingAddon,
        takeDownAddon: !!draft.takeDownAddon,
        sizePresets,
        lengthPresets,
        addons,
        promo: appliedCode ? { code: appliedCode, discountPercent: appliedDiscountPercent } : null,
    });

    const amountDueNow = paymentChoice === "deposit" ? pricing.depositCents : pricing.totalCents;

    const handleApplyPromo = async () => {
        const code = normalizePromoCode(promoCode);
        if (!code) return;

        setErrorMsg(null);
        try {
            const { doc, getDoc } = await import("firebase/firestore");
            const codeRef = doc(getDb(), "codes", code);
            const codeSnap = await getDoc(codeRef);

            const pct = promoDiscountPercent(codeSnap.exists() ? codeSnap.data() : null);
            if (pct !== null) {
                setAppliedCode(code);
                setAppliedDiscountPercent(pct);
                showToast?.(`${code} applied! ${pct}% discount added.`, "success");
            } else {
                setErrorMsg("Invalid or expired promotional code.");
            }
        } catch (err) {
            console.error("Error validating promo code:", err);
            setErrorMsg("Error validating code. Please try again.");
        }
    };

    // ── Persist draft to Firestore (server needs it before payment) ───────────
    const persistDraftToFirestore = async (id: string, providerName: "stripe" | "paypal"): Promise<void> => {
        if (!draft) {
            console.warn("[Checkout] No draft found to persist.");
            return;
        }

        const db = getDb();

        console.log("[Checkout] Persisting draft...", {
            id,
            providerName,
            isAuthenticated: !!user,
            uid: user?.uid
        });

        try {
            // 1. Create the account first (if the visitor asked for one) so the draft can be linked to it.
            const newUserId = await attemptAccountCreation(!!user, draft, {
                signUp: signUpUser,
                writeProfile: (uid, d) => setDoc(doc(db, "users", uid), {
                    userId: uid,
                    email: d.email,
                    displayName: d.name,
                    phone: d.phone,
                    role: "client",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }),
            }).catch(e => {
                setErrorMsg(e.message);
                throw e;
            });

            // 2. Persist the updated draft state
            const photoUrl = await resolveInspirationPhotoUrl(draft.photoPreview, id, {
                upload: (path, dataUrl, contentType) =>
                    uploadString(ref(getStorageInstance(), path), dataUrl, "data_url", { contentType }),
                getUrl: (path) => getDownloadURL(ref(getStorageInstance(), path)),
            });

            await setDoc(doc(db, "bookingDrafts", id), {
                ...buildBookingDraftDocument({
                    draft,
                    id,
                    userId: user?.uid ?? newUserId,
                    style,
                    sizePresets,
                    lengthPresets,
                    photoUrl,
                    amountDueCents: amountDueNow,
                    paymentChoice,
                    promoCode: appliedCode,
                    provider: providerName,
                    pricing,
                }),
                updatedAt: serverTimestamp(),
            });

            // 3. Save to localStorage for success page
            saveConfirmedBooking(buildConfirmedBooking({
                draft,
                id,
                style,
                sizePresets,
                lengthPresets,
                amountDueCents: amountDueNow,
                paymentChoice,
                provider: providerName,
            }));
        } catch (err: unknown) {
            console.error("[Checkout] Fatal draft persistence error:", err);
            setFlowStatus("failed");
            throw err;
        }
    };


    // ── PayPal redirect handler ───────────────────────────────────────────────
    // After PayPal capture, the server finalizes the booking — client just redirects.
    const handlePayPalRedirect = async () => {
        if (!draftId || !draft) {
            setErrorMsg("Session expired. Please restart your booking.");
            return;
        }
        setFlowStatus("creating");
        setErrorMsg(null); // Clear previous errors

        try {
            await persistDraftToFirestore(draftId, "paypal");
            const approvalLink = await createPayPalOrder({ draftId, choice: paymentChoice, origin: window.location.origin });

            window.location.href = approvalLink;
        } catch (err: unknown) {
            console.error("[Checkout] PayPal initiation error:", err);
            setFlowStatus("failed");
            setErrorMsg(errorMessage(err, "Failed to initialize PayPal. Please try again."));
        }
    };

    const handleStripeBeforeRedirect = async () => {
        if (!draftId) return;
        await persistDraftToFirestore(draftId, "stripe");
    };

    return (
        <main className="max-w-7xl mx-auto px-6 py-12">
            {/* Back link */}
            <Link
                href="/book"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-[#9F2D5C] transition-colors font-bold uppercase tracking-widest text-xs mb-12"
            >
                <span className="material-icons text-sm">arrow_back</span>
                Back to Booking
            </Link>

            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-12">
                Complete Your Booking
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                {/* ── Left: Payment options ──────────────────────────────────── */}
                <div className="lg:col-span-7 space-y-8">

                    {/* Payment amount choice */}
                    <PaymentChoiceSection
                        paymentChoice={paymentChoice}
                        onChange={setPaymentChoice}
                        depositCents={pricing.depositCents}
                        totalCents={pricing.totalCents}
                    />

                    {/* Payment method */}
                    <PaymentMethodSection provider={provider} onSelect={setProvider} />

                    {/* Policy notice */}
                    <PolicyNotice />

                    {/* Error banner */}
                    {(flowStatus === "failed" || errorMsg) && (
                        <ErrorBanner message={errorMsg} onDismiss={() => { setFlowStatus("idle"); setErrorMsg(null); }} />
                    )}
                </div>

                {/* ── Right: Order summary (sticky) ─────────────────────────── */}
                <div className="lg:col-span-5 lg:sticky lg:top-28">
                    <OrderSummary
                        style={style}
                        draft={draft}
                        pricing={pricing}
                        sizePresets={sizePresets}
                        lengthPresets={lengthPresets}
                        addons={addons}
                        paymentChoice={paymentChoice}
                        amountDueNow={amountDueNow}
                        promoBox={
                            <PromoCodeBox
                                promoCode={promoCode}
                                appliedCode={appliedCode}
                                onChange={setPromoCode}
                                onApply={handleApplyPromo}
                                onRemove={() => { setAppliedCode(null); setAppliedDiscountPercent(0); setPromoCode(""); }}
                            />
                        }
                    >
                        {provider === "paypal" ? (
                            /* ── PayPal: redirect to PayPal approval page ─── */
                            <button
                                id="paypal-pay-button"
                                onClick={handlePayPalRedirect}
                                disabled={flowStatus === "creating"}
                                className="w-full py-6 rounded-full font-bold text-slate-900 bg-[#FFC439] hover:bg-[#f0b429] shadow-xl shadow-yellow-400/30 transition-all duration-300 flex items-center justify-center gap-3 group active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {flowStatus === "creating" ? (
                                    <>
                                        <span className="material-icons animate-spin text-lg">autorenew</span>
                                        <span>Redirecting to PayPal…</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons text-lg">account_balance_wallet</span>
                                        <span>Pay ${((amountDueNow) / 100).toFixed(2)} with PayPal</span>
                                    </>
                                )}
                            </button>
                        ) : provider === "stripe" ? (
                            /* ── Stripe: redirect to Stripe Hosted Checkout ─ */
                            <StripeCheckout
                                amountCents={amountDueNow}
                                sessionType="booking"
                                draftId={draftId ?? undefined}
                                choice={paymentChoice}
                                customerEmail={draft.email}
                                onBeforeRedirect={handleStripeBeforeRedirect}
                                onError={(err) => {
                                    setFlowStatus("failed");
                                    setErrorMsg(err);
                                }}
                            />
                        ) : null}
                    </OrderSummary>
                </div>
            </div>
        </main>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <span className="material-icons animate-spin text-[#9F2D5C] text-4xl">autorenew</span>
            </div>
        }>
            <CheckoutPageInner />
        </Suspense>
    );
}
