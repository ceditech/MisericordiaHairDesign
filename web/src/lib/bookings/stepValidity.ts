import { isValidUSPhone } from "@/src/lib/utils";

/** Whether the booking wizard may advance past `step` (1 Style, 2 Time, 3 Details, 4 Review). */
export function isStepValid(
    step: number,
    data: { hasStyle: boolean; date: string; time: string; name: string; email: string; phone: string }
): boolean {
    switch (step) {
        case 1:
            return data.hasStyle;
        case 2:
            return !!data.date && !!data.time;
        case 3:
            return !!data.name.trim() && !!data.email.trim() && isValidUSPhone(data.phone);
        case 4:
            return true;
        default:
            return false;
    }
}

/** Validate an inspiration photo: type and size. Returns an error message, or null when acceptable. */
export function validatePhoto(file: { type: string; size: number }): string | null {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
    if (!allowed.includes(file.type) && !file.type.startsWith("image/")) {
        return "Please upload a valid image file (JPG, PNG, WEBP, GIF).";
    }
    if (file.size > 5 * 1024 * 1024) {
        return "Photo must be under 5 MB.";
    }
    return null;
}
