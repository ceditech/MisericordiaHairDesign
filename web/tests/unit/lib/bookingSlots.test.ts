import { describe, it, expect } from "vitest";
import type { BraidStyle } from "@/src/lib/styles";
import type { BookingRecord } from "@/src/lib/firebase/userBookings";
import { parseMaxDurationHours, timeToMinutes, generateSlots } from "@/src/lib/bookings/slots";
import { getMonthData, isDatePast } from "@/src/lib/bookings/calendar";
import { isStepValid, validatePhoto } from "@/src/lib/bookings/stepValidity";

// Characterization tests: they pin the behaviour of the logic that used to live inside app/book/page.tsx.

const style = (id: string, duration: string) => ({ id, name: id, duration }) as unknown as BraidStyle;
const booking = (time: string, styleId: string) => ({ id: "b", time, styleId, styleName: styleId }) as unknown as BookingRecord;
const times = (slots: ReturnType<typeof generateSlots>) => slots.filter((s) => s.available).map((s) => s.time);

describe("parseMaxDurationHours", () => {
    it.each([
        ["4 hours", 4],
        ["4-6 hours", 6],
        ["3.5 hours", 3.5],
        ["45 min", 0.75],
        ["30-45 minutes", 0.75],
    ])("%s -> %s", (label, hours) => {
        expect(parseMaxDurationHours(label)).toBe(hours);
    });

    it.each([undefined, "", "varies", null as unknown as string])("defaults to 4 for %s", (label) => {
        expect(parseMaxDurationHours(label)).toBe(4);
    });
});

describe("timeToMinutes", () => {
    it.each([
        ["9:00 AM", 540],
        ["9:30 AM", 570],
        ["12:00 PM", 720],
        ["12:30 AM", 30],
        ["1:00 PM", 780],
        ["8:30 PM", 1230],
        ["", 0],
    ])("%s -> %s", (label, minutes) => {
        expect(timeToMinutes(label)).toBe(minutes);
    });
});

describe("generateSlots", () => {
    const farPast = new Date(2020, 0, 1, 8, 0);
    const date = "November 21, 2026";

    it("offers 9:00 AM to 8:30 PM in 30-minute steps (24 slots)", () => {
        const slots = generateSlots(0.5, date, [], [], farPast);
        expect(slots).toHaveLength(24);
        expect(slots[0].time).toBe("9:00 AM");
        expect(slots[3].time).toBe("10:30 AM");
        expect(slots[7].time).toBe("12:30 PM");
        expect(slots[23].time).toBe("8:30 PM");
        expect(slots.every((s) => s.available)).toBe(true);
    });

    it("blocks start times that would run past 9:00 PM", () => {
        // A 4-hour style must start by 5:00 PM.
        const avail = times(generateSlots(4, date, [], [], farPast));
        expect(avail[avail.length - 1]).toBe("5:00 PM");
        expect(avail).not.toContain("5:30 PM");
    });

    it("marks every slot unavailable when the style is longer than the business day", () => {
        expect(times(generateSlots(13, date, [], [], farPast))).toEqual([]);
    });

    it("hides times that have already passed today, including the current minute", () => {
        const now = new Date(2026, 10, 21, 10, 30);
        const avail = times(generateSlots(0.5, date, [], [], now));
        expect(avail[0]).toBe("11:00 AM");
        expect(avail).not.toContain("10:30 AM");
    });

    it("does not filter past times on a different day", () => {
        const now = new Date(2026, 10, 21, 20, 0);
        expect(times(generateSlots(0.5, "November 22, 2026", [], [], now))).toHaveLength(24);
    });

    it("blocks slots that overlap an existing booking, using that booking's style duration", () => {
        const styles = [style("knotless", "4 hours")];
        // Booked 10:00 AM for 4 hours -> occupies 10:00 AM to 2:00 PM.
        const avail = times(generateSlots(2, date, [booking("10:00 AM", "knotless")], styles, farPast));
        expect(avail).not.toContain("9:00 AM"); // 9:00-11:00 overlaps 10:00
        expect(avail).not.toContain("9:30 AM"); // 9:30-11:30 overlaps 10:00
        expect(avail).not.toContain("1:30 PM"); // 1:30-3:30 overlaps until 2:00
        expect(avail).toContain("2:00 PM"); // starts when the booking ends
    });

    it("assumes 4 hours for a booking whose style is unknown", () => {
        const avail = times(generateSlots(0.5, date, [booking("10:00 AM", "gone")], [], farPast));
        expect(avail).not.toContain("1:30 PM");
        expect(avail).toContain("2:00 PM");
    });

    it("ignores a booking with no time", () => {
        expect(times(generateSlots(0.5, date, [booking("", "x")], [], farPast))).toHaveLength(24);
    });
});

describe("calendar", () => {
    it("computes month layout (November 2026 starts on Sunday, 30 days)", () => {
        expect(getMonthData(new Date(2026, 10, 15))).toEqual({ year: 2026, month: 10, firstDayOfMonth: 0, daysInMonth: 30 });
    });

    it("handles a leap-year February", () => {
        expect(getMonthData(new Date(2028, 1, 1)).daysInMonth).toBe(29);
    });

    it("treats earlier days as past and today or later as not past", () => {
        const now = new Date(2026, 10, 21, 15, 0);
        expect(isDatePast(20, 10, 2026, now)).toBe(true);
        expect(isDatePast(21, 10, 2026, now)).toBe(false);
        expect(isDatePast(22, 10, 2026, now)).toBe(false);
        expect(isDatePast(31, 9, 2026, now)).toBe(true);
    });
});

describe("isStepValid", () => {
    const base = { hasStyle: true, date: "November 21, 2026", time: "10:00 AM", name: "Ada", email: "a@b.co", phone: "(214) 555-0100" };

    it("step 1 needs a style", () => {
        expect(isStepValid(1, base)).toBe(true);
        expect(isStepValid(1, { ...base, hasStyle: false })).toBe(false);
    });

    it("step 2 needs a date and a time", () => {
        expect(isStepValid(2, base)).toBe(true);
        expect(isStepValid(2, { ...base, time: "" })).toBe(false);
        expect(isStepValid(2, { ...base, date: "" })).toBe(false);
    });

    it("step 3 needs name, email and a 10-digit phone", () => {
        expect(isStepValid(3, base)).toBe(true);
        expect(isStepValid(3, { ...base, name: "  " })).toBe(false);
        expect(isStepValid(3, { ...base, email: "" })).toBe(false);
        expect(isStepValid(3, { ...base, phone: "555-0100" })).toBe(false);
    });

    it("step 4 is always valid; unknown steps are not", () => {
        expect(isStepValid(4, { ...base, hasStyle: false })).toBe(true);
        expect(isStepValid(5, base)).toBe(false);
    });
});

describe("validatePhoto", () => {
    it("accepts common image types under 5 MB", () => {
        expect(validatePhoto({ type: "image/jpeg", size: 1000 })).toBeNull();
        expect(validatePhoto({ type: "image/avif", size: 1000 })).toBeNull(); // any image/* is allowed
    });

    it("rejects non-images and files over 5 MB", () => {
        expect(validatePhoto({ type: "application/pdf", size: 1000 })).toMatch(/valid image/);
        expect(validatePhoto({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toMatch(/under 5 MB/);
        expect(validatePhoto({ type: "image/png", size: 5 * 1024 * 1024 })).toBeNull();
    });
});
