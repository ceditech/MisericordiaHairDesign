"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui";
import { loadDraft, clearDraft, isDraftValid, BookingDraft, saveConfirmedBooking } from "@/lib/bookingDraft";
import { BRAID_STYLES, BraidStyle } from "@/lib/styles";
import { calculateBookingPrice, formatCents } from "@/lib/pricing";

import { CURRENCY } from "@/lib/payments/constants";
import type { PaymentProvider, PaymentChoice, PaymentStatus } from "@/lib/payments/types";
import { subscribeToStyles, subscribeToPresets, subscribeToAddons } from "@/src/lib/firebase/ownerService";
import { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import { DEPOSIT_POLICY, CANCELLATION_POLICY, PRICE_NOTE_POLICY } from "@/src/content/legal";
import { useAuth } from "@/src/providers/AuthProvider";
import { signUpUser } from "@/src/lib/firebase/auth";
import { getDb } from "@/src/lib/firebase";
import { getStorageInstance } from "@/src/lib/firebase/client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import PayPalCheckout from "@/components/PayPalCheckout";
import StripeCheckout from "@/components/StripeCheckout";


// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Empty state ──────────────────────────────────────────────────────────────

function NoBookingState() {
    return (
        <main className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 py-20">
            <div className="w-20 h-20 rounded-3xl bg-[#a319c5]/10 flex items-center justify-center mb-8 shadow-xl shadow-[#a319c5]/10">
                <span className="material-icons text-[#a319c5] text-3xl">calendar_today</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">No Booking Found</h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-10 leading-relaxed">
                It looks like you haven&apos;t completed a booking yet, or your session expired.
                Head back to the booking page to get started.
            </p>
            <Link
                href="/book"
                className="bg-[#a319c5] hover:bg-[#8b15a8] text-white font-bold px-10 py-5 rounded-full shadow-2xl shadow-[#a319c5]/30 transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-3"
            >
                <span className="material-icons text-base">arrow_back</span>
                Start a Booking
            </Link>
        </main>
    );
}

// ─── Payment method card ──────────────────────────────────────────────────────

interface MethodCardProps {
    provider: PaymentProvider;
    selected: boolean;
    onSelect: () => void;
    icon: string;
    label: string;
    description: string;
}

function MethodCard({ provider, selected, onSelect, icon, label, description }: MethodCardProps) {
    return (
        <button
            id={`payment-method-${provider}`}
            onClick={onSelect}
            className={`w-full text-left flex items-center gap-5 p-6 rounded-2xl border-2 transition-all ${selected
                ? "border-[#a319c5] bg-[#a319c5]/5 dark:bg-[#a319c5]/10"
                : "border-slate-100 dark:border-slate-700 hover:border-[#a319c5]/40 bg-white dark:bg-slate-800"
                }`}
            aria-pressed={selected}
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${selected ? "bg-[#a319c5] text-white shadow-lg shadow-[#a319c5]/30" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                <span className="material-icons text-xl">{icon}</span>
            </div>
            <div className="flex-1">
                <p className={`font-bold text-base transition-colors ${selected ? "text-[#a319c5]" : "text-slate-900 dark:text-white"}`}>{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? "border-[#a319c5] bg-[#a319c5]" : "border-slate-300 dark:border-slate-600"}`}>
                {selected && <span className="material-icons text-white text-[12px]">check</span>}
            </div>
        </button>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

function CheckoutPageInner() {
    const router = useRouter();

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
    const hasRedirected = useRef(false);
    // draftId is the server-side identifier for this booking session (stable per draft load)
    const [draftId, setDraftId] = useState<string | null>(null);

    const [styles, setStyles] = useState<BraidStyle[]>([]);
    const [loadingStyles, setLoadingStyles] = useState(true);
    const [sizePresets, setSizePresets] = useState<SizePreset[]>([]);
    const [lengthPresets, setLengthPresets] = useState<LengthPreset[]>([]);
    const [addons, setAddons] = useState<any[]>([]);

    useEffect(() => {
        const unsubStyles = subscribeToStyles((data) => {
            setStyles(data);
            setLoadingStyles(false);
        });

        const unsubPresets = subscribeToPresets((data) => {
            const sizes = data.filter(p => (p as any).type === "size") as SizePreset[];
            const lengths = data.filter(p => (p as any).type === "length") as LengthPreset[];
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
                id = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
                    <span className="material-icons animate-spin text-[#a319c5] text-4xl">autorenew</span>
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
        promoCode: appliedCode,
        discountPercent: (window as any)._appliedCodeData?.discountPercent || 10
    } as any);

    const amountDueNow = paymentChoice === "deposit" ? pricing.depositCents : pricing.totalCents;

    const amountLabel = formatCents(pricing.totalCents);

    const handleApplyPromo = async () => {
        const code = promoCode.trim().toUpperCase();
        if (!code) return;

        setErrorMsg(null);
        try {
            const { doc, getDoc } = await import("firebase/firestore");
            const codeRef = doc(getDb(), "codes", code);
            const codeSnap = await getDoc(codeRef);

            if (codeSnap.exists() && codeSnap.data().active) {
                const data = codeSnap.data();
                setAppliedCode(code);
                // Store metadata about the code if needed for pricing
                (window as any)._appliedCodeData = data;
                showToast?.(`${code} applied! ${data.discountPercent}% discount added.`, "success");
            } else {
                // Fallback for legacy hardcoded codes if any, or just fail
                if (code === "AFFILIATE10" || code.startsWith("DB-AFF-")) {
                     setAppliedCode(code);
                     showToast?.(`${code} applied! 10% discount added.`, "success");
                } else {
                    setErrorMsg("Invalid or expired promotional code.");
                }
            }
        } catch (err) {
            console.error("Error validating promo code:", err);
            setErrorMsg("Error validating code. Please try again.");
        }
    };

    // ── Persist draft to Firestore (server needs it before payment) ───────────
    const persistDraftToFirestore = async (id: string, providerName: string): Promise<void> => {
        if (!draft) {
            console.warn("[Checkout] No draft found to persist.");
            return;
        }

        const db = getDb();
        let currentUserId = user?.uid ?? null;

        console.log("[Checkout] Persisting draft...", {
            id,
            providerName,
            isAuthenticated: !!user,
            uid: user?.uid
        });

        // 1. Separate Auth Logic
        const attemptAccountCreation = async () => {
            if (!user && draft.createAccount && draft.password) {
                console.log("[Checkout] Attempting automatic account creation...");
                try {
                    const userCredential = await signUpUser(draft.email, draft.password);
                    const newUser = userCredential.user;
                    currentUserId = newUser.uid;

                    console.log("[Checkout] Account created, writing user profile...", { uid: newUser.uid });
                    await setDoc(doc(db, "users", newUser.uid), {
                        userId: newUser.uid,
                        email: draft.email,
                        displayName: draft.name,
                        phone: draft.phone,
                        role: "client",
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                } catch (err: any) {
                    if (err.code === "auth/email-already-in-use") {
                        console.warn("[Checkout] Email in use. Proceeding as guest linked to this email.");
                        // Handle gracefully: we don't set currentUserId, but we don't block the booking.
                    } else if (err.code === "auth/invalid-email") {
                        throw new Error("The email provided is invalid. Please double-check it.");
                    } else {
                        console.error("[Checkout] Account creation failed:", err.code, err.message);
                        // We continue with guest flow but log it
                    }
                }
            }
        };

        try {
            // Run account creation (don't let it block the entire persistence if it has minor issues, 
            // but we await it so we have currentUserId if it succeeds)
            await attemptAccountCreation().catch(e => {
                setErrorMsg(e.message);
                throw e; 
            });

            // 2. Persist the updated draft state
            const emailToUse = draft.email;
            const phoneToUse = draft.phone;

            let photoUrl = null;
            if (draft.photoPreview && draft.photoPreview.startsWith("data:image")) {
                try {
                    console.log("[Checkout] Uploading inspiration photo...", { draftId: id });
                    // Dynamically detect MIME type and extension from the data URL
                    const mimeType = draft.photoPreview.match(/data:([^;]+);/)?.[1] || "image/jpeg";
                    const extension = mimeType.split("/")[1] || "jpg";
                    
                    const storage = getStorageInstance();
                    const photoRef = ref(storage, `bookingDrafts/${id}/inspiration_${Date.now()}.${extension}`);
                    
                    const metadata = {
                        contentType: mimeType,
                    };

                    const uploadPromise = uploadString(photoRef, draft.photoPreview, "data_url", metadata);
                    const timeoutPromise = new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error("Inspiration Upload Timeout (15s)")), 15000)
                    );
                    
                    await Promise.race([uploadPromise, timeoutPromise]);
                    photoUrl = await getDownloadURL(photoRef);
                    console.log("[Checkout] Photo uploaded successfully:", photoUrl);
                } catch (uploadErr) {
                    console.error("[Checkout] Photo upload failed:", uploadErr);
                    // We don't throw here to avoid blocking the entire booking if only the photo fails,
                    // but we log it clearly.
                }
            } else if (draft.photoPreview && draft.photoPreview.startsWith("http")) {
                photoUrl = draft.photoPreview;
            }

            const safeDraft = { ...draft };
            delete (safeDraft as any).photoPreview;
            delete (safeDraft as any).inspirationPhoto;

            // Clean undefined values
            Object.keys(safeDraft).forEach(key => {
                if ((safeDraft as any)[key] === undefined) {
                    delete (safeDraft as any)[key];
                }
            });

            await setDoc(doc(db, "bookingDrafts", id), {
                ...safeDraft,
                id,
                userId: currentUserId || null,
                styleId: draft.styleId || null,
                styleName: style.name || null,
                sizeName: sizePresets.find(s => s.id === draft.sizeId)?.label || null,
                lengthName: lengthPresets.find(l => l.id === draft.lengthId)?.label || null,
                date: draft.date || null,
                time: draft.time || null,
                clientName: draft.name || null,
                clientEmail: emailToUse || null,
                clientPhone: phoneToUse || null,
                photoUrl: photoUrl || null,
                amountPaidLabel: formatCents(amountDueNow),
                paymentChoice,
                promoCode: appliedCode || null,
                provider: providerName as any,
                pricing: {
                    baseCents: pricing.baseCents,
                    subtotalCents: pricing.subtotalCents,
                    discountCents: pricing.discountCents,
                    taxCents: pricing.taxCents,
                    totalCents: pricing.totalCents,
                    depositCents: pricing.depositCents,
                    amountDueCents: amountDueNow,
                },
                updatedAt: serverTimestamp(),
            });

            // 3. Save to localStorage for success page
            saveConfirmedBooking({
                styleName: style.name,
                sizeName: sizePresets.find(s => s.id === draft.sizeId)?.label || "Medium",
                lengthName: lengthPresets.find(l => l.id === draft.lengthId)?.label || "Shoulder",
                washingAddon: !!draft.washingAddon,
                takeDownAddon: !!draft.takeDownAddon,
                duration: style.duration,
                price: style.price,
                date: draft.date,
                time: draft.time,
                clientName: draft.name,
                clientEmail: emailToUse,
                clientPhone: phoneToUse,
                amountPaidLabel: formatCents(amountDueNow),
                paymentChoice,
                provider: providerName as any,
                draftId: id
            });
        } catch (err: any) {
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
            const res = await fetch("/api/payments/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionType: "booking",
                    draftId,
                    choice: paymentChoice,
                    returnUrl: `${window.location.origin}/booking/success?provider=paypal&draftId=${draftId}`,
                    cancelUrl: `${window.location.origin}/checkout?cancelled=true`,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                if (res.status === 401) {
                    throw new Error("PayPal configuration error (Incomplete Credentials). Check your environment variables.");
                }
                throw new Error(data.error ?? `Server error (${res.status})`);
            }

            if (!data.approvalLink) {
                throw new Error("No PayPal approval link returned by server.");
            }

            window.location.href = data.approvalLink;
        } catch (err: any) {
            console.error("[Checkout] PayPal initiation error:", err);
            setFlowStatus("failed");
            setErrorMsg(err.message ?? "Failed to initialize PayPal. Please try again.");
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
                className="inline-flex items-center gap-2 text-slate-400 hover:text-[#a319c5] transition-colors font-bold uppercase tracking-widest text-xs mb-12"
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
                    <section>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-5">
                            Payment Option
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Deposit */}
                            <button
                                id="choice-deposit"
                                onClick={() => setPaymentChoice("deposit")}
                                className={`relative p-7 rounded-[1.5rem] border-2 text-left transition-all ${paymentChoice === "deposit"
                                    ? "border-[#a319c5] bg-[#a319c5]/5 dark:bg-[#a319c5]/10"
                                    : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#a319c5]/40"
                                    }`}
                                aria-pressed={paymentChoice === "deposit"}
                            >
                                {paymentChoice === "deposit" && (
                                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#a319c5] flex items-center justify-center">
                                        <span className="material-icons text-white text-[14px]">check</span>
                                    </div>
                                )}
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Deposit</p>
                                <p className="text-3xl font-black text-[#a319c5] mb-1">{formatCents(pricing.depositCents)}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Secure your spot now. Non-refundable, applied to your total.
                                </p>
                            </button>

                            {/* Full amount */}
                            <button
                                id="choice-full"
                                onClick={() => setPaymentChoice("full")}
                                className={`relative p-7 rounded-[1.5rem] border-2 text-left transition-all ${paymentChoice === "full"
                                    ? "border-[#a319c5] bg-[#a319c5]/5 dark:bg-[#a319c5]/10"
                                    : "border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#a319c5]/40"
                                    }`}
                                aria-pressed={paymentChoice === "full"}
                            >
                                {paymentChoice === "full" && (
                                    <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#a319c5] flex items-center justify-center">
                                        <span className="material-icons text-white text-[14px]">check</span>
                                    </div>
                                )}
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Pay in Full</p>
                                <p className="text-3xl font-black text-[#a319c5] mb-1">{amountLabel}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Pay the full service cost today. No balance due at appointment.
                                </p>
                            </button>
                        </div>
                    </section>

                    {/* Payment method */}
                    <section>
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-5">
                            Payment Method
                        </h2>
                        <div className="space-y-3">
                            <MethodCard
                                provider="stripe"
                                selected={provider === "stripe"}
                                onSelect={() => setProvider("stripe")}
                                icon="credit_card"
                                label="Credit / Debit Card"
                                description="Visa, Mastercard, Amex — powered by Stripe"
                            />
                            <MethodCard
                                provider="paypal"
                                selected={provider === "paypal"}
                                onSelect={() => setProvider("paypal")}
                                icon="account_balance_wallet"
                                label="PayPal"
                                description="Pay with your PayPal balance or linked card"
                            />
                        </div>

                        {/* Security badges */}
                        <div className="flex flex-wrap gap-3 mt-5">
                            {["🔒 SSL Encrypted", "✓ Stripe Secured", "✓ PayPal Buyer Protection"].map((badge) => (
                                <span key={badge} className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1.5 rounded-full">
                                    {badge}
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* Policy notice */}
                    <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-[1.5rem] p-6 text-sm text-amber-800 dark:text-amber-300 leading-relaxed space-y-2">
                        <div className="flex items-center gap-2 font-bold mb-1">
                            <span className="material-icons text-base">info</span>
                            Cancellation Policy
                        </div>
                        <p>
                            {DEPOSIT_POLICY}
                        </p>
                        <p>
                            {CANCELLATION_POLICY}
                        </p>
                        <div className="flex items-center gap-2 font-bold mb-1">
                            <span className="material-icons text-base">info</span>
                            Price Note Policy
                        </div>
                        <p>
                            {PRICE_NOTE_POLICY}
                        </p>
                    </section>

                    {/* Error banner */}
                    {(flowStatus === "failed" || errorMsg) && (
                        <div className="flex items-center gap-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-6 py-5">
                            <span className="material-icons text-red-500 text-xl">error_outline</span>
                            <p className="text-sm text-red-600 dark:text-red-400 font-semibold flex-1">
                                {errorMsg ?? "Something went wrong. Please try again."}
                            </p>
                            <button
                                onClick={() => { setFlowStatus("idle"); setErrorMsg(null); }}
                                className="text-red-400 hover:text-red-600 transition-colors"
                                aria-label="Dismiss error"
                            >
                                <span className="material-icons text-base">close</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Right: Order summary (sticky) ─────────────────────────── */}
                <div className="lg:col-span-5 lg:sticky lg:top-28">
                    <div className="bg-surface rounded-[2rem] p-10 border border-border shadow-xl shadow-brand-primary/5">
                        <h2 className="text-xl font-bold text-text-primary mb-8">Order Summary</h2>

                        {/* Service */}
                        <div className="space-y-4 pb-6 border-b border-border">
                            <div className="flex justify-between">
                                <div>
                                    <p className="font-bold text-text-primary">{style.name}</p>
                                    <p className="text-xs text-text-muted mt-0.5">{style.duration}</p>
                                </div>
                                <p className="font-bold text-text-primary text-right">{style.price}</p>
                            </div>
                        </div>

                        {/* Promo Code Input */}
                        {!appliedCode ? (
                            <div className="mt-8 pt-8 border-t border-border">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Promo Code"
                                        value={promoCode}
                                        onChange={(e) => setPromoCode(e.target.value)}
                                        className="flex-1 bg-white/5 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#a319c5] transition-colors"
                                    />
                                    <button
                                        onClick={handleApplyPromo}
                                        disabled={!promoCode.trim()}
                                        className="bg-[#a319c5]/20 hover:bg-[#a319c5]/30 text-[#a319c5] px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-8 pt-8 border-t border-border flex justify-between items-center">
                                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                    <span className="material-icons text-xs">check_circle</span>
                                    Code Applied
                                </div>
                                <button
                                    onClick={() => { setAppliedCode(null); setPromoCode(""); }}
                                    className="text-text-muted hover:text-text-primary text-[10px] font-black uppercase tracking-widest underline underline-offset-4"
                                >
                                    Remove
                                </button>
                            </div>
                        )}

                        {/* When */}
                        <div className="py-5 border-b border-border">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Appointment</p>
                            <p className="font-bold text-text-primary">{draft.date}</p>
                            <p className="text-text-secondary">{draft.time}</p>
                        </div>

                        {/* Client */}
                        <div className="py-5 border-b border-border">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Client</p>
                            <p className="font-bold text-text-primary">{draft.name}</p>
                            <p className="text-xs text-text-muted">{draft.email}</p>
                            {draft.phone && <p className="text-xs text-text-muted">{draft.phone}</p>}
                        </div>

                        {/* Inspiration photo thumbnail */}
                        {draft.photoPreview && (
                            <div className="py-5 border-b border-border">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">Inspiration</p>
                                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border">
                                    <img src={draft.photoPreview} alt="Inspiration" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        )}

                        {/* Pricing breakdown */}
                        <div className="pt-6 space-y-3">
                            <div className="flex justify-between text-sm text-text-secondary">
                                <span>Base service</span>
                                <span className="font-semibold">{style.price}</span>
                            </div>
                            <div className="flex justify-between text-sm text-text-secondary">
                                <span>Size ({sizePresets.find(s => s.id === draft.sizeId)?.label || "Medium"})</span>
                                <span className="font-semibold">{pricing.sizeAdjustmentCents >= 0 ? '+' : ''}{formatCents(pricing.sizeAdjustmentCents)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-text-secondary">
                                <span>Length ({lengthPresets.find(l => l.id === draft.lengthId)?.label || "Shoulder"})</span>
                                <span className="font-semibold">{pricing.lengthAdjustmentCents >= 0 ? '+' : ''}{formatCents(pricing.lengthAdjustmentCents)}</span>
                            </div>
                            {draft.washingAddon && (
                                <div className="flex justify-between text-sm text-text-secondary">
                                    <span>Washing Service</span>
                                    <span className="font-semibold">+{formatCents((addons.find(a => a.id === "wash")?.price || 15) * 100)}</span>
                                </div>
                            )}
                            {draft.takeDownAddon && (
                                <div className="flex justify-between text-sm text-text-secondary">
                                    <span>Take Down Service</span>
                                    <span className="font-semibold">+{formatCents((addons.find(a => a.id === "take-down")?.price || 30) * 100)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm text-text-secondary">
                                <span>Tax (8.25%)</span>
                                <span className="font-semibold">{formatCents(pricing.taxCents)}</span>
                            </div>
                            {pricing.discountCents > 0 && (
                                <div className="flex justify-between text-sm text-text-secondary text-emerald-400">
                                    <span>Discount</span>
                                    <span className="font-semibold">-{formatCents(pricing.discountCents)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm text-text-secondary font-bold pt-2 border-t border-border mt-2">
                                <span>Estimated total</span>
                                <span className="font-semibold">{formatCents(pricing.totalCents)}</span>
                            </div>

                            {paymentChoice === "deposit" && (
                                <div className="flex justify-between text-sm text-text-secondary">
                                    <span>Balance at appointment</span>
                                    <span className="font-semibold">
                                        {formatCents(pricing.totalCents - pricing.depositCents)}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-border">
                                <p className="font-bold text-text-primary">Due Today</p>
                                <p className="text-3xl font-black text-brand-primary">{formatCents(amountDueNow)}</p>
                            </div>

                            {paymentChoice === "deposit" && (
                                <p className="text-[10px] text-text-muted text-right">Non-refundable · Applied to total at appointment</p>
                            )}
                        </div>

                        {/* CTA */}
                        <div className="mt-8 space-y-3">
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

                            <Link
                                href="/book"
                                className="w-full py-4 rounded-full font-bold text-slate-400 hover:text-[#a319c5] transition-colors text-center text-sm flex items-center justify-center gap-2"
                            >
                                <span className="material-icons text-sm">arrow_back</span>
                                Edit my booking
                            </Link>
                        </div>

                        {/* Trust note */}
                        <p className="text-center text-[10px] text-slate-400 mt-4">
                            Your payment is handled securely. We never store card details.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <span className="material-icons animate-spin text-[#a319c5] text-4xl">autorenew</span>
            </div>
        }>
            <CheckoutPageInner />
        </Suspense>
    );
}
