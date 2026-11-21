// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BraidStyle } from "@/src/lib/styles";
import type { TimeSlot } from "@/src/lib/bookings/slots";
import { EMPTY_BOOKING_FORM, type BookingFormData } from "@/src/lib/bookings/useBookingDraft";
import { StyleStep } from "@/components/book/steps/StyleStep";
import { TimeStep } from "@/components/book/steps/TimeStep";
import { DetailsStep } from "@/components/book/steps/DetailsStep";
import { ReviewStep } from "@/components/book/steps/ReviewStep";

afterEach(cleanup);

const form = (over: Partial<BookingFormData> = {}): BookingFormData => ({ ...EMPTY_BOOKING_FORM, ...over });
const customization = <div>custom-block</div>;

describe("StyleStep", () => {
    const styles = [
        { id: "knotless", name: "Knotless Braids", duration: "4-6 hours", image: "/k.jpg" },
        { id: "box", name: "Box Braids", duration: "3-4 hours", image: "/b.jpg" },
    ] as unknown as BraidStyle[];

    it("lists the styles, reports the clicked one, and shows the customization only once a style is chosen", () => {
        const onSelectStyle = vi.fn();
        const view = render(<StyleStep styles={styles} loadingStyles={false} selectedStyle={null} onSelectStyle={onSelectStyle} customization={customization} />);

        fireEvent.click(screen.getByText("Box Braids"));
        expect(onSelectStyle).toHaveBeenCalledWith(styles[1]);
        expect(screen.queryByText("custom-block")).toBeNull();

        view.rerender(<StyleStep styles={styles} loadingStyles={false} selectedStyle={styles[1]} onSelectStyle={onSelectStyle} customization={customization} />);
        expect(screen.getByText("custom-block")).toBeTruthy();
    });

    it("shows no style cards while loading", () => {
        render(<StyleStep styles={styles} loadingStyles selectedStyle={null} onSelectStyle={() => {}} customization={customization} />);
        expect(screen.queryByText("Box Braids")).toBeNull();
    });
});

describe("TimeStep", () => {
    const slots: TimeSlot[] = [
        { time: "9:00 AM", available: true },
        { time: "9:30 AM", available: false },
    ];
    const props = {
        styleDuration: "4 hours",
        viewDate: new Date(2026, 10, 1),
        onChangeMonth: vi.fn(),
        date: "",
        time: "",
        availableSlots: slots,
        isLoadingBookings: false,
        update: vi.fn(),
        customization,
    };

    it("shows the month, and the previous and next buttons call onChangeMonth", () => {
        render(<TimeStep {...props} />);
        expect(screen.getByText("November 2026")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Next month" }));
        expect(props.onChangeMonth).toHaveBeenLastCalledWith(1);
        fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
        expect(props.onChangeMonth).toHaveBeenLastCalledWith(-1);
    });

    it("picking a day sets the English date string and clears the time", () => {
        const update = vi.fn();
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 10, 23, 8, 0));
        try {
            render(<TimeStep {...props} update={update} />);
            fireEvent.click(screen.getByRole("button", { name: "25" }));
        } finally {
            vi.useRealTimers();
        }
        expect(update).toHaveBeenCalledWith({ date: "November 25, 2026", time: "" });
    });

    it("asks for a date first, then lists slots, with taken ones disabled", () => {
        const view = render(<TimeStep {...props} />);
        expect(screen.getByText("Select a date to see available slots")).toBeTruthy();

        view.rerender(<TimeStep {...props} date="November 25, 2026" />);
        expect((screen.getByRole("button", { name: "9:00 AM" }) as HTMLButtonElement).disabled).toBe(false);
        expect((screen.getByRole("button", { name: /9:30 AM/ }) as HTMLButtonElement).disabled).toBe(true);
    });

    it("reports the chosen time", () => {
        const update = vi.fn();
        render(<TimeStep {...props} date="November 25, 2026" update={update} />);
        fireEvent.click(screen.getByRole("button", { name: "9:00 AM" }));
        expect(update).toHaveBeenCalledWith({ time: "9:00 AM" });
    });

    it("shows a loading note while bookings load and a no-slots note when nothing is free", () => {
        const view = render(<TimeStep {...props} date="November 25, 2026" isLoadingBookings />);
        expect(screen.getByText("Checking availability...")).toBeTruthy();

        view.rerender(<TimeStep {...props} date="November 25, 2026" availableSlots={[{ time: "9:00 AM", available: false }]} />);
        expect(screen.getByText("No Slots Available")).toBeTruthy();
    });
});

describe("DetailsStep", () => {
    const setup = (data: BookingFormData, isSignedIn = false) => {
        const update = vi.fn();
        const onPhotoUpload = vi.fn();
        const onRemovePhoto = vi.fn();
        render(<DetailsStep bookingData={data} update={update} isSignedIn={isSignedIn} photoError={null} onPhotoUpload={onPhotoUpload} onRemovePhoto={onRemovePhoto} />);
        return { update, onPhotoUpload, onRemovePhoto };
    };

    it("reports name, email and notes as patches, and formats the phone as typed", () => {
        const { update } = setup(form());
        fireEvent.change(screen.getByPlaceholderText("Jane Doe"), { target: { value: "Ada" } });
        expect(update).toHaveBeenLastCalledWith({ name: "Ada" });
        fireEvent.change(screen.getByPlaceholderText("jane@example.com"), { target: { value: "a@b.co" } });
        expect(update).toHaveBeenLastCalledWith({ email: "a@b.co" });
        fireEvent.change(screen.getByPlaceholderText("(555) 000-0000"), { target: { value: "2145550100" } });
        expect(update).toHaveBeenLastCalledWith({ phone: "(214) 555-0100" });
        fireEvent.change(screen.getByPlaceholderText("Any specifics we should know?"), { target: { value: "Fine" } });
        expect(update).toHaveBeenLastCalledWith({ notes: "Fine" });
    });

    it("warns about a phone number that is not 10 digits", () => {
        setup(form({ phone: "(214) 555" }));
        expect(screen.getByText("Please enter a valid 10-digit US phone number.")).toBeTruthy();
    });

    it("offers account creation to guests only", () => {
        setup(form());
        expect(screen.getByText("Create an Account")).toBeTruthy();
        cleanup();
        setup(form(), true);
        expect(screen.queryByText("Create an Account")).toBeNull();
    });

    it("shows the photo preview with a remove button, which calls onRemovePhoto", () => {
        const { onRemovePhoto } = setup(form({ photoPreview: "data:image/jpeg;base64,xx" }));
        expect(screen.getByAltText("Inspiration Preview")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
        expect(onRemovePhoto).toHaveBeenCalledTimes(1);
    });
});

describe("ReviewStep", () => {
    it("shows the review summary and the customization block", () => {
        render(<ReviewStep styleName="Box Braids" styleDuration="3-4 hours" bookingData={form({ date: "November 25, 2026", time: "10:00 AM", name: "Ada", email: "a@b.co" })} customization={customization} />);
        expect(screen.getByRole("heading", { name: "Review Appointment" })).toBeTruthy();
        expect(screen.getByText("Box Braids")).toBeTruthy();
        expect(screen.getByText("November 25, 2026")).toBeTruthy();
        expect(screen.getByText("custom-block")).toBeTruthy();
    });
});
