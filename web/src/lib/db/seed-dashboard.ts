import { adminDb } from "../firebase/admin";
import { STORE_PRODUCTS } from "../../data/products";
import { BRAID_STYLES } from "../../../lib/styles";
import { MIGRATED_BLOG_POSTS } from "../../../data/seeding/blogPosts";
import { subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, format, addDays, isWeekend } from "date-fns";

/**
 * Seed data for the Owner Dashboard charts and stats.
 * This script populates styles, products, bookings, shop orders, and blog posts.
 */
export async function seedDashboardData() {
    console.log("Starting dashboard data seeding...");

    // 1. Seed Service Styles
    console.log("Seeding service styles...");
    const stylesBatch = adminDb.batch();
    for (const style of BRAID_STYLES) {
        const styleRef = adminDb.collection("styles").doc(style.id);
        
        // Parse price string like "$200 and up" to numeric cents
        const numericPrice = parseInt(style.price.replace(/[^0-9]/g, '')) || 0;
        const priceCents = numericPrice * 100;

        // Parse duration like "4-6 hours" to minutes
        const durationParts = style.duration.match(/\d+/g);
        const avgHours = durationParts ? (durationParts.length > 1 ? (parseInt(durationParts[0]) + parseInt(durationParts[1])) / 2 : parseInt(durationParts[0])) : 4;
        const durationMinutes = avgHours * 60;

        stylesBatch.set(styleRef, {
            ...style,
            priceCents,
            duration: durationMinutes,
            isActive: true,
            updatedAt: new Date()
        }, { merge: true });
    }
    await stylesBatch.commit();

    // 2. Get styles for bookings
    const stylesSnap = await adminDb.collection("styles").get();
    const styles = stylesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    // 2. Ensure products are in Firestore
    console.log("Seeding products...");
    const productsBatch = adminDb.batch();
    for (const product of STORE_PRODUCTS) {
        const productRef = adminDb.collection("products").doc(product.id);
        productsBatch.set(productRef, {
            ...product,
            updatedAt: new Date()
        }, { merge: true });
    }
    await productsBatch.commit();

    // 3. Seed Blog Posts
    console.log("Seeding blog posts...");
    const blogBatch = adminDb.batch();
    for (const post of MIGRATED_BLOG_POSTS) {
        const blogRef = adminDb.collection("blogPosts").doc(post.id);
        blogBatch.set(blogRef, {
            ...post,
            createdAt: post.createdAt || new Date(),
            updatedAt: post.updatedAt || new Date(),
            publishedAt: post.publishedAt || new Date(),
            isSeedData: true
        }, { merge: true });
    }
    await blogBatch.commit();

    // 4. Generate Historical Data (6 months)
    const now = new Date();
    const fiveMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: fiveMonthsAgo, end: now });

    console.log("Seeding bookings and orders for the last 6 months...");
    
    const bookingsBatch = adminDb.batch();
    const ordersBatch = adminDb.batch();
    const customersBatch = adminDb.batch();

    // Track some stats for logging
    let bookingCount = 0;
    let orderCount = 0;

    for (const month of months) {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const daysInMonth = monthEnd.getDate();

        // Generate Bookings
        const monthlyTarget = 25 + Math.floor(Math.random() * 20) + (month.getMonth() === 3 || month.getMonth() === 4 ? 20 : 0); 
        
        for (let i = 0; i < monthlyTarget; i++) {
            const day = Math.floor(Math.random() * daysInMonth) + 1;
            const date = new Date(month.getFullYear(), month.getMonth(), day);
            
            if (isWeekend(date) || Math.random() > 0.4) {
                const style = styles[Math.floor(Math.random() * styles.length)];
                const statusRoll = Math.random();
                const status = statusRoll > 0.3 ? "completed" : (statusRoll > 0.1 ? "cancelled" : "upcoming");
                
                const bookingId = `seed_booking_${format(date, 'yyyyMMdd')}_${i}`;
                const bookingRef = adminDb.collection("bookings").doc(bookingId);
                
                bookingsBatch.set(bookingRef, {
                    clientName: ["Alice", "Beatrice", "Chloe", "Danielle", "Elena", "Fatima", "Grace", "Hawa", "Imani", "Jasmine"][Math.floor(Math.random() * 10)] + " " + ["S.", "K.", "M.", "W.", "T."][Math.floor(Math.random() * 5)],
                    email: `client_${i}@example.com`,
                    phone: `555-01${Math.floor(Math.random() * 99)}`,
                    service: style.name,
                    styleId: style.id,
                    priceCents: style.priceCents || 15000,
                    status: status,
                    date: format(date, 'yyyy-MM-dd'),
                    time: `${9 + Math.floor(Math.random() * 8)}:00`,
                    createdAt: date,
                    isSeedData: true
                });
                bookingCount++;
            }
        }

        // Generate Shop Orders
        const orderTarget = 15 + Math.floor(Math.random() * 15);
        for (let j = 0; j < orderTarget; j++) {
            const day = Math.floor(Math.random() * daysInMonth) + 1;
            const date = new Date(month.getFullYear(), month.getMonth(), day);
            
            const numItems = 1 + Math.floor(Math.random() * 3);
            const items = [];
            let totalCents = 0;
            
            for (let k = 0; k < numItems; k++) {
                const product = STORE_PRODUCTS[Math.floor(Math.random() * STORE_PRODUCTS.length)];
                const qty = 1 + Math.floor(Math.random() * 2);
                items.push({
                    id: product.id,
                    name: product.name,
                    priceCents: product.priceCents,
                    quantity: qty,
                    imageUrl: product.images[0]
                });
                totalCents += product.priceCents * qty;
            }

            const orderId = `seed_order_${format(date, 'yyyyMMdd')}_${j}`;
            const orderRef = adminDb.collection("shopOrders").doc(orderId);
            
            ordersBatch.set(orderRef, {
                customerEmail: `customer_${j}@example.com`,
                customerName: `Customer ${j}`,
                items: items,
                totalCents: totalCents,
                status: "paid",
                fulfillmentStatus: Math.random() > 0.2 ? "fulfilled" : "pending",
                paymentMethod: "stripe",
                createdAt: date,
                isSeedData: true
            });
            orderCount++;
        }
    }

    await bookingsBatch.commit();
    await ordersBatch.commit();

    // Generate some Customers
    console.log("Seeding customers...");
    for (let l = 0; l < 50; l++) {
        const custId = `seed_customer_${l}`;
        const custRef = adminDb.collection("customers").doc(custId);
        customersBatch.set(custRef, {
            name: `Client ${l}`,
            email: `client_${l}@example.com`,
            totalSpent: Math.floor(Math.random() * 50000),
            lastVisit: subMonths(now, Math.floor(Math.random() * 4)),
            createdAt: subMonths(now, Math.floor(Math.random() * 12)),
            isSeedData: true
        });
    }
    await customersBatch.commit();

    console.log(`Seeding complete! Added ${styles.length} styles, ${bookingCount} bookings, ${orderCount} orders, and ${MIGRATED_BLOG_POSTS.length} blog posts.`);
    return { styles: styles.length, bookings: bookingCount, orders: orderCount, blogPosts: MIGRATED_BLOG_POSTS.length };
}
