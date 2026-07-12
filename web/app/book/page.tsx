"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BRAID_STYLES, BraidStyle } from "@/lib/styles";
import { useAuth } from "@/src/providers/AuthProvider";
import { saveDraft, loadDraft, clearDraft, BookingDraft } from "@/lib/bookingDraft";
import { DEPOSIT_POLICY, CANCELLATION_POLICY, DEPOSIT_AMOUNT } from "@/src/content/legal";
import { getBookingsByDate, BookingRecord } from "@/src/lib/firebase/userBookings";
import { subscribeToStyles, subscribeToPresets, subscribeToAddons } from "@/src/lib/firebase/ownerService";
import { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import { Skeleton } from "@/components/ui";
import { calculateBookingPrice, formatCents } from "@/lib/pricing";
import { formatUSPhone, isValidUSPhone } from "@/lib/utils";




// ─── Helpers ─────────────────────────────────────────────────────────────────



function parseMaxDurationHours(duration: string | undefined): number {
    if (!duration || typeof duration !== 'string') return 4;
    const match = duration.match(/(\d+(\.\d+)?)/g);
    if (!match) return 4;
    
    // Take the larger value if it's a range like "4-6 hours"
    let val = parseFloat(match[match.length - 1]);
    
    // Check if it's in minutes
    if (duration.toLowerCase().includes("min")) {
        return val / 60;
    }
    
    return val;
}

/** Generate 30-minute time slots from 9:00 AM up to (closingHour - maxDuration) */
function generateSlots(maxDurationHours: number, selectedDateStr: string, existingBookings: BookingRecord[] = [], allStyles: BraidStyle[] = []): string[] {
    const OPEN_HOUR = 9;   // 9:00 AM
    const CLOSE_HOUR = 21; // 9:00 PM

    const startMinutes = OPEN_HOUR * 60;
    const endMinutes = CLOSE_HOUR * 60;
    const lastPossibleStartMinutes = endMinutes - (maxDurationHours * 60);

    const slots: string[] = [];
    const now = new Date();
    const isToday = (() => {
        if (!selectedDateStr) return false;
        const d = new Date(selectedDateStr);
        return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
        );
    })();

    // Helper: "9:30 AM" -> 570 minutes from midnight
    const timeToMinutes = (timeStr: string) => {
        if (!timeStr) return 0;
        const [time, period] = timeStr.split(" ");
        let [hStr, mStr] = time.split(":");
        let h = parseInt(hStr, 10);
        let m = parseInt(mStr, 10);
        if (period === "PM" && h < 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        return h * 60 + m;
    };

    const occupiedRanges = (existingBookings || []).map(b => {
        if (!b.time) return null;
        const start = timeToMinutes(b.time);
        const style = allStyles.find(s => s.id === b.styleId || s.name === b.styleName);
        const durationHours = style ? parseMaxDurationHours(style.duration) : 4;
        return { start, end: start + (durationHours * 60) };
    }).filter(Boolean) as Array<{start: number, end: number}>;

    console.log("[generateSlots] Debug:", {
        styleDuration: maxDurationHours,
        lastPossibleStart: `${Math.floor(lastPossibleStartMinutes / 60)}:${(lastPossibleStartMinutes % 60).toString().padStart(2, '0')}`,
        existingBookingsCount: existingBookings.length
    });

    for (let current = startMinutes; current <= lastPossibleStartMinutes; current += 30) {
        // Filter past times for today
        if (isToday) {
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            if (current <= nowMinutes) continue;
        }

        const slotEnd = current + (maxDurationHours * 60);
        const hasOverlap = occupiedRanges.some(range => {
            return Math.max(current, range.start) < Math.min(slotEnd, range.end);
        });

        if (hasOverlap) continue;

        const h = Math.floor(current / 60);
        const m = current % 60;
        const suffix = h < 12 ? "AM" : "PM";
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const displayMin = m === 0 ? "00" : "30";
        slots.push(`${displayHour}:${displayMin} ${suffix}`);
    }

    return slots;
}


/** Validate an image file: type and size */
function validatePhoto(file: File): string | null {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
    if (!allowed.includes(file.type) && !file.type.startsWith("image/")) {
        return "Please upload a valid image file (JPG, PNG, WEBP, GIF).";
    }
    if (file.size > 5 * 1024 * 1024) {
        return "Photo must be under 5 MB.";
    }
    return null;
}

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
    const [addons, setAddons] = useState<any[]>([]);
    
    const [currentStep, setCurrentStep] = useState(1);
    const [selectedStyle, setSelectedStyle] = useState<BraidStyle | null>(null);

    useEffect(() => {
        const unsubStyles = subscribeToStyles((data) => {
            setStyles(data);
            setLoadingStyles(false);
            if (!selectedStyle && data.length > 0) {
                const initial = data.find((s) => s.id === (styleParam ?? "")) ?? data[0];
                setSelectedStyle(initial);
            }
        });

        const unsubPresets = subscribeToPresets((data) => {
            const sizes = data.filter(p => (p as any).type === "size") as SizePreset[];
            const lengths = data.filter(p => (p as any).type === "length") as LengthPreset[];
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

    const [bookingData, setBookingData] = useState({
        date: "",
        time: "",
        name: "",
        email: "",
        phone: "",
        notes: "",
        inspirationPhoto: null as File | null,
        photoPreview: "",
        sizeId: "",
        lengthId: "",
        washingAddon: false,
        takeDownAddon: false,
        password: "",
        createAccount: true,
    });
    const [existingBookings, setExistingBookings] = useState<BookingRecord[]>([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

    const [draftRestored, setDraftRestored] = useState(false);
    const hasRedirected = useRef(false);
    // Guard: only start persisting AFTER draft hydration has run
    const hydrated = useRef(false);

    // ── Draft hydration — runs once after mount (client-only) ─────────────────
    useEffect(() => {
        const draft = loadDraft();
        if (!draft) { hydrated.current = true; return; }

        // URL ?style= param takes priority over the saved draft style
        if (!styleParam && draft.styleId) {
            const savedStyle = styles.find((s) => s.id === draft.styleId);
            if (savedStyle) setSelectedStyle(savedStyle);
        }

        if (draft.currentStep > 1) setCurrentStep(draft.currentStep);

        setBookingData((prev) => ({
            ...prev,
            date: draft.date || prev.date,
            time: draft.time || prev.time,
            name: draft.name || prev.name,
            email: draft.email || prev.email,
            phone: draft.phone || prev.phone,
            notes: draft.notes || prev.notes,
            photoPreview: draft.photoPreview || prev.photoPreview,
            sizeId: draft.sizeId || prev.sizeId,
            lengthId: draft.lengthId || prev.lengthId,
            washingAddon: draft.washingAddon ?? prev.washingAddon,
            takeDownAddon: draft.takeDownAddon ?? prev.takeDownAddon,
            password: draft.password || prev.password,
            createAccount: draft.createAccount ?? prev.createAccount,
        }));

        if (draft.date || draft.name || draft.currentStep > 1) {
            setDraftRestored(true);
        }

        hydrated.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — runs once on mount

    // ── Pre-fill from Auth Profile ────────────────────────────────────────────
    useEffect(() => {
        if (profile || user) {
            setBookingData((prev) => ({
                ...prev,
                name: prev.name || profile?.name || profile?.displayName || user?.displayName || "",
                email: prev.email || profile?.email || user?.email || "",
                phone: prev.phone || profile?.phone || "",
            }));
        } else if (!user) {
            // Clear if logged out
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



    // ── Persist draft on every relevant state change ──────────────────────────
    useEffect(() => {
        // Don't overwrite the draft until hydration has completed
        if (!hydrated.current) return;
        saveDraft({
            styleId: selectedStyle?.id,
            currentStep,
            date: bookingData.date,
            time: bookingData.time,
            name: bookingData.name,
            email: bookingData.email,
            phone: bookingData.phone,
            notes: bookingData.notes,
            photoPreview: bookingData.photoPreview,
            sizeId: bookingData.sizeId,
            lengthId: bookingData.lengthId,
            washingAddon: bookingData.washingAddon,
            takeDownAddon: bookingData.takeDownAddon,
            password: bookingData.password,
            createAccount: bookingData.createAccount,
        });
    }, [selectedStyle, currentStep, bookingData]);


    const [viewDate, setViewDate] = useState(new Date());

    // ── Calendar helpers ───────────────────────────────────────────────────────
    const getMonthData = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { year, month, firstDayOfMonth, daysInMonth };
    };

    const isDatePast = (day: number, month: number, year: number) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(year, month, day) < today;
    };

    const changeMonth = (offset: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
    };

    const { year, month, firstDayOfMonth, daysInMonth } = getMonthData(viewDate);
    const monthName = viewDate.toLocaleString("default", { month: "long" });

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

    // Total Service = Base + Length + Size + Addons + 8.25% Tax
    const taxCents = pricing.taxCents;
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
    const isStepValid = (() => {
        switch (currentStep) {
            case 1: return !!selectedStyle;
            case 2: return !!bookingData.date && !!bookingData.time;
            case 3:
                return (
                    !!bookingData.name.trim() &&
                    !!bookingData.email.trim() &&
                    isValidUSPhone(bookingData.phone)
                );
            case 4: return true;
            default: return false;
        }
    })();

    /** Reusable Customization Block */
    const CustomizationSection = () => (
        <div className="mt-12 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 fade-in zoom-in duration-500">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Customize Your {selectedStyle?.name}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Size */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Available Size Options</label>
                    <div className="space-y-2">
                        {sizePresets.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => setBookingData(prev => ({ ...prev, sizeId: preset.id }))}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${bookingData.sizeId === preset.id ? 'border-[#9F2D5C] bg-[#9F2D5C]/5 dark:bg-[#9F2D5C]/10' : 'border-transparent bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'}`}
                            >
                                <div>
                                    <p className={`font-bold text-sm ${bookingData.sizeId === preset.id ? 'text-[#9F2D5C]' : 'text-slate-900 dark:text-white'}`}>{preset.label}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{preset.description} ({preset.priceGuidance})</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${bookingData.sizeId === preset.id ? 'border-[#9F2D5C] bg-[#9F2D5C]' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {bookingData.sizeId === preset.id && <span className="material-icons text-white text-[12px]">check</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Length */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Available Length Options</label>
                    <div className="space-y-2">
                        {lengthPresets.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => setBookingData(prev => ({ ...prev, lengthId: preset.id }))}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${bookingData.lengthId === preset.id ? 'border-[#9F2D5C] bg-[#9F2D5C]/5 dark:bg-[#9F2D5C]/10' : 'border-transparent bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'}`}
                            >
                                <div>
                                    <p className={`font-bold text-sm ${bookingData.lengthId === preset.id ? 'text-[#9F2D5C]' : 'text-slate-900 dark:text-white'}`}>{preset.label}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{preset.inches}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${bookingData.lengthId === preset.id ? 'border-[#9F2D5C] bg-[#9F2D5C]' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {bookingData.lengthId === preset.id && <span className="material-icons text-white text-[12px]">check</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add-ons */}
            <div className="border-t border-slate-200 dark:border-slate-700/50 pt-8 space-y-4">
                <label className="flex flex-row items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl cursor-pointer hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-800">
                    <input
                        type="checkbox"
                        checked={bookingData.washingAddon}
                        onChange={(e) => setBookingData(prev => ({ ...prev, washingAddon: e.target.checked }))}
                        className="w-6 h-6 rounded-md border-slate-300 text-[#9F2D5C] focus:ring-[#9F2D5C] bg-slate-100 dark:bg-slate-800"
                    />
                    <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">Add Washing Service (+${addons.find(a => a.id === 'wash')?.price || 25})</p>
                        <p className="text-xs text-slate-500">Start your appointment with a clean, prepped foundation.</p>
                    </div>
                </label>
                <label className="flex flex-row items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl cursor-pointer hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-800">
                    <input
                        type="checkbox"
                        checked={bookingData.takeDownAddon}
                        onChange={(e) => setBookingData(prev => ({ ...prev, takeDownAddon: e.target.checked }))}
                        className="w-6 h-6 rounded-md border-slate-300 text-[#9F2D5C] focus:ring-[#9F2D5C] bg-slate-100 dark:bg-slate-800"
                    />
                    <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">Add Take Down Service (+${addons.find(a => a.id === 'take-down')?.price || 45})</p>
                        <p className="text-xs text-slate-500">Professional removal of your previous style.</p>
                    </div>
                </label>
            </div>
        </div>
    );

    return (
        <main className="max-w-7xl mx-auto px-6 py-12">
            {/* Draft Restored Banner */}
            {draftRestored && (
                <div className="max-w-4xl mx-auto mb-8 flex items-center gap-4 bg-[#9F2D5C]/8 dark:bg-[#9F2D5C]/10 border border-[#9F2D5C]/20 rounded-2xl px-6 py-4">
                    <span className="material-icons text-[#9F2D5C] text-base">restore</span>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex-1">
                        We restored your booking draft. Pick up right where you left off!
                    </p>
                    <button
                        onClick={() => { clearDraft(); setDraftRestored(false); window.location.reload(); }}
                        className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                        aria-label="Dismiss and clear draft"
                    >
                        Start over
                    </button>
                    <button
                        onClick={() => setDraftRestored(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label="Dismiss banner"
                    >
                        <span className="material-icons text-base">close</span>
                    </button>
                </div>
            )}

            {/* Progress Stepper */}
            <nav className="max-w-4xl mx-auto mb-16">
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -z-10" />
                    {steps.map((item) => (
                        <div key={item.step} className="flex flex-col items-center gap-2">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm z-10 transition-all ${currentStep >= item.step
                                    ? "bg-[#9F2D5C] text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                    }`}
                            >
                                {currentStep > item.step ? (
                                    <span className="material-icons text-base">check</span>
                                ) : (
                                    <span className="text-sm font-bold">{item.step}</span>
                                )}
                            </div>
                            <span
                                className={`text-[10px] uppercase tracking-widest font-bold ${currentStep >= item.step ? "text-[#9F2D5C]" : "text-slate-400"
                                    }`}
                            >
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </nav>

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
                            {selectedStyle && <CustomizationSection />}
                        </div>
                    )}

                    {/* Step 2 — Date & Time */}
                    {currentStep === 2 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-4xl font-bold mb-2 text-slate-900 dark:text-white">Select Date &amp; Time</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-8">
                                Available slots reflect your style's estimated duration
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
                                                const dateStr = `${monthName} ${d}, ${year}`;
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
                                        ) : availableSlots.length === 0 ? (

                                            <div className="flex flex-col items-center justify-center h-48 text-center text-text-muted">
                                                <span className="material-icons text-4xl mb-3 opacity-30">schedule</span>
                                                <p className="text-sm">No slots available for today.<br />Please select another date.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 overflow-y-auto max-h-80 pr-1">
                                                {availableSlots.map((t) => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setBookingData((prev) => ({ ...prev, time: t }))}
                                                        className={`w-full py-3 rounded-xl font-bold border-2 transition-all text-sm ${bookingData.time === t
                                                            ? "border-brand-primary bg-brand-primary/5 text-brand-primary"
                                                            : "border-border bg-surface hover:border-brand-primary/40 text-text-primary"
                                                            }`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <CustomizationSection />
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
                            <div className="space-y-6">
                                {/* Details card */}
                                <div className="bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
                                    <div className="p-10 space-y-10">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Service Details</p>
                                                <p className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{selectedStyle?.name}</p>
                                                <p className="text-slate-500">{selectedStyle?.duration}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">When</p>
                                                <p className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{bookingData.date || "Not selected"}</p>
                                                <p className="text-slate-500">{bookingData.time || "Not selected"}</p>
                                            </div>
                                        </div>
                                        <div className="pt-10 border-t border-slate-100 dark:border-slate-700 grid md:grid-cols-2 gap-12">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Client Details</p>
                                                <p className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{bookingData.name || "N/A"}</p>
                                                <p className="text-slate-500">{bookingData.email || "N/A"}</p>
                                                {bookingData.phone && <p className="text-slate-500 mt-1">{bookingData.phone}</p>}
                                            </div>
                                            {bookingData.photoPreview && (
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Inspiration Photo</p>
                                                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-105">
                                                        <img src={bookingData.photoPreview} alt="Style inspiration" className="w-full h-full object-cover" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Deposit Policy Notice */}
                                <div className="flex items-start gap-5 bg-[#9F2D5C]/5 dark:bg-[#9F2D5C]/10 border border-[#9F2D5C]/20 rounded-[1.5rem] p-7">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#9F2D5C] flex items-center justify-center shadow-lg shadow-[#9F2D5C]/30">
                                        <span className="material-icons text-white text-base">lock</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white mb-1">{DEPOSIT_AMOUNT} Non-Refundable Deposit Required</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                            {DEPOSIT_POLICY} {CANCELLATION_POLICY}
                                        </p>
                                    </div>
                                </div>

                                {/* Price Discretion Notice */}
                                <div className="flex items-start gap-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-[1.5rem] p-7">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                        <span className="material-icons text-white text-base">info</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white mb-1">Final Price Disclaimer</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                            Price is subject to change at the discretion of the braider based on specific requirements or hair conditions.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <CustomizationSection />
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
                                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                                    <span>Tax (8.25%):</span>
                                    <span>{pricing.baseCents > 0 ? formatCents(taxCents) : "TBD"}</span>
                                </div>
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
                                        await (router.push("/checkout") as any);
                                    } catch (err: any) {
                                        if (err.name !== 'AbortError') throw err;
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
