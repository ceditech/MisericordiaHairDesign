// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BookingDraft } from "@/src/lib/bookingDraft";
import type { BraidStyle } from "@/src/lib/styles";
import type { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import type { AddonDoc } from "@/src/lib/firebase/ownerService";
import { calculateBookingPrice } from "@/src/lib/pricing";
import { NoBookingState } from "@/components/checkout/NoBookingState";
import { PaymentChoiceSection } from "@/components/checkout/PaymentChoiceSection";
import { PaymentMethodSection } from "@/components/checkout/PaymentMethodSection";
import { PaymentMethodCard } from "@/components/checkout/PaymentMethodCard";
import { PolicyNotice } from "@/components/checkout/PolicyNotice";
import { ErrorBanner } from "@/components/checkout/ErrorBanner";
import { PromoCodeBox } from "@/components/checkout/PromoCodeBox";
import { OrderSummary } from "@/components/checkout/OrderSummary";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

afterEach(cleanup);

describe("NoBookingState", () => {
    it("sends the visitor back to the booking page", () => {
        render(<NoBookingState />);
        expect(screen.getByText("No Booking Found")).toBeTruthy();
        expect(screen.getByRole("link", { name: /Start a Booking/ }).getAttribute("href")).toBe("/book");
    });
});

describe("PaymentChoiceSection", () => {
    const setup = (paymentChoice: "deposit" | "full") => {
        const onChange = vi.fn();
        render(<PaymentChoiceSection paymentChoice={paymentChoice} onChange={onChange} depositCents={5000} totalCents={16000} />);
        return onChange;
    };

    it("shows the deposit and the full amount", () => {
        setup("deposit");
        expect(screen.getByText("$50.00")).toBeTruthy();
        expect(screen.getByText("$160.00")).toBeTruthy();
    });

    it("marks the chosen option and reports the other one when clicked", () => {
        const onChange = setup("deposit");
        expect(document.getElementById("choice-deposit")?.getAttribute("aria-pressed")).toBe("true");
        expect(document.getElementById("choice-full")?.getAttribute("aria-pressed")).toBe("false");
        fireEvent.click(document.getElementById("choice-full") as HTMLElement);
        expect(onChange).toHaveBeenLastCalledWith("full");
        fireEvent.click(document.getElementById("choice-deposit") as HTMLElement);
        expect(onChange).toHaveBeenLastCalledWith("deposit");
    });

    it("marks the full option when it is chosen", () => {
        setup("full");
        expect(document.getElementById("choice-full")?.getAttribute("aria-pressed")).toBe("true");
    });
});

describe("PaymentMethodSection and PaymentMethodCard", () => {
    it("lists both providers, marks the chosen one, and reports a click", () => {
        const onSelect = vi.fn();
        render(<PaymentMethodSection provider="stripe" onSelect={onSelect} />);
        expect(document.getElementById("payment-method-stripe")?.getAttribute("aria-pressed")).toBe("true");
        expect(document.getElementById("payment-method-paypal")?.getAttribute("aria-pressed")).toBe("false");
        expect(screen.getByText("✓ PayPal Buyer Protection")).toBeTruthy();

        fireEvent.click(document.getElementById("payment-method-paypal") as HTMLElement);
        expect(onSelect).toHaveBeenCalledWith("paypal");
        fireEvent.click(document.getElementById("payment-method-stripe") as HTMLElement);
        expect(onSelect).toHaveBeenLastCalledWith("stripe");
    });

    it("a method card shows its label and description and calls onSelect", () => {
        const onSelect = vi.fn();
        render(<PaymentMethodCard provider="paypal" selected={false} onSelect={onSelect} icon="x" label="PayPal" description="Pay your way" />);
        expect(screen.getByText("Pay your way")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: /PayPal/ }));
        expect(onSelect).toHaveBeenCalledTimes(1);
    });
});

describe("PolicyNotice", () => {
    it("shows both policy headings", () => {
        render(<PolicyNotice />);
        expect(screen.getByText("Cancellation Policy")).toBeTruthy();
        expect(screen.getByText("Price Note Policy")).toBeTruthy();
    });
});

describe("ErrorBanner", () => {
    it("shows the message and dismisses", () => {
        const onDismiss = vi.fn();
        render(<ErrorBanner message="Card declined" onDismiss={onDismiss} />);
        expect(screen.getByText("Card declined")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Dismiss error" }));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it("falls back to a generic message", () => {
        render(<ErrorBanner message={null} onDismiss={() => {}} />);
        expect(screen.getByText("Something went wrong. Please try again.")).toBeTruthy();
    });
});

describe("PromoCodeBox", () => {
    const props = { promoCode: "", appliedCode: null as string | null, onChange: vi.fn(), onApply: vi.fn(), onRemove: vi.fn() };

    it("reports typing and applying, and keeps Apply off while the field is blank", () => {
        const { rerender } = render(<PromoCodeBox {...props} />);
        expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.change(screen.getByPlaceholderText("Promo Code"), { target: { value: "sum" } });
        expect(props.onChange).toHaveBeenCalledWith("sum");

        rerender(<PromoCodeBox {...props} promoCode="  " />);
        expect((screen.getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);

        rerender(<PromoCodeBox {...props} promoCode="sum" />);
        fireEvent.click(screen.getByRole("button", { name: "Apply" }));
        expect(props.onApply).toHaveBeenCalledTimes(1);
    });

    it("shows the applied state with a Remove button", () => {
        render(<PromoCodeBox {...props} appliedCode="SUMMER" />);
        expect(screen.getByText("Code Applied")).toBeTruthy();
        expect(screen.queryByPlaceholderText("Promo Code")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Remove" }));
        expect(props.onRemove).toHaveBeenCalledTimes(1);
    });
});

describe("OrderSummary", () => {
    const style = { id: "box", name: "Box Braids", price: "$120", duration: "3-4 hours" } as unknown as BraidStyle;
    const sizePresets = [{ id: "size-small", type: "size", label: "Small", description: "", priceGuidance: "", priceAdjustment: 40 }] as unknown as SizePreset[];
    const lengthPresets = [{ id: "length-mid", type: "length", label: "Mid-back", inches: "", priceAdjustment: 0 }] as unknown as LengthPreset[];
    const addons = [{ id: "wash", price: 30 }] as unknown as AddonDoc[];
    const draft = {
        styleId: "box", sizeId: "size-small", lengthId: "length-mid", washingAddon: true, takeDownAddon: false, currentStep: 4,
        date: "November 25, 2026", time: "10:00 AM", name: "Ada", email: "a@b.co", phone: "(214) 555-0100", notes: "",
    } as BookingDraft;
    const price = (promo: { code: string; discountPercent: number } | null = null) =>
        calculateBookingPrice({ stylePrice: "$120", sizeId: "size-small", lengthId: "length-mid", washingAddon: true, takeDownAddon: false, sizePresets, lengthPresets, addons, promo });

    const setup = (over: Partial<Parameters<typeof OrderSummary>[0]> = {}) => {
        const pricing = over.pricing ?? price();
        return render(
            <OrderSummary
                style={style} draft={{ ...draft, ...(over.draft ?? {}) }} pricing={pricing} sizePresets={sizePresets} lengthPresets={lengthPresets}
                addons={addons} paymentChoice={over.paymentChoice ?? "deposit"} amountDueNow={pricing.depositCents}
                promoBox={<div>promo-slot</div>}
            >
                <button>pay-slot</button>
            </OrderSummary>
        );
    };

    it("shows the style, appointment, client, the promo slot and the pay slot", () => {
        setup();
        expect(screen.getByText("Box Braids")).toBeTruthy();
        expect(screen.getByText("3-4 hours")).toBeTruthy();
        expect(screen.getByText("November 25, 2026")).toBeTruthy();
        expect(screen.getByText("10:00 AM")).toBeTruthy();
        expect(screen.getByText("Ada")).toBeTruthy();
        expect(screen.getByText("(214) 555-0100")).toBeTruthy();
        expect(screen.getByText("promo-slot")).toBeTruthy();
        expect(screen.getByRole("button", { name: "pay-slot" })).toBeTruthy();
        expect(screen.getByRole("link", { name: /Edit my booking/ }).getAttribute("href")).toBe("/book");
    });

    it("names the chosen size and length, and prices the washing add-on from the add-on list", () => {
        setup();
        expect(screen.getByText("Size (Small)")).toBeTruthy();
        expect(screen.getByText("Length (Mid-back)")).toBeTruthy();
        expect(screen.getByText("Washing Service")).toBeTruthy();
        expect(screen.getByText("+$30.00")).toBeTruthy();
        expect(screen.queryByText("Take Down Service")).toBeNull();
    });

    it("shows the discount line only when a code lowers the price", () => {
        setup();
        expect(screen.queryByText("Discount")).toBeNull();
        cleanup();
        setup({ pricing: price({ code: "SUMMER", discountPercent: 20 }) });
        expect(screen.getByText("Discount")).toBeTruthy();
    });

    it("shows the balance and deposit note for a deposit, not for full payment", () => {
        setup();
        expect(screen.getByText("Balance at appointment")).toBeTruthy();
        expect(screen.getByText(/Non-refundable · Applied to total at appointment/)).toBeTruthy();
        cleanup();
        setup({ paymentChoice: "full" });
        expect(screen.queryByText("Balance at appointment")).toBeNull();
    });

    it("shows the inspiration photo only when there is one", () => {
        setup();
        expect(screen.queryByAltText("Inspiration")).toBeNull();
        cleanup();
        setup({ draft: { photoPreview: "data:image/png;base64,AA" } as BookingDraft });
        expect(screen.getByAltText("Inspiration")).toBeTruthy();
    });
});
