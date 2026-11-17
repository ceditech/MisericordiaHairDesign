import { describe, expect, it } from "vitest";
import { createOAuthState, newNonce, verifyOAuthState } from "@/src/lib/auth/oauthState";

const SECRET = "test-secret";
const base = { email: "sales@edxstore.com", uid: "u1", nonce: "n1" };
const NOW = 1_700_000_000_000;

describe("oauthState", () => {
    it("round-trips a valid state", () => {
        const state = createOAuthState(base, SECRET, 600_000, NOW);
        expect(verifyOAuthState(state, SECRET, NOW + 1000)).toEqual({ ...base, exp: NOW + 600_000 });
    });

    it("rejects a state signed with a different secret", () => {
        const state = createOAuthState(base, "other", 600_000, NOW);
        expect(verifyOAuthState(state, SECRET, NOW)).toBeNull();
    });

    it("rejects an expired state", () => {
        const state = createOAuthState(base, SECRET, 600_000, NOW);
        expect(verifyOAuthState(state, SECRET, NOW + 600_001)).toBeNull();
    });

    it("rejects a tampered payload (e.g. swapped target email)", () => {
        const state = createOAuthState(base, SECRET, 600_000, NOW);
        const [payload, sig] = state.split(".");
        const forged = Buffer.from(
            JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), email: "evil@example.com" }),
        ).toString("base64url");
        expect(verifyOAuthState(`${forged}.${sig}`, SECRET, NOW)).toBeNull();
    });

    it("rejects a tampered or wrong-length signature without throwing", () => {
        const state = createOAuthState(base, SECRET, 600_000, NOW);
        const [payload] = state.split(".");
        expect(verifyOAuthState(`${payload}.AAAA`, SECRET, NOW)).toBeNull();
        expect(verifyOAuthState(`${payload}.`, SECRET, NOW)).toBeNull();
    });

    it("rejects malformed input", () => {
        for (const bad of ["", "abc", "a.b.c", "....", null, undefined]) {
            expect(verifyOAuthState(bad as string, SECRET, NOW)).toBeNull();
        }
    });

    it("generates unique, url-safe nonces", () => {
        const a = newNonce();
        const b = newNonce();
        expect(a).not.toBe(b);
        expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    });
});
