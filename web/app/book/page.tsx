"use client";

import { isAbortError } from "@/src/lib/errors";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BraidStyle } from "@/src/lib/styles";
import { useAuth } from "@/src/providers/AuthProvider";
import { clearDraft } from "@/src/lib/bookingDraft";
import { useBookingDraft, EMPTY_BOOKING_FORM, type BookingFormData } from "@/src/lib/bookings/useBookingDraft";
import { getBookingsByDate, BookingRecord } from "@/src/lib/firebase/userBookings";
import { subscribeToStyles, subscribeToPresets, subscribeToAddons } from "@/src/lib/firebase/ownerService";
import type { AddonDoc } from "@/src/lib/firebase/ownerService";
import { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import { CONTACT_PHONE } from "@/src/content/legal";
import { Skeleton } from "@/components/ui";
import { ProgressStepper } from "@/components/book/ProgressStepper";
import { DraftRestoredBanner } from "@/components/book/DraftRestoredBanner";
import { NoSlotsModal } from "@/components/book/NoSlotsModal";
import { ReviewSummary } from "@/components/book/ReviewSummary";
import { CustomizationSection, type CustomizationValues } from "@/components/book/CustomizationSection";
import { calculateBookingPrice, formatCents } from "@/src/lib/pricing";
import { formatUSPhone, isValidUSPhone } from "@/src/lib/utils";
import { parseMaxDurationHours, generateSlots } from "@/src/lib/bookings/slots";
import { getMonthData, isDatePast, formatBookingDate, MONTH_NAMES } from "@/src/lib/bookings/calendar";
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

    const { year, month, firstDayOfMonth, daysInMonth } = getMonthData(viewDate);
    const monthName = MONTH_NAMES[month];

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
    const hasAvailableSlots = availableSlots.some(s => s.available);


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
        onChange: (patch: Partial<CustomizationValues>) => setBookingData((prev) => ({ ...prev, ...patch })),
    };

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
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-10">
                                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">Select Braid Style</h2>
                                <p className="text-lg text-slate-500 dark:text-slate-400">Choose the perfect look for your next appointment.</p>
                            </div>

                            {loadingStyles ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} className="aspect-[4/5] rounded-[2rem]" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {styles.map((style) => (
                                        <div
                                            key={style.id}
                                            onClick={() => {
                                                setSelectedStyle(style);
                                                // Reset time if duration changed (new style may have fewer slots)
                                                setBookingData((prev) => ({ ...prev, time: "" }));
                                            }}
                                            className={`group relative bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.03] border-4 cursor-pointer ${selectedStyle?.id === style.id ? "border-[#9F2D5C]" : "border-transparent"}`}
                                        >
                                            <div className="aspect-[4/5] relative overflow-hidden">
                                                <img alt={style.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={style.image} />
                                                {selectedStyle?.id === style.id && (
                                                    <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                                                        <div className="bg-[#9F2D5C] text-white p-2 rounded-full flex items-center justify-center shadow-xl">
                                                            <span className="material-icons text-base">check</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-5 text-center">
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-[#9F2D5C] transition-colors">{style.name}</h3>
                                                <p className="text-xs text-slate-400 mt-1">{style.duration}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Options for Selected Style */}
                            {selectedStyle && <CustomizationSection {...customizationProps} />}
                        </div>
                    )}

                    {/* Step 2 — Date & Time */}
                    {currentStep === 2 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-4xl font-bold mb-2 text-slate-900 dark:text-white">Select Date &amp; Time</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-8">
                                Available slots reflect your style&apos;s estimated duration
                                <span className="ml-1 font-semibold text-[#9F2D5C]">({selectedStyle?.duration})</span>.
                            </p>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    {/* Calendar */}
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <p className="font-bold uppercase tracking-widest text-xs text-slate-400">{monthName} {year}</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" aria-label="Previous month">
                                                    <span className="material-icons text-sm">chevron_left</span>
                                                </button>
                                                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" aria-label="Next month">
                                                    <span className="material-icons text-sm">chevron_right</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-7 gap-2 text-center">
                                            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                                                <div key={`${d}-${i}`} className="text-[10px] font-bold text-slate-400 py-2">{d}</div>
                                            ))}
                                            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                                <div key={`pad-${i}`} className="aspect-square" />
                                            ))}
                                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                                                const isSunday = new Date(year, month, d).getDay() === 0;
                                                const isDisabled = isDatePast(d, month, year) || isSunday;
                                                const dateStr = formatBookingDate(year, month, d);
                                                const isSelected = bookingData.date === dateStr;
                                                return (
                                                    <button
                                                        key={d}
                                                        disabled={isDisabled}
                                                        onClick={() => {
                                                            setBookingData((prev) => ({ ...prev, date: dateStr, time: "" }));
                                                        }}
                                                        className={`aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition-all ${isDisabled
                                                            ? "opacity-20 cursor-not-allowed"
                                                            : isSelected
                                                                ? "bg-brand-primary text-white shadow-lg"
                                                                : "bg-surface/50 hover:bg-surface text-text-primary border border-border"
                                                            }`}
                                                    >
                                                        {d}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Time Slots */}
                                    <div>
                                        <p className="font-bold mb-1 uppercase tracking-widest text-xs text-text-muted">Available Slots</p>
                                        <p className="text-[10px] text-text-muted mb-4">Business hours: 9:00 AM – 9:00 PM · 30-min intervals</p>
                                        {isLoadingBookings ? (
                                            <div className="flex flex-col items-center justify-center h-48 text-center text-text-muted">
                                                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                                                <p className="text-sm">Checking availability...</p>
                                            </div>
                                        ) : !bookingData.date ? (
                                            <div className="flex flex-col items-center justify-center h-48 text-center text-text-muted">
                                                <span className="material-icons text-4xl mb-3 opacity-30">calendar_today</span>
                                                <p className="text-sm">Select a date to see available slots</p>
                                            </div>
                                        ) : !hasAvailableSlots ? (
                                            <div className="flex flex-col items-center justify-center p-6 text-center bg-[#9F2D5C]/5 border border-[#9F2D5C]/20 rounded-2xl animate-in zoom-in-95 duration-300">
                                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                                    <span className="material-icons text-[#9F2D5C] text-2xl">event_busy</span>
                                                </div>
                                                <h4 className="text-slate-900 dark:text-white font-bold text-base mb-2">No Slots Available</h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                                    We are fully booked or it is past business hours. Please select the next day or a following date.
                                                </p>
                                                <div className="inline-flex items-center justify-center bg-white dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm gap-2">
                                                    <span className="material-icons text-[14px] text-slate-400">phone</span>
                                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Urgent? Call {CONTACT_PHONE}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
                                                {availableSlots.map((slot) => (
                                                    <button
                                                        key={slot.time}
                                                        disabled={!slot.available}
                                                        onClick={() => setBookingData((prev) => ({ ...prev, time: slot.time }))}
                                                        className={`w-full py-3 rounded-xl font-bold border-2 transition-all text-sm flex items-center justify-center ${
                                                            !slot.available
                                                                ? "border-border bg-surface text-text-muted opacity-50 cursor-not-allowed"
                                                                : bookingData.time === slot.time
                                                                    ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                                                                    : "border-border bg-surface hover:border-brand-primary/40 text-text-primary"
                                                            }`}
                                                    >
                                                        {slot.time}
                                                        {!slot.available && (
                                                            <span className="text-xs font-normal ml-2 opacity-70">
                                                                (Unavailable)
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <CustomizationSection {...customizationProps} />
                        </div>
                    )}

                    {/* Step 3 — Client Details */}
                    {currentStep === 3 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-white">Your Information</h2>
                            <div className="bg-white dark:bg-slate-800 p-10 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                                <div className="space-y-8">

                                    {/* Name + Email */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">
                                                Full Name <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={bookingData.name}
                                                onChange={(e) => setBookingData((prev) => ({ ...prev, name: e.target.value }))}
                                                className="w-full bg-[#f8f6f7] dark:bg-slate-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#9F2D5C] outline-none"
                                                placeholder="Jane Doe"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">
                                                Email Address <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={bookingData.email}
                                                onChange={(e) => setBookingData((prev) => ({ ...prev, email: e.target.value }))}
                                                className="w-full bg-[#f8f6f7] dark:bg-slate-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#9F2D5C] outline-none"
                                                placeholder="jane@example.com"
                                            />
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-bold uppercase tracking-widest ml-4 ${bookingData.phone && !isValidUSPhone(bookingData.phone) ? 'text-red-500' : 'text-slate-400'}`}>
                                            Phone Number <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            value={bookingData.phone}
                                            onChange={(e) => setBookingData((prev) => ({ ...prev, phone: formatUSPhone(e.target.value) }))}
                                            className={`w-full rounded-2xl p-4 outline-none transition-all ${
                                                bookingData.phone && !isValidUSPhone(bookingData.phone) 
                                                ? 'bg-red-50 dark:bg-red-900/10 border-2 border-red-500 text-red-600 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                                                : 'bg-[#f8f6f7] dark:bg-slate-900 border-none focus:ring-2 focus:ring-[#9F2D5C]'
                                            }`}
                                            placeholder="(555) 000-0000"
                                        />
                                        {bookingData.phone && !isValidUSPhone(bookingData.phone) && (
                                            <p className="text-[10px] text-red-500 font-bold ml-4 animate-in fade-in">Please enter a valid 10-digit US phone number.</p>
                                        )}
                                    </div>

                                    {/* Account Creation for Guest Users */}
                                    {!user && (
                                        <div className="p-8 rounded-3xl bg-[#9F2D5C]/5 border border-[#9F2D5C]/10 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#9F2D5C] flex items-center justify-center shadow-lg shadow-[#9F2D5C]/20">
                                                    <span className="material-icons text-white text-base">person_add</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white">Create an Account</h3>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Recommended</p>
                                                </div>
                                            </div>

                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                                Save your appointment and speed up future bookings. You&apos;ll be able to manage your history and get referral rewards!
                                            </p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Password</label>
                                                    <input
                                                        type="password"
                                                        value={bookingData.password}
                                                        onChange={(e) => setBookingData(prev => ({ ...prev, password: e.target.value }))}
                                                        className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#9F2D5C] outline-none"
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <div className="flex items-end pb-3">
                                                    <label className="flex items-center gap-3 cursor-pointer group">
                                                        <div className="relative">
                                                            <input
                                                                type="checkbox"
                                                                checked={bookingData.createAccount}
                                                                onChange={(e) => setBookingData(prev => ({ ...prev, createAccount: e.target.checked }))}
                                                                className="peer hidden"
                                                            />
                                                            <div className="w-6 h-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 peer-checked:bg-[#9F2D5C] peer-checked:border-[#9F2D5C] transition-all flex items-center justify-center">
                                                                <span className="material-icons text-white text-[14px]">check</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Apply this password</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Special Requests */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Special Requests</label>
                                        <textarea
                                            rows={4}
                                            value={bookingData.notes}
                                            onChange={(e) => setBookingData((prev) => ({ ...prev, notes: e.target.value }))}
                                            className="w-full bg-[#f8f6f7] dark:bg-slate-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#9F2D5C] outline-none resize-none"
                                            placeholder="Any specifics we should know?"
                                        />
                                    </div>

                                    {/* Inspiration Photo */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center justify-between ml-4">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inspiration Photo</label>
                                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Optional</span>
                                        </div>

                                        {photoError && (
                                            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl px-5 py-3 text-xs font-semibold">
                                                <span className="material-icons text-sm">error_outline</span>
                                                {photoError}
                                            </div>
                                        )}

                                        {!bookingData.photoPreview ? (
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className={`border-2 border-dashed rounded-2xl p-8 text-center hover:border-[#9F2D5C] hover:bg-[#9F2D5C]/5 transition-all group ${photoError ? "border-red-300 dark:border-red-700" : "border-slate-200 dark:border-slate-700"}`}>
                                                    <span className="material-icons text-4xl text-slate-300 dark:text-slate-600 group-hover:text-[#9F2D5C] mb-2 block">add_a_photo</span>
                                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">Click to upload inspiration photo</p>
                                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight">JPG, PNG, WEBP · Up to 5 MB</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative group rounded-3xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-900 shadow-inner">
                                                <img src={bookingData.photoPreview} alt="Inspiration Preview" className="w-full h-full object-contain" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                    <button
                                                        onClick={removePhoto}
                                                        className="bg-white text-red-500 p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all"
                                                        aria-label="Remove photo"
                                                    >
                                                        <span className="material-icons">delete</span>
                                                    </button>
                                                    <label className="bg-white text-[#9F2D5C] p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer" aria-label="Replace photo">
                                                        <span className="material-icons">refresh</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-[11px] text-slate-400 ml-4 italic">Show us the style you&apos;re aiming for!</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* Step 4 — Review */}
                    {currentStep === 4 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-white">Review Appointment</h2>
                            <ReviewSummary
                                styleName={selectedStyle?.name}
                                styleDuration={selectedStyle?.duration}
                                date={bookingData.date}
                                time={bookingData.time}
                                name={bookingData.name}
                                email={bookingData.email}
                                phone={bookingData.phone}
                                photoPreview={bookingData.photoPreview}
                            />

                            <CustomizationSection {...customizationProps} />
                        </div>
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
                                    <a href="tel:+19452754778" className="font-bold text-[#9F2D5C] hover:underline">Call (945) 275-4778</a>.
                                </p>
                                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-300">
                                    <strong className="block mb-1">Closed on Sundays.</strong> For special Sunday requests or appointments outside regular hours (including after 9:00 PM), call <strong>(945) 275-4778</strong>.
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
