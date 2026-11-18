import { afterEach, describe, expect, it, vi } from "vitest";

const authFetch = vi.hoisted(() => vi.fn());
vi.mock("@/src/lib/http/authFetch", () => ({ authFetch }));

import { getUserBookingHistory } from "@/src/lib/firebase/userBookings";

const dayOffset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toDateString();
};
const booking = (id: string, date: string) => ({ id, userId: "u1", styleName: "S", date, time: "10:00 AM", status: "confirmed", createdAt: null });
const ok = (bookings: unknown[]) => new Response(JSON.stringify({ success: true, bookings }), { status: 200 });

afterEach(() => {
    authFetch.mockReset();
});

describe("getUserBookingHistory", () => {
    it("calls the protected API (not Firestore) and splits upcoming from the last 14 days of past bookings", async () => {
        authFetch.mockResolvedValue(
            ok([booking("future", dayOffset(5)), booking("recent", dayOffset(-3)), booking("old", dayOffset(-30))]),
        );
        const { upcoming, past } = await getUserBookingHistory("u1");
        expect(authFetch).toHaveBeenCalledWith("/api/bookings/mine");
        expect(upcoming.map((b) => b.id)).toEqual(["future"]);
        expect(past.map((b) => b.id)).toEqual(["recent"]);
    });

    it("keeps bookings with an unparseable date in upcoming (existing behavior)", async () => {
        authFetch.mockResolvedValue(ok([booking("weird", "not a date")]));
        const { upcoming } = await getUserBookingHistory("u1");
        expect(upcoming.map((b) => b.id)).toEqual(["weird"]);
    });

    it("does not call the API when nobody is signed in", async () => {
        const { upcoming, past } = await getUserBookingHistory("");
        expect(authFetch).not.toHaveBeenCalled();
        expect(upcoming).toEqual([]);
        expect(past).toEqual([]);
    });

    it("throws when the API answers with an error so the dashboard can handle it", async () => {
        authFetch.mockResolvedValue(new Response(JSON.stringify({ success: false, error: "Authentication required" }), { status: 401 }));
        await expect(getUserBookingHistory("u1")).rejects.toThrow();
    });
});
