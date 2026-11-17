import { afterEach, describe, expect, it, vi } from "vitest";

const getIdToken = vi.fn(async () => "id-token-123");
let currentUser: { getIdToken: typeof getIdToken } | null = { getIdToken };

vi.mock("@/src/lib/firebase/auth", () => ({
    auth: {
        get currentUser() {
            return currentUser;
        },
    },
}));

import { authFetch } from "@/src/lib/http/authFetch";

afterEach(() => {
    vi.restoreAllMocks();
    currentUser = { getIdToken };
});

describe("authFetch", () => {
    it("adds a Bearer token and preserves method, body and other headers", async () => {
        const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
        await authFetch("/api/admin/x", {
            method: "POST",
            body: "{}",
            headers: { "Content-Type": "application/json" },
        });
        const [url, init] = f.mock.calls[0];
        expect(url).toBe("/api/admin/x");
        expect(init?.method).toBe("POST");
        expect(init?.body).toBe("{}");
        const h = new Headers(init?.headers);
        expect(h.get("authorization")).toBe("Bearer id-token-123");
        expect(h.get("content-type")).toBe("application/json");
    });

    it("sends the request without Authorization when nobody is signed in (server answers 401)", async () => {
        currentUser = null;
        const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
        await authFetch("/api/admin/x");
        expect(new Headers(f.mock.calls[0][1]?.headers).has("authorization")).toBe(false);
    });
});
