// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// Characterization test for the four-step booking wizard (app/book/page.tsx).
// It pins what the page does today so the planned component split (Phase 9.4b) can be checked against it.
// Firebase, auth and routing are mocked; pricing, slot logic, validation and the draft module are real.

const mocks = vi.hoisted(() => ({
    push: vi.fn(),
    getBookingsByDate: vi.fn(),
    search: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
    useSearchParams: () => mocks.search,
    useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/src/providers/AuthProvider", () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock("@/src/lib/firebase/userBookings", () => ({ getBookingsByDate: mocks.getBookingsByDate }));
vi.mock("@/src/lib/firebase/ownerService", () => ({
    subscribeToStyles: (cb: (d: unknown[]) => void) => {
        cb([
            { id: "knotless", name: "Knotless Braids", price: "$150", duration: "4-6 hours", image: "/k.jpg" },
            { id: "box", name: "Box Braids", price: "$120", duration: "3-4 hours", image: "/b.jpg" },
        ]);
        return () => {};
    },
    subscribeToPresets: (cb: (d: unknown[]) => void) => {
        cb([
            { id: "size-small", type: "size", label: "Small", description: "Dense", priceGuidance: "+$40", priceAdjustment: 40 },
            { id: "size-medium", type: "size", label: "Medium", description: "Standard", priceGuidance: "", priceAdjustment: 0 },
            { id: "length-mid", type: "length", label: "Mid-back", inches: "~20 inches", priceAdjustment: 0 },
        ]);
        return () => {};
    },
    subscribeToAddons: (cb: (d: unknown[]) => void) => {
        cb([]);
        return () => {};
    },
}));

import BookingPage from "@/app/book/page";

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const continueBtn = (label: string) => screen.getByRole("button", { name: new RegExp(label) }) as HTMLButtonElement;

beforeEach(() => {
    // Monday 23 Nov 2026, 08:00: the 25th is a future Wednesday and nothing is "past" on it.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 23, 8, 0));
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    sessionStorage.clear();
    mocks.push.mockReset();
    mocks.getBookingsByDate.mockReset().mockResolvedValue([]);
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("booking wizard", () => {
    it("walks style -> time -> details -> review and hands off to checkout once", async () => {
        render(<BookingPage />);

        // Step 1: the first style is preselected; the visitor picks another and continues.
        expect(screen.getByRole("heading", { name: "Select Braid Style" })).toBeTruthy();
        expect(continueBtn("Continue to Next Step").disabled).toBe(false);
        fireEvent.click(screen.getByText("Box Braids"));
        fireEvent.click(continueBtn("Continue to Next Step"));

        // Step 2: cannot continue until a date AND a time are chosen.
        expect(screen.getByRole("heading", { name: /Select Date/ })).toBeTruthy();
        expect(continueBtn("Continue to Next Step").disabled).toBe(true);
        click("25");
        await waitFor(() => expect(mocks.getBookingsByDate).toHaveBeenCalledWith("November 25, 2026"));
        expect(continueBtn("Continue to Next Step").disabled).toBe(true);
        click("10:00 AM");
        expect(continueBtn("Continue to Next Step").disabled).toBe(false);
        fireEvent.click(continueBtn("Continue to Next Step"));

        // Step 3: needs a name, an email and a 10-digit phone.
        expect(screen.getByRole("heading", { name: "Your Information" })).toBeTruthy();
        expect(continueBtn("Continue to Next Step").disabled).toBe(true);
        fireEvent.change(screen.getByPlaceholderText("Jane Doe"), { target: { value: "Ada Lovelace" } });
        fireEvent.change(screen.getByPlaceholderText("jane@example.com"), { target: { value: "ada@example.com" } });
        fireEvent.change(screen.getByPlaceholderText("(555) 000-0000"), { target: { value: "214555" } });
        expect(continueBtn("Continue to Next Step").disabled).toBe(true); // phone incomplete
        fireEvent.change(screen.getByPlaceholderText("(555) 000-0000"), { target: { value: "2145550100" } });
        expect((screen.getByPlaceholderText("(555) 000-0000") as HTMLInputElement).value).toBe("(214) 555-0100");
        expect(continueBtn("Continue to Next Step").disabled).toBe(false);
        fireEvent.click(continueBtn("Continue to Next Step"));

        // Step 4: the review shows the choices; Checkout navigates once even if clicked twice.
        expect(screen.getByRole("heading", { name: "Review Appointment" })).toBeTruthy();
        expect(screen.getByText("November 25, 2026 @ 10:00 AM")).toBeTruthy();
        expect(screen.getAllByText("Box Braids").length).toBeGreaterThan(0);
        const checkout = continueBtn("Continue to Checkout");
        fireEvent.click(checkout);
        fireEvent.click(checkout);
        await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));
        expect(mocks.push).toHaveBeenCalledWith("/checkout");
    });

    it("saves the draft for the checkout page as the visitor goes", async () => {
        render(<BookingPage />);
        fireEvent.click(screen.getByText("Box Braids"));
        fireEvent.click(continueBtn("Continue to Next Step"));
        click("25");
        await waitFor(() => expect(mocks.getBookingsByDate).toHaveBeenCalled());
        click("10:00 AM");

        const draft = JSON.parse(sessionStorage.getItem("dedes_booking_draft") ?? "{}");
        expect(draft).toMatchObject({ styleId: "box", currentStep: 2, date: "November 25, 2026", time: "10:00 AM", sizeId: "size-small", lengthId: "length-mid" });
    });

    const saved = { styleId: "box", currentStep: 3, date: "November 25, 2026", time: "10:00 AM", name: "Ada", email: "a@b.co", phone: "(214) 555-0100", notes: "Fine braids" };
    const seedDraft = () => sessionStorage.setItem("dedes_booking_draft", JSON.stringify(saved));
    const storedDraft = () => JSON.parse(sessionStorage.getItem("dedes_booking_draft") ?? "{}");

    it("restores the step, date, time and notes of a saved draft and shows the banner", () => {
        seedDraft();
        render(<BookingPage />);

        expect(screen.getByRole("heading", { name: "Your Information" })).toBeTruthy();
        expect(screen.getByText(/We restored your booking draft/)).toBeTruthy();
        expect((screen.getByPlaceholderText("Any specifics we should know?") as HTMLTextAreaElement).value).toBe("Fine braids");
        expect(storedDraft()).toMatchObject({ currentStep: 3, date: "November 25, 2026", time: "10:00 AM" });
    });

    // KNOWN BUG (found while writing this test, fix tracked separately): for a signed-out visitor the
    // "clear if logged out" effect runs right after draft hydration and wipes the restored name, email and phone.
    // `it.fails` passes while the bug exists and starts failing once it is fixed: then change it to a plain `it`.
    it.fails("keeps a signed-out visitor's name, email and phone from the restored draft", () => {
        seedDraft();
        render(<BookingPage />);

        expect((screen.getByPlaceholderText("Jane Doe") as HTMLInputElement).value).toBe("Ada");
        expect((screen.getByPlaceholderText("jane@example.com") as HTMLInputElement).value).toBe("a@b.co");
        expect((screen.getByPlaceholderText("(555) 000-0000") as HTMLInputElement).value).toBe("(214) 555-0100");
    });

    // KNOWN BUG (same status): hydration looks the saved style up in `styles` before the styles have loaded,
    // so the restored draft is saved back with the default (first) style instead of the one the visitor chose.
    it.fails("keeps the style chosen before the page was reloaded", () => {
        seedDraft();
        render(<BookingPage />);

        expect(storedDraft().styleId).toBe("box");
    });
});
