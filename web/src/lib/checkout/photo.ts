export const PHOTO_UPLOAD_TIMEOUT_MS = 15000;

/** MIME type and file extension of a data URL; image/jpeg and "jpg" when it cannot tell. */
export function parsePhotoDataUrl(dataUrl: string): { mimeType: string; extension: string } {
    const mimeType = dataUrl.match(/data:([^;]+);/)?.[1] || "image/jpeg";
    const extension = mimeType.split("/")[1] || "jpg";
    return { mimeType, extension };
}

interface PhotoUploadDeps {
    /** Uploads the data URL to `path`. Rejected after PHOTO_UPLOAD_TIMEOUT_MS if it has not finished. */
    upload: (path: string, dataUrl: string, contentType: string) => Promise<unknown>;
    getUrl: (path: string) => Promise<string>;
    now?: () => number;
    timeoutMs?: number;
}

/**
 * The link to store for the visitor's inspiration photo: a data URL is uploaded to Storage and replaced by its
 * download link, an http(s) link is kept, anything else gives null. A failed or slow upload gives null instead of
 * throwing, so a photo problem never blocks the booking.
 */
export async function resolveInspirationPhotoUrl(photoPreview: string | undefined, draftId: string, deps: PhotoUploadDeps): Promise<string | null> {
    if (photoPreview && photoPreview.startsWith("data:image")) {
        try {
            const { mimeType, extension } = parsePhotoDataUrl(photoPreview);
            const path = `bookingDrafts/${draftId}/inspiration_${(deps.now ?? Date.now)()}.${extension}`;

            let timer: ReturnType<typeof setTimeout> | undefined;
            const timeout = new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error("Inspiration Upload Timeout (15s)")), deps.timeoutMs ?? PHOTO_UPLOAD_TIMEOUT_MS);
            });
            try {
                await Promise.race([deps.upload(path, photoPreview, mimeType), timeout]);
            } finally {
                clearTimeout(timer);
            }
            return await deps.getUrl(path);
        } catch (err) {
            console.error("[Checkout] Photo upload failed:", err);
            return null;
        }
    }
    if (photoPreview && photoPreview.startsWith("http")) return photoPreview;
    return null;
}
