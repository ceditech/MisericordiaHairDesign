import { config } from "dotenv";
import { resolve } from "path";

// Load env from .env.local BEFORE importing anything else
config({ path: resolve(process.cwd(), ".env.local") });

import { adminDb } from "../src/lib/firebase/admin";
import { STORE_PRODUCTS } from "../src/data/products";
import { BRAID_STYLES } from "../lib/styles";
import { REVIEWS } from "../src/data/reviews";
import { SIZE_PRESETS, LENGTH_PRESETS, DEFAULT_ADDONS } from "../src/constants/braidPresets";
import { FieldValue } from "firebase-admin/firestore";

async function main() {
    console.log("Starting data migration to Firestore...");

    const batch = adminDb.batch();
    let count = 0;

    // 1. Migrate Products
    for (const product of STORE_PRODUCTS) {
        const ref = adminDb.collection("products").doc(product.id);
        batch.set(ref, {
            ...product,
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp()
        });
        count++;
    }
    console.log(`Prepared ${STORE_PRODUCTS.length} products.`);

    // 2. Migrate Styles
    for (const style of BRAID_STYLES) {
        const ref = adminDb.collection("styles").doc(style.id);
        batch.set(ref, {
            ...style,
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp()
        });
        count++;
    }
    console.log(`Prepared ${BRAID_STYLES.length} styles.`);

    // 3. Migrate Presets
    for (const preset of SIZE_PRESETS) {
        const ref = adminDb.collection("presets").doc(preset.id);
        batch.set(ref, {
            ...preset,
            type: "size",
            updatedAt: FieldValue.serverTimestamp()
        });
        count++;
    }
    for (const preset of LENGTH_PRESETS) {
        const ref = adminDb.collection("presets").doc(preset.id);
        batch.set(ref, {
            ...preset,
            type: "length",
            updatedAt: FieldValue.serverTimestamp()
        });
        count++;
    }
    console.log(`Prepared ${SIZE_PRESETS.length + LENGTH_PRESETS.length} presets.`);

    // 3b. Migrate Braid Addons
    for (const addon of DEFAULT_ADDONS) {
        const ref = adminDb.collection("braidAddons").doc(addon.id);
        batch.set(ref, {
            ...addon,
            updatedAt: FieldValue.serverTimestamp()
        });
        count++;
    }
    console.log(`Prepared ${DEFAULT_ADDONS.length} braid addons.`);

    // 4. Migrate Reviews
    for (const review of REVIEWS) {
        const ref = adminDb.collection("reviews").doc(review.id.toString());
        batch.set(ref, {
            ...review,
            updatedAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp()
        });
        count++;
    }
    console.log(`Prepared ${REVIEWS.length} reviews.`);

    console.log(`Committing ${count} writes to Firestore...`);
    await batch.commit();
    console.log("✅ Migration complete! Business data is restored.");
}

main().catch(console.error);
