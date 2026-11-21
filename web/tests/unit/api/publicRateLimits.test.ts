import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ messages: 0, emails: 0, availabilityQueries: 0 }));

vi.mock("@/src/lib/firebase/admin", () => {
    const query = {
        where: () => query,
        get: async () => {
            state.availabilityQueries++;
            return { docs: [] };
        },
        add: async () => {
            state.messages++;
            return { id: "m1" };
        },
    };
    return { adminDb: { collection: () => query } };
});
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => "TS" } }));
vi.mock("@/src/lib/email/EmailManager", () => ({
    EmailManager: { sendEmail: async () => { state.emails++; } },
}));
vi.mock("@/src/lib/email/templates/contactTemplate", () => ({ generateContactInquiryEmail: () => "<p>hi</p>" }));

import { POST as contactPOST } from "@/app/api/contact/route";
import { GET as availabilityGET } from "@/app/api/bookings/availability/route";

let ipCounter = 0;
const nextIp = () => `203.0.113.${++ipCounter}`;

const contact = (ip: string) =>
    contactPOST(
        new NextRequest("http://localhost/api/contact", {
            method: "POST",
            headers: { "x-forwarded-for": ip },
            body: JSON.stringify({ name: "Jane", email: "jane@example.com", service: "Braids", message: "Hello" }),
        }),
    );
const availability = (ip: string) =>
    availabilityGET(new NextRequest("http://localhost/api/bookings/availability?date=December%201%2C%202026", { headers: { "x-forwarded-for": ip } }));

beforeEach(() => {
    state.messages = 0;
    state.emails = 0;
    state.availabilityQueries = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/contact rate limit", () => {
    it("allows 5 messages per IP per hour, then 429 with Retry-After and no write or email", async () => {
        const ip = nextIp();
        for (let i = 0; i < 5; i++) expect((await contact(ip)).status).toBe(200);
        expect(state.messages).toBe(5);
        expect(state.emails).toBe(5);

        const res = await contact(ip);
        expect(res.status).toBe(429);
        expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
        expect(state.messages).toBe(5);
        expect(state.emails).toBe(5);
    });

    it("does not limit a different IP", async () => {
        const blocked = nextIp();
        for (let i = 0; i < 6; i++) await contact(blocked);
        expect((await contact(nextIp())).status).toBe(200);
    });
});

describe("GET /api/bookings/availability rate limit", () => {
    it("allows 60 requests per IP per minute, then 429 with Retry-After and no query", async () => {
        const ip = nextIp();
        for (let i = 0; i < 60; i++) expect((await availability(ip)).status).toBe(200);
        expect(state.availabilityQueries).toBe(60);

        const res = await availability(ip);
        expect(res.status).toBe(429);
        expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
        expect(state.availabilityQueries).toBe(60);
    });

    it("does not limit a different IP", async () => {
        const blocked = nextIp();
        for (let i = 0; i < 61; i++) await availability(blocked);
        expect((await availability(nextIp())).status).toBe(200);
    });
});
