"use client";

import { isAbortError } from "@/src/lib/errors";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BraidStyle } from "@/src/lib/styles";
import { useAuth } from "@/src/providers/AuthProvider";
import { clearDraft } from "@/src/lib/bookingDraft";
import { CONTACT_PHONE, CONTACT_PHONE_TEL } from "@/src/content/legal";
import { useBookingDraft, EMPTY_BOOKING_FORM, type BookingFormData } from "@/src/lib/bookings/useBookingDraft";
import { getBookingsByDate, BookingRecord } from "@/src/lib/firebase/userBookings";
import { subscribeToStyles, subscribeToPresets, subscribeToAddons } from "@/src/lib/firebase/ownerService";
import type { AddonDoc } from "@/src/lib/firebase/ownerService";
import { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import { ProgressStepper } from "@/components/book/ProgressStepper";
import { DraftRestoredBanner } from "@/components/book/DraftRestoredBanner";
import { NoSlotsModal } from "@/components/book/NoSlotsModal";
import { StyleStep } from "@/components/book/steps/StyleStep";
import { TimeStep } from "@/components/book/steps/TimeStep";
import { DetailsStep } from "@/components/book/steps/DetailsStep";
import { ReviewStep } from "@/components/book/steps/ReviewStep";
import { CustomizationSection, type CustomizationValues } from "@/components/book/CustomizationSection";
import { calculateBookingPrice, formatCents } from "@/src/lib/pricing";
import { parseMaxDurationHours, generateSlots } from "@/src/lib/bookings/slots";
import { isStepValid as isStepValidFor, validatePhoto } from "@/src/lib/bookings/stepValidity";




// ─── Component ────────────────────────────────────────────────────────────────

function BookingPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, profile } = useAuth();
    const styleParam = searchParams.get("style");

    const [styles, setStyles] = useState<BraidStyle[]>([]);
    const [loadingStyles, setLoadingStyles] = useState(true);
    const [sizePresets, setSizePresets] = useState<SizePreset[]>([]);
    const [lengthPresets, setLengthPresets] = useState<LengthPreset[]>([]);
    const [addons, setAddons] = useState<AddonDoc[]>([]);
    
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedStyle, setSelectedStyle] = useState<BraidStyle | null>(null);

    // Latest styles, and the style id saved in the draft that is waiting for the styles to load.
    const stylesRef = useRef<BraidStyle[]>([]);
    const draftStyleId = useRef<string | undefined>(undefined);

    useEffect(() => {
        const unsubStyles = subscribeToStyles((data) => {
            stylesRef.current = data;
            setStyles(data);
            setLoadingStyles(false);
            if (data.length > 0) {
                // Only choose a style when none is selected yet: later updates must not reset the visitor's choice.
                // Priority: ?style= in the URL, then the style saved in the draft, then the first style.
                const initial =
                    data.find((s) => s.id === (styleParam ?? "")) ??
                    (styleParam ? undefined : data.find((s) => s.id === draftStyleId.current)) ??
                    data[0];
                setSelectedStyle((prev) => prev ?? initial);
            }
        });

        const unsubPresets = subscribeToPresets((data) => {
            const sizes = data.filter(p => p.type === "size") as SizePreset[];
            const lengths = data.filter(p => p.type === "length") as LengthPreset[];
            setSizePresets(sizes);
            setLengthPresets(lengths);

            // Set defaults if not set
            setBookingData(prev => ({
                ...prev,
                sizeId: prev.sizeId || sizes[0]?.id || "",
                lengthId: prev.lengthId || lengths[0]?.id || ""
            }));
        });

        const unsubAddons = subscribeToAddons((data) => {
            setAddons(data);
        });

        return () => {
            unsubStyles();
            unsubPresets();
            unsubAddons();
        };
    }, [styleParam]); // Re-run if style param changes to update selection

    const [bookingData, setBookingData] = useState<BookingFormData>(EMPTY_BOOKING_FORM);
    const [existingBookings, setExistingBookings] = useState<BookingRecord[]>([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

    const [showNoSlotsModal, setShowNoSlotsModal] = useState(false);

    const hasRedirected = useRef(false);

    const { draftRestored, setDraftRestored } = useBookingDraft({
        styleParam,
        stylesRef,
        draftStyleId,
        selectedStyle,
        currentStep,
        bookingData,
        setSelectedStyle,
        setCurrentStep,
        setBookingData,
    });

    // ── Pre-fill from Auth Profile ────────────────────────────────────────────
    const wasSignedIn = useRef(false);
    useEffect(() => {
        if (profile || user) {
            wasSignedIn.current = true;
            setBookingData((prev) => ({
                ...prev,
                name: prev.name || profile?.name || profile?.displayName || user?.displayName || "",
                email: prev.email || profile?.email || user?.email || "",
                phone: prev.phone || profile?.phone || "",
            }));
        } else if (wasSignedIn.current) {
            // Clear on sign-out only. A visitor who was never signed in keeps what the draft restored.
            wasSignedIn.current = false;
            setBookingData((prev) => ({
                ...prev,
                name: "",
                email: "",
                phone: "",
            }));
        }
    }, [profile, user]);


    // ── Fetch existing bookings for the selected date ─────────────────────────
    useEffect(() => {
        if (bookingData.date) {
            const fetchBookings = async () => {
                setIsLoadingBookings(true);
                try {
                    const bookings = await getBookingsByDate(bookingData.date);
                    setExistingBookings(bookings);
                } catch (err) {
                    console.error("[BookingPage] Failed to fetch existing bookings:", err);
                } finally {
                    setIsLoadingBookings(false);
                }
            };
            fetchBookings();
        } else {
            setExistingBookings([]);
        }
    }, [bookingData.date]);

    // Check for no available slots after bookings are loaded
    useEffect(() => {
        if (!isLoadingBookings && bookingData.date) {
             const maxDur = selectedStyle ? parseMaxDurationHours(selectedStyle.duration) : 4;
             const slots = generateSlots(maxDur, bookingData.date, existingBookings, styles);
             const hasAvail = slots.some(s => s.available);
             if (!hasAvail && slots.length > 0) {
                 setShowNoSlotsModal(true);
             } else {
                 setShowNoSlotsModal(false);
             }
        } else {
             setShowNoSlotsModal(false);
        }
    }, [isLoadingBookings, bookingData.date, existingBookings, selectedStyle, styles]);




    const [viewDate, setViewDate] = useState(new Date());

    // ── Calendar helpers ───────────────────────────────────────────────────────
    const changeMonth = (offset: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    };

    // ── Photo handler ──────────────────────────────────────────────────────────
    const handlePhotoUpload = (file: File | undefined) => {
        if (!file) return;
        const error = validatePhoto(file);
        if (error) {
            setPhotoError(error);
            return;
        }
        setPhotoError(null);
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.fillStyle = "#FFFFFF"; // Ensure white background for JPEGs
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    // Output as JPEG at 70% quality, which creates a highly optimized base64 string.
                    const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
                    setBookingData((prev) => ({
                        ...prev,
                        inspirationPhoto: file,
                        photoPreview: compressedDataUrl,
                    }));
                }
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    };

    const removePhoto = () => {
        setBookingData((prev) => ({ ...prev, inspirationPhoto: null, photoPreview: "" }));
        setPhotoError(null);
    };

    // ── Slot generation ────────────────────────────────────────────────────────
    const maxDuration = selectedStyle ? parseMaxDurationHours(selectedStyle.duration) : 4;
    const availableSlots = generateSlots(maxDuration, bookingData.date, existingBookings, styles);


    // ── Computed Totals ────────────────────────────────────────────────────────
    const pricing = calculateBookingPrice({
        stylePrice: selectedStyle?.price || "$0",
        sizeId: bookingData.sizeId,
        lengthId: bookingData.lengthId,
        washingAddon: bookingData.washingAddon,
        takeDownAddon: bookingData.takeDownAddon,
        sizePresets,
        lengthPresets,
        addons
    });

    const sizePreset = sizePresets.find(s => s.id === bookingData.sizeId) || sizePresets[0];
    const lengthPreset = lengthPresets.find(l => l.id === bookingData.lengthId) || lengthPresets[0];

    // Total Service = Base + Length + Size + Addons (services are not taxed)
    const totalCents = pricing.totalCents;

    // Deposit = Fixed $50 + Addons (Washing $25, Take Down $45)
    const totalDepositCents = pricing.depositCents;

    const displayTotal = pricing.baseCents > 0 ? formatCents(totalCents) : selectedStyle?.price || "";


    // ── Navigation ─────────────────────────────────────────────────────────────
    useEffect(() => {
        // Automatically scroll to top whenever the step changes
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [currentStep]);

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const steps = [
        { step: 1, label: "Style" },
        { step: 2, label: "Time" },
        { step: 3, label: "Details" },
        { step: 4, label: "Review" },
    ];

    // ── Validation per step ────────────────────────────────────────────────────
    const isStepValid = isStepValidFor(currentStep, {
        hasStyle: !!selectedStyle,
        date: bookingData.date,
        time: bookingData.time,
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
    });

    const updateBooking = (patch: Partial<BookingFormData>) => setBookingData((prev) => ({ ...prev, ...patch }));

    const customizationProps = {
        styleName: selectedStyle?.name,
        sizePresets,
        lengthPresets,
        addons,
        values: {
            sizeId: bookingData.sizeId,
            lengthId: bookingData.lengthId,
            washingAddon: bookingData.washingAddon,
            takeDownAddon: bookingData.takeDownAddon,
        },
        onChange: (patch: Partial<CustomizationValues>) => updateBooking(patch),
    };
    const customization = <CustomizationSection {...customizationProps} />;

    return (
        <main className="max-w-7xl mx-auto px-6 py-12">
            {/* Draft Restored Banner */}
            {draftRestored && (
                <DraftRestoredBanner
                    onStartOver={() => { clearDraft(); setDraftRestored(false); window.location.reload(); }}
                    onDismiss={() => setDraftRestored(false)}
                />
            )}

            <ProgressStepper currentStep={currentStep} steps={steps} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* ── Left: Step Content ─────────────────────────────────────── */}
                <div className="lg:col-span-8">

                    {/* Step 1 — Style */}
                    {currentStep === 1 && (
                        <StyleStep
                            styles={styles}
                            loadingStyles={loadingStyles}
                            selectedStyle={selectedStyle}
                            onSelectStyle={(style) => {
                                setSelectedStyle(style);
                                // Reset time if duration changed (new style may have fewer slots)
                                updateBooking({ time: "" });
                            }}
                            customization={customization}
                        />
                    )}

                    {/* Step 2 — Date & Time */}
                    {currentStep === 2 && (
                        <TimeStep
                            styleDuration={selectedStyle?.duration}
                            viewDate={viewDate}
                            onChangeMonth={changeMonth}
                            date={bookingData.date}
                            time={bookingData.time}
                            availableSlots={availableSlots}
                            isLoadingBookings={isLoadingBookings}
                            update={updateBooking}
                            customization={customization}
                        />
                    )}

                    {/* Step 3 — Client Details */}
                    {currentStep === 3 && (
                        <DetailsStep
                            bookingData={bookingData}
                            update={updateBooking}
                            isSignedIn={!!user}
                            photoError={photoError}
                            onPhotoUpload={handlePhotoUpload}
                            onRemovePhoto={removePhoto}
                        />
                    )}

                    {/* Step 4 — Review */}
                    {currentStep === 4 && (
                        <ReviewStep
                            styleName={selectedStyle?.name}
                            styleDuration={selectedStyle?.duration}
                            bookingData={bookingData}
                            customization={customization}
                        />
                    )}


                    {/* Back Button */}
                    {currentStep > 1 && (
                        <button
                            onClick={prevStep}
                            className="mt-8 flex items-center gap-2 text-slate-400 hover:text-[#9F2D5C] transition-colors font-bold uppercase tracking-widest text-xs"
                        >
                            <span className="material-icons text-sm">arrow_back</span>
                            Go Back
                        </button>
                    )}
                </div>

                {/* ── Right: Sticky Booking Summary ──────────────────────────── */}
                <div className="lg:col-span-4 lg:sticky lg:top-28">
                    <div className="bg-[#f8f6f7] dark:bg-slate-900/50 rounded-[2rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-[#9F2D5C]/5 flex flex-col min-h-[580px]">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-10">Booking Summary</h2>

                        <div className="space-y-8 flex-grow">
                            {/* Style */}
                            <div className="flex justify-between items-start pb-6 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Style</p>
                                    <p className="font-bold text-slate-900 dark:text-white text-lg">{selectedStyle?.name}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{selectedStyle?.duration}</p>
                                </div>
                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="text-[#9F2D5C] hover:text-[#B8326A] transition-colors"
                                    aria-label="Edit style"
                                >
                                    <span className="material-icons text-base">edit</span>
                                </button>
                            </div>

                            {/* When */}
                            <div className="flex justify-between items-start pb-6 border-b border-slate-200 dark:border-slate-800">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">When</p>
                                    <p className="font-bold text-slate-900 dark:text-white text-lg leading-snug">
                                        {bookingData.date
                                            ? `${bookingData.date}${bookingData.time ? ` @ ${bookingData.time}` : ""}`
                                            : "Not selected yet"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setCurrentStep(2)}
                                    className="text-slate-400 hover:text-[#9F2D5C] transition-colors"
                                    aria-label="Edit date and time"
                                >
                                    <span className="material-icons text-base">schedule</span>
                                </button>
                            </div>

                            {/* Pricing block */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                                    <span>Size:</span>
                                    <span>{sizePreset?.label || "Loading..."}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                                    <span>Length:</span>
                                    <span>{lengthPreset?.label || "Loading..."}</span>
                                </div>
                                {bookingData.washingAddon && (
                                    <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                                        <span>Add-on:</span>
                                        <span>Washing (+${addons.find(a => a.id === 'wash')?.price || 25})</span>
                                    </div>
                                )}
                                {bookingData.takeDownAddon && (
                                    <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                                        <span>Add-on:</span>
                                        <span>Take Down (+${addons.find(a => a.id === 'take-down')?.price || 45})</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Estimated Total</p>
                                    <p className="text-2xl font-bold text-[#9F2D5C]">{displayTotal}</p>
                                </div>
                                <div className="flex justify-between items-center bg-[#9F2D5C]/8 dark:bg-[#9F2D5C]/10 rounded-2xl px-5 py-4 border border-[#9F2D5C]/15">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9F2D5C]">Deposit Due Today</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Non-refundable · Applied to total</p>
                                    </div>
                                    <p className="text-xl font-black text-[#9F2D5C]">{formatCents(totalDepositCents)}</p>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="mt-10">
                            <button
                                onClick={currentStep === 4 ? async () => {
                                    if (hasRedirected.current) return;
                                    hasRedirected.current = true;
                                    try {
                                        await router.push("/checkout");
                                    } catch (err: unknown) {
                                        if (!isAbortError(err)) throw err;
                                    }
                                } : nextStep}
                                disabled={!isStepValid}
                                className={`w-full py-6 rounded-full font-bold shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 group active:scale-95 ${isStepValid
                                    ? "bg-[#9F2D5C] hover:bg-[#B8326A] text-white shadow-[#9F2D5C]/30 cursor-pointer"
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 shadow-none cursor-not-allowed"
                                    }`}
                            >
                                {currentStep === 4 ? "Continue to Checkout" : "Continue to Next Step"}
                                <span className={`material-icons transition-transform duration-300 ${isStepValid ? "group-hover:translate-x-2" : ""}`}>
                                    arrow_forward
                                </span>
                            </button>
                            {currentStep < 4 && (
                                <p className="text-center text-[10px] text-slate-400 mt-4">
                                    {currentStep === 3
                                        ? "Fields marked * are required"
                                        : "No payment charged until the final step"}
                                </p>
                            )}
                            {/* Call-outs */}
                            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">Need a special time slot or have a special request?</span><br />
                                    <a href={CONTACT_PHONE_TEL} className="font-bold text-[#9F2D5C] hover:underline">Call {CONTACT_PHONE}</a>.
                                </p>
                                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-300">
                                    <strong className="block mb-1">Closed on Sundays.</strong> For special Sunday requests or appointments outside regular hours (including after 9:00 PM), call <strong>{CONTACT_PHONE}</strong>.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* No Slots Modal */}
            <NoSlotsModal
                isOpen={showNoSlotsModal}
                onClose={() => setShowNoSlotsModal(false)}
                date={bookingData.date}
                styleDuration={selectedStyle?.duration}
            />
        </main>
    );
}

export default function BookingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <span className="material-icons animate-spin text-[#9F2D5C] text-4xl">autorenew</span>
            </div>
        }>
            <BookingPageInner />
        </Suspense>
    );
}
