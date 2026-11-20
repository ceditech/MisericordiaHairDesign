import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Formats a given string into a US Phone Number format: (XXX) XXX-XXXX
 * Automatically strips non-numeric characters.
 */
export function formatUSPhone(value: string): string {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, "");
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}

/**
 * Validates if a given string contains exactly 10 digits, matching a standard US phone number.
 */
export function isValidUSPhone(phone: string): boolean {
    if (!phone) return false;
    const digits = phone.replace(/[^\d]/g, "");
    return digits.length === 10;
}
