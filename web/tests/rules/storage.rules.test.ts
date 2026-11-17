import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { actors, createRulesEnv, seedStaff } from "./helpers";

/**
 * Tests for storage.rules (audit Phase 3.1 baseline, tightened in Phase 3.8).
 * Staff are users with a users/{uid}.role of owner, admin or assistant
 * (checked from Storage rules through a cross-service Firestore read).
 */
let env: RulesTestEnvironment;

beforeAll(async () => {
    env = await createRulesEnv("demo-misericordia-rules");
});
afterAll(async () => {
    await env.cleanup();
});
beforeEach(async () => {
    await env.clearStorage();
    await env.clearFirestore();
});

const png = (bytes = 1024) => new Uint8Array(bytes);
const upload = (storage: ReturnType<ReturnType<typeof actors.anon>["storage"]>, path: string, bytes = png(), contentType = "image/png") =>
    uploadBytes(ref(storage, path), bytes, { contentType });
const seedObject = (path: string) =>
    env.withSecurityRulesDisabled(async (ctx) => {
        await uploadBytes(ref(ctx.storage(), path), png(), { contentType: "image/png" });
    });
const staffStorage = async (role = "assistant") => {
    await seedStaff(env, "staff1", role);
    return actors.staff(env, "staff1").storage();
};

describe("bookingDrafts uploads (guest inspiration photos)", () => {
    it("anyone can read (the checkout needs getDownloadURL right after upload)", async () => {
        await seedObject("bookingDrafts/draft_1/photo.png");
        await assertSucceeds(getBytes(ref(actors.anon(env).storage(), "bookingDrafts/draft_1/photo.png")));
    });

    it("anyone can upload a new small image under a draft_ folder", async () => {
        await assertSucceeds(upload(actors.anon(env).storage(), "bookingDrafts/draft_1/photo.png"));
        await assertSucceeds(upload(actors.client(env).storage(), "bookingDrafts/draft_2/photo.png"));
    });

    it("rejects non-image content types, files of 5MB or more, and folders that are not draft_*", async () => {
        const s = actors.anon(env).storage();
        await assertFails(upload(s, "bookingDrafts/draft_1/a.txt", png(), "text/plain"));
        await assertFails(upload(s, "bookingDrafts/draft_1/big.png", png(5 * 1024 * 1024)));
        await assertFails(upload(s, "bookingDrafts/other/a.png"));
    });

    // The rule only grants `create` (Firebase treats overwriting an existing object as `update`, which is
    // not granted), but the Storage emulator evaluates an overwrite as a create, so this cannot be proven
    // here. Left as a documented gap; unguessable draft ids and timestamped file names limit the exposure.
    it.skip("guests cannot overwrite an existing draft photo (not provable in the emulator)", async () => {
        await seedObject("bookingDrafts/draft_1/photo.png");
        await assertFails(upload(actors.anon(env).storage(), "bookingDrafts/draft_1/photo.png"));
    });

    it("guests cannot delete an existing draft photo", async () => {
        await seedObject("bookingDrafts/draft_1/photo.png");
        await assertFails(deleteObject(ref(actors.anon(env).storage(), "bookingDrafts/draft_1/photo.png")));
    });
});

describe.each(["styles", "hero", "blog", "products"])("%s/ images (public site content)", (folder) => {
    it("anyone can read", async () => {
        await seedObject(`${folder}/a.png`);
        await assertSucceeds(getBytes(ref(actors.anon(env).storage(), `${folder}/a.png`)));
    });

    it("anonymous visitors and signed-in non-staff users cannot write or delete", async () => {
        await seedObject(`${folder}/a.png`);
        for (const s of [actors.anon(env).storage(), actors.client(env).storage()]) {
            await assertFails(upload(s, `${folder}/b.png`));
            await assertFails(deleteObject(ref(s, `${folder}/a.png`)));
        }
    });

    it.each(["owner", "admin", "assistant"])("a %s can upload, overwrite and delete", async (role) => {
        const s = await staffStorage(role);
        await assertSucceeds(upload(s, `${folder}/new.png`));
        await assertSucceeds(upload(s, `${folder}/new.png`));
        await assertSucceeds(deleteObject(ref(s, `${folder}/new.png`)));
    });

    it("a user whose users document says client cannot write", async () => {
        const s = await staffStorage("client");
        await assertFails(upload(s, `${folder}/x.png`));
    });
});

describe("profiles/ images (dashboard profile photo)", () => {
    it("staff can write only files named after their own uid", async () => {
        const s = await staffStorage();
        await assertSucceeds(upload(s, "profiles/staff1_123"));
        await assertFails(upload(s, "profiles/someoneelse_123"));
    });

    it("non-staff users cannot read or write profile images", async () => {
        await seedObject("profiles/staff1_123");
        const s = actors.client(env).storage();
        await assertFails(getBytes(ref(s, "profiles/staff1_123")));
        await assertFails(upload(s, "profiles/client1_1"));
    });

    it("staff can read profile images", async () => {
        await seedObject("profiles/staff1_123");
        await assertSucceeds(getBytes(ref(await staffStorage(), "profiles/staff1_123")));
    });
});

describe("all other paths (default rule)", () => {
    it("anonymous and signed-in non-staff users cannot read or write", async () => {
        await seedObject("private/x.png");
        for (const s of [actors.anon(env).storage(), actors.client(env).storage()]) {
            await assertFails(getBytes(ref(s, "private/x.png")));
            await assertFails(upload(s, "private/y.png"));
        }
    });

    it("staff can read anything but cannot write outside the known upload folders", async () => {
        await seedObject("private/x.png");
        const s = await staffStorage();
        await assertSucceeds(getBytes(ref(s, "private/x.png")));
        await assertFails(upload(s, "private/z.png"));
    });
});
