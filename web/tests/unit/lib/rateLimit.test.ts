import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "@/src/lib/http/rateLimit";
import { escapeHtml } from "@/src/lib/html";

describe("createRateLimiter", () => {
    it("allows up to the limit within the window, then blocks with a retry-after", () => {
        const rl = createRateLimiter({ limit: 3, windowMs: 60_000 });
        expect(rl.check("ip", 0).ok).toBe(true);
        expect(rl.check("ip", 1000).ok).toBe(true);
        expect(rl.check("ip", 2000).ok).toBe(true);
        const blocked = rl.check("ip", 3000);
        expect(blocked.ok).toBe(false);
        expect(blocked.retryAfterSec).toBe(57);
    });

    it("frees capacity after the window passes", () => {
        const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
        expect(rl.check("ip", 0).ok).toBe(true);
        expect(rl.check("ip", 500).ok).toBe(false);
        expect(rl.check("ip", 1001).ok).toBe(true);
    });

    it("tracks keys independently", () => {
        const rl = createRateLimiter({ limit: 1, windowMs: 1000 });
        expect(rl.check("a", 0).ok).toBe(true);
        expect(rl.check("b", 0).ok).toBe(true);
    });
});

describe("clientIp", () => {
    it("uses the first x-forwarded-for entry, else x-real-ip, else unknown", () => {
        const h = (headers: Record<string, string>) => new Request("http://x", { headers });
        expect(clientIp(h({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
        expect(clientIp(h({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
        expect(clientIp(h({}))).toBe("unknown");
    });
});

describe("escapeHtml", () => {
    it("escapes markup characters", () => {
        expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
            "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
        );
    });
});
