import type { ReactNode } from "react";
import { CONTACT_PHONE } from "@/src/content/legal";
import type { TimeSlot } from "@/src/lib/bookings/slots";
import { getMonthData, isDatePast, formatBookingDate, MONTH_NAMES } from "@/src/lib/bookings/calendar";

interface TimeStepProps {
    styleDuration?: string;
    /** Month shown in the calendar. */
    viewDate: Date;
    onChangeMonth: (offset: number) => void;
    date: string;
    time: string;
    availableSlots: TimeSlot[];
    isLoadingBookings: boolean;
    /** Merge a change into the booking data. */
    update: (patch: { date?: string; time?: string }) => void;
    customization: ReactNode;
}

export function TimeStep({ styleDuration, viewDate, onChangeMonth, date, time, availableSlots, isLoadingBookings, update, customization }: TimeStepProps) {
    const { year, month, firstDayOfMonth, daysInMonth } = getMonthData(viewDate);
    const monthName = MONTH_NAMES[month];
    const hasAvailableSlots = availableSlots.some((s) => s.available);
    const changeMonth = onChangeMonth;
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-bold mb-2 text-slate-900 dark:text-white">Select Date &amp; Time</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
                Available slots reflect your style&apos;s estimated duration
                <span className="ml-1 font-semibold text-[#9F2D5C]">({styleDuration})</span>.
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
                                const isSelected = date === dateStr;
                                return (
                                    <button
                                        key={d}
                                        disabled={isDisabled}
                                        onClick={() => {
                                            update({ date: dateStr, time: "" });
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
                        ) : !date ? (
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
                                        onClick={() => update({ time: slot.time })}
                                        className={`w-full py-3 rounded-xl font-bold border-2 transition-all text-sm flex items-center justify-center ${
                                            !slot.available
                                                ? "border-border bg-surface text-text-muted opacity-50 cursor-not-allowed"
                                                : time === slot.time
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

            {customization}
        </div>
    );
}
