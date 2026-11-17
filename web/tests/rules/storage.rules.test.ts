import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { actors, createRulesEnv } from "./helpers";

/**
 * BASELINE tests for storage.rules (audit Phase 3.1). They pin current
 * behavior; "CURRENT (insecure)" cases are flipped by the Phase 3 fix PR.
 */
let env: RulesTestEnvironment;

beforeAll(async () => {
    env = await createRulesEnv("demo-misericordia-rules-storage");
});
afterAll(async () => {
    await env.cleanup();
});
beforeEach(async () => {
    await env.clearStorage();
});

const png = (bytes = 1024) => new Uint8Array(bytes);
const seedObject = (path: string) =>
    env.withSecurityRulesDisabled(async (ctx) => {
        await uploadBytes(ref(ctx.storage(), path), png(), { contentType: "image/png" });
    });

describe("bookingDrafts uploads (guest inspiration photos)", () => {
    it("anyone can read", async () => {
        await seedObject("bookingDrafts/d1/photo.png");
        await assertSucceeds(getBytes(ref(actors.anon(env).storage(), "bookingDrafts/d1/photo.png")));
    });

    it("anyone can upload a small image", async () => {
        await assertSucceeds(
            uploadBytes(ref(actors.anon(env).storage(), "bookingDrafts/d1/photo.png"), png(), { contentType: "image/png" }),
        );
    });

    it("rejects non-image content types and files of 5MB or more", async () => {
        const s = actors.anon(env).storage();
        await assertFails(uploadBytes(ref(s, "bookingDrafts/d1/a.txt"), png(), { contentType: "text/plain" }));
        await assertFails(uploadBytes(ref(s, "bookingDrafts/d1/big.png"), png(5 * 1024 * 1024), { contentType: "image/png" }));
    });
});

describe("styles/ and hero/ images", () => {
    it.each(["styles", "hero"])("%s: anyone can read; anonymous cannot write", async (folder) => {
        await seedObject(`${folder}/a.png`);
        await assertSucceeds(getBytes(ref(actors.anon(env).storage(), `${folder}/a.png`)));
        await assertFails(uploadBytes(ref(actors.anon(env).storage(), `${folder}/b.png`), png(), { contentType: "image/png" }));
    });

    it.each(["styles", "hero"])("CURRENT (insecure): %s: ANY signed-in user can write, not just owners", async (folder) => {
        await assertSucceeds(
            uploadBytes(ref(actors.client(env).storage(), `${folder}/c.png`), png(), { contentType: "image/png" }),
        );
    });
});

describe("all other paths (default rule)", () => {
    it("anonymous users cannot read or write", async () => {
        await seedObject("private/x.png");
        const s = actors.anon(env).storage();
        await assertFails(getBytes(ref(s, "private/x.png")));
        await assertFails(uploadBytes(ref(s, "private/y.png"), png(), { contentType: "image/png" }));
    });

    it("CURRENT (insecure): any signed-in user can read and write everything else", async () => {
        await seedObject("private/x.png");
        const s = actors.client(env).storage();
        await assertSucceeds(getBytes(ref(s, "private/x.png")));
        await assertSucceeds(uploadBytes(ref(s, "private/z.png"), png(), { contentType: "image/png" }));
    });
});
