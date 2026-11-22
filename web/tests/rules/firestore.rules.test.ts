import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { actors, createRulesEnv, seedDocs, seedStaff } from "./helpers";

/**
 * BASELINE tests for firestore.rules (audit Phase 3.1).
 *
 * They pin what the rules do TODAY. Cases named "CURRENT (insecure)" document a
 * known weakness; the Phase 3 fix PRs flip each one from assertSucceeds to
 * assertFails in the same commit that changes the rules.
 */
let env: RulesTestEnvironment;

beforeAll(async () => {
    env = await createRulesEnv("demo-misericordia-rules");
});
afterAll(async () => {
    await env.cleanup();
});
beforeEach(async () => {
    await env.clearFirestore();
});

const PUBLIC_READ = ["products", "styles", "presets", "braidPresets", "braidAddons", "codes", "reviews"];
const OWNER_ONLY = ["bookings", "shopOrders", "affiliates", "customers", "blogPosts", "emailSenders", "paymentEvents", "mail"];

describe("anonymous visitor", () => {
    it.each(PUBLIC_READ)("can read public collection %s", async (col) => {
        await seedDocs(env, { [`${col}/x`]: { a: 1 } });
        await assertSucceeds(getDoc(doc(actors.anon(env).firestore(), `${col}/x`)));
    });

    it.each(OWNER_ONLY)("cannot read or write owner-only collection %s", async (col) => {
        await seedDocs(env, { [`${col}/x`]: { a: 1 } });
        const db = actors.anon(env).firestore();
        await assertFails(getDoc(doc(db, `${col}/x`)));
        await assertFails(setDoc(doc(db, `${col}/y`), { a: 1 }));
    });

    it("cannot write public catalog collections", async () => {
        await assertFails(setDoc(doc(actors.anon(env).firestore(), "products/p1"), { name: "x" }));
        await assertFails(setDoc(doc(actors.anon(env).firestore(), "codes/DB-AFF-AAAAAA"), { active: true }));
    });

    it("cannot read user profiles or create reviews", async () => {
        await seedDocs(env, { "users/u1": { role: "client" } });
        const db = actors.anon(env).firestore();
        await assertFails(getDoc(doc(db, "users/u1")));
        await assertFails(setDoc(doc(db, "reviews/r1"), { rating: 5 }));
    });

    it("bookingDrafts: can create and update a draft (guest checkout), as the checkout page does", async () => {
        const db = actors.anon(env).firestore();
        await assertSucceeds(setDoc(doc(db, "bookingDrafts/d1"), { clientName: "Jane", clientEmail: "jane@example.com" }));
        await assertSucceeds(setDoc(doc(db, "bookingDrafts/d1"), { clientName: "Jane", provider: "stripe" }));
    });

    it("bookingDrafts: cannot read, list or delete drafts (PII is not world-readable)", async () => {
        await seedDocs(env, { "bookingDrafts/d1": { clientName: "Someone", clientEmail: "someone@example.com" } });
        const db = actors.anon(env).firestore();
        await assertFails(getDoc(doc(db, "bookingDrafts/d1")));
        await assertFails(getDocs(collection(db, "bookingDrafts")));
        await assertFails(deleteDoc(doc(db, "bookingDrafts/d1")));
    });

    it("bookingDrafts: a draft containing a password is rejected on create and on update", async () => {
        const db = actors.anon(env).firestore();
        await assertFails(setDoc(doc(db, "bookingDrafts/d2"), { clientName: "Jane", password: "secret" }));
        await seedDocs(env, { "bookingDrafts/d3": { clientName: "Jane" } });
        await assertFails(setDoc(doc(db, "bookingDrafts/d3"), { clientName: "Jane", password: "secret" }));
        await assertFails(updateDoc(doc(db, "bookingDrafts/d3"), { password: "secret" }));
    });

    it("bookingDrafts: signed-in non-staff users get the same limits as anonymous visitors", async () => {
        await seedDocs(env, { "bookingDrafts/d1": { clientName: "Someone" } });
        const db = actors.client(env).firestore();
        await assertSucceeds(setDoc(doc(db, "bookingDrafts/d9"), { clientName: "Me" }));
        await assertFails(getDoc(doc(db, "bookingDrafts/d1")));
        await assertFails(getDocs(collection(db, "bookingDrafts")));
    });
});

describe("signed-in user without a staff role", () => {
    it("cannot read or write owner-only collections or the public catalog", async () => {
        await seedDocs(env, { "bookings/b1": { a: 1 }, "products/p1": { a: 1 } });
        const db = actors.client(env).firestore();
        await assertFails(getDoc(doc(db, "bookings/b1")));
        await assertFails(setDoc(doc(db, "bookings/b2"), { a: 1 }));
        await assertFails(setDoc(doc(db, "products/p1"), { a: 2 }));
    });

    it("cannot create, edit or delete reviews (reviews are managed by staff)", async () => {
        await seedDocs(env, { "reviews/r0": { rating: 4, author: "Someone" } });
        const db = actors.client(env).firestore();
        await assertFails(setDoc(doc(db, "reviews/r1"), { rating: 5 }));
        await assertFails(setDoc(doc(db, "reviews/r0"), { rating: 1 }));
        await assertFails(deleteDoc(doc(db, "reviews/r0")));
    });

    it("can still read reviews", async () => {
        await seedDocs(env, { "reviews/r0": { rating: 4 } });
        await assertSucceeds(getDoc(doc(actors.client(env).firestore(), "reviews/r0")));
    });

    it("can create their own profile as a client, with or without an explicit role", async () => {
        const db = actors.client(env).firestore();
        await assertSucceeds(setDoc(doc(db, "users/client1"), { email: "client@example.com", role: "client" }));
        await env.clearFirestore();
        await assertSucceeds(setDoc(doc(db, "users/client1"), { email: "client@example.com" }));
    });

    it("cannot write someone else's profile", async () => {
        const db = actors.client(env).firestore();
        await assertFails(setDoc(doc(db, "users/other"), { name: "Not me" }));
    });

    it("can read their own profile but NOT other users' profiles", async () => {
        await seedDocs(env, {
            "users/client1": { email: "client@example.com", role: "client" },
            "users/other": { email: "other@example.com", role: "owner" },
        });
        const db = actors.client(env).firestore();
        await assertSucceeds(getDoc(doc(db, "users/client1")));
        await assertFails(getDoc(doc(db, "users/other")));
    });

    it("can update their own profile fields (merge) without touching the role", async () => {
        await seedDocs(env, { "users/client1": { email: "client@example.com", role: "client" } });
        const db = actors.client(env).firestore();
        await assertSucceeds(setDoc(doc(db, "users/client1"), { name: "New Name", phone: "555" }, { merge: true }));
        // Re-sending the same role (as the checkout flow does) is allowed because nothing changes.
        await assertSucceeds(setDoc(doc(db, "users/client1"), { role: "client", name: "Again" }, { merge: true }));
    });

    it("cannot create their own profile with a privileged role (owner, admin, assistant)", async () => {
        const db = actors.client(env).firestore();
        for (const role of ["owner", "admin", "assistant", "superuser"]) {
            await assertFails(setDoc(doc(db, "users/client1"), { role }));
        }
    });

    it("cannot change, add or remove their own role on an existing profile", async () => {
        const db = actors.client(env).firestore();
        await seedDocs(env, { "users/client1": { email: "client@example.com", role: "client" } });
        await assertFails(setDoc(doc(db, "users/client1"), { role: "owner" }, { merge: true }));
        await assertFails(setDoc(doc(db, "users/client1"), { role: null }, { merge: true }));
        await seedDocs(env, { "users/noRole": { email: "x@example.com" } });
        await assertFails(setDoc(doc(actors.staff(env, "noRole").firestore(), "users/noRole"), { role: "owner" }, { merge: true }));
    });

    it("self-promotion is closed: they still cannot write the catalog or owner-only data", async () => {
        const db = actors.client(env).firestore();
        await assertFails(setDoc(doc(db, "users/client1"), { role: "owner" }));
        await assertFails(setDoc(doc(db, "products/p1"), { name: "Hacked" }));
        await assertFails(setDoc(doc(db, "bookings/b1"), { status: "confirmed" }));
        await assertFails(getDoc(doc(db, "emailSenders/primary_gmail")));
    });

    it("cannot delete their own profile", async () => {
        await seedDocs(env, { "users/client1": { role: "client" } });
        await assertFails(deleteDoc(doc(actors.client(env).firestore(), "users/client1")));
    });
});

describe("staff (owner, admin, assistant)", () => {
    it("owner via the hard-coded email allowlist has full access to top-level collections", async () => {
        const db = actors.ownerByEmail(env).firestore();
        for (const col of [...OWNER_ONLY, "products", "styles", "users"]) {
            await assertSucceeds(setDoc(doc(db, `${col}/x`), { a: 1 }));
            await assertSucceeds(getDoc(doc(db, `${col}/x`)));
        }
    });

    it("the owner's Gmail account has full access once its email is verified", async () => {
        const db = actors.ownerGmail(env, true).firestore();
        for (const col of [...OWNER_ONLY, "products", "styles", "users"]) {
            await assertSucceeds(setDoc(doc(db, `${col}/x`), { a: 1 }));
            await assertSucceeds(getDoc(doc(db, `${col}/x`)));
        }
    });

    it("the owner's Gmail address gives no access while the email is unverified (anyone can sign up with an unverified address)", async () => {
        const db = actors.ownerGmail(env, false).firestore();
        for (const col of OWNER_ONLY) {
            await assertFails(setDoc(doc(db, `${col}/x`), { a: 1 }));
            await assertFails(getDoc(doc(db, `${col}/x`)));
        }
        await assertFails(setDoc(doc(db, "products/x"), { a: 1 }));
    });

    it.each(["owner", "admin", "assistant"])("a users/{uid}.role of %s has full access to top-level collections", async (role) => {
        await seedStaff(env, "staff1", role);
        const db = actors.staff(env, "staff1").firestore();
        await assertSucceeds(setDoc(doc(db, "bookings/b1"), { status: "confirmed" }));
        await assertSucceeds(getDoc(doc(db, "emailSenders/primary_gmail")));
        await assertSucceeds(setDoc(doc(db, "products/p1"), { name: "ok" }));
    });

    it("a users/{uid}.role of client or an unknown value gets no staff access", async () => {
        for (const role of ["client", "superuser"]) {
            await seedStaff(env, `u-${role}`, role);
            await assertFails(setDoc(doc(actors.staff(env, `u-${role}`).firestore(), "bookings/b1"), { a: 1 }));
        }
    });

    it("staff can still read every profile and change another user's role (dashboard admin tools)", async () => {
        await seedDocs(env, { "users/u1": { email: "u1@example.com", role: "client" } });
        const db = actors.ownerByEmail(env).firestore();
        await assertSucceeds(getDoc(doc(db, "users/u1")));
        await assertSucceeds(updateDoc(doc(db, "users/u1"), { role: "assistant" }));
        await assertSucceeds(updateDoc(doc(db, "users/u1"), { role: null }));
    });

    it("staff can create, edit and delete reviews (dashboard review manager)", async () => {
        const db = actors.ownerByEmail(env).firestore();
        await assertSucceeds(setDoc(doc(db, "reviews/r1"), { rating: 5, author: "Jane" }));
        await assertSucceeds(updateDoc(doc(db, "reviews/r1"), { rating: 4 }));
        await assertSucceeds(deleteDoc(doc(db, "reviews/r1")));
    });

    it("staff can read, list and delete booking drafts (dashboard conversion stats)", async () => {
        await seedDocs(env, { "bookingDrafts/d1": { clientName: "Someone" } });
        const db = actors.ownerByEmail(env).firestore();
        await assertSucceeds(getDoc(doc(db, "bookingDrafts/d1")));
        await assertSucceeds(getDocs(collection(db, "bookingDrafts")));
        await assertSucceeds(deleteDoc(doc(db, "bookingDrafts/d1")));
    });

    it("subcollections are denied by default, even for owners", async () => {
        const db = actors.ownerByEmail(env).firestore();
        await assertFails(setDoc(doc(db, "bookings/b1/notes/n1"), { a: 1 }));
        await assertFails(getDoc(doc(db, "bookings/b1/notes/n1")));
    });
});
