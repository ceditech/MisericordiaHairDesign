import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ saved: [] as Record<string, unknown>[], queries: 0 }));

vi.mock("@/src/lib/firebase/admin", () => {
    const query = {
        where: () => query,
        get: async () => {
            state.queries++;
            return { docs: [] };
        },
        add: async (doc: Record<string, unknown>) => {
            state.saved.push(doc);
            return { id: "m1" };
        },
    };
    return { adminDb: { collection: () => query } };
});
vi.mock("firebase-admin/firestore", () => ({ FieldValue: { serverTimestamp: () => "TS" } }));
vi.mock("@/src/lib/email/EmailManager", () => ({ EmailManager: { sendEmail: async () => {} } }));
vi.mock("@/src/lib/email/templates/contactTemplate", () => ({ generateContactInquiryEmail: () => "<p>hi</p>" }));

import { POST as contactPOST } from "@/app/api/contact/route";
import { GET as availabilityGET } from "@/app/api/bookings/availability/route";

let n = 0;
const ip = () => `198.51.100.${++n}`;
const contact = (body: string) =>
    contactPOST(new NextRequest("http://localhost/api/contact", { method: "POST", headers: { "x-forwarded-for": ip() }, body }));
const availability = (date?: string) =>
    availabilityGET(
        new NextRequest(`http://localhost/api/bookings/availability${date === undefined ? "" : `?date=${encodeURIComponent(date)}`}`, {
            headers: { "x-forwarded-for": ip() },
        }),
    );

beforeEach(() => {
    state.saved.length = 0;
    state.queries = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
});

const ok = { name: "Jane", email: "jane@example.com", service: "Braids", message: "Hello" };

describe("POST /api/contact validation", () => {
    it("saves a trimmed, valid message", async () => {
        const res = await contact(JSON.stringify({ ...ok, name: " Jane " }));
        expect(res.status).toBe(200);
        expect(state.saved[0]).toMatchObject({ name: "Jane", email: "jane@example.com" });
    });

    it("returns 400 for malformed JSON instead of 500", async () => {
        expect((await contact("{not json")).status).toBe(400);
        expect(state.saved).toHaveLength(0);
    });

    it("returns 400 and saves nothing for an invalid email, huge message or non-string field", async () => {
        expect((await contact(JSON.stringify({ ...ok, email: "nope" }))).status).toBe(400);
        expect((await contact(JSON.stringify({ ...ok, message: "a".repeat(5001) }))).status).toBe(400);
        expect((await contact(JSON.stringify({ ...ok, name: { x: 1 } }))).status).toBe(400);
        expect(state.saved).toHaveLength(0);
    });

    it("does not store unknown fields", async () => {
        await contact(JSON.stringify({ ...ok, isAdmin: true }));
        expect(state.saved[0]).not.toHaveProperty("isAdmin");
    });
});

describe("GET /api/bookings/availability validation", () => {
    it("queries for the date format the booking page sends", async () => {
        expect((await availability("November 21, 2026")).status).toBe(200);
        expect(state.queries).toBe(1);
    });

    it("returns 400 without querying for a missing or malformed date", async () => {
        expect((await availability()).status).toBe(400);
        expect((await availability("2026-11-21")).status).toBe(400);
        expect((await availability("x".repeat(500))).status).toBe(400);
        expect(state.queries).toBe(0);
    });
});
