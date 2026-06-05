"use client";

import { useState } from "react";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/src/lib/firebase/client";
import { STORE_PRODUCTS } from "@/src/data/products";
import { BRAID_STYLES } from "@/lib/styles";
import { REVIEWS } from "@/src/data/reviews";
import { SIZE_PRESETS, LENGTH_PRESETS } from "@/src/constants/braidPresets";
import { Button, Card, Badge } from "@/components/ui";
import { Database, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const db = getDb();

export default function MigratePage() {
    const [status, setStatus] = useState<{
        products: 'idle' | 'loading' | 'success' | 'error';
        styles: 'idle' | 'loading' | 'success' | 'error';
        presets: 'idle' | 'loading' | 'success' | 'error';
        reviews: 'idle' | 'loading' | 'success' | 'error';
    }>({
        products: 'idle',
        styles: 'idle',
        presets: 'idle',
        reviews: 'idle'
    });

    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const migrateReviews = async () => {
        setStatus(prev => ({ ...prev, reviews: 'loading' }));
        addLog("Starting Reviews migration...");
        try {
            const batch = writeBatch(db);
            REVIEWS.forEach((review) => {
                const docRef = doc(collection(db, "reviews"), review.id.toString());
                batch.set(docRef, {
                    ...review,
                    updatedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                });
            });
            await batch.commit();
            addLog(`Successfully migrated ${REVIEWS.length} reviews.`);
            setStatus(prev => ({ ...prev, reviews: 'success' }));
        } catch (err: any) {
            addLog(`Error migrating reviews: ${err.message}`);
            setStatus(prev => ({ ...prev, reviews: 'error' }));
        }
    };

    const migrateProducts = async () => {
        setStatus(prev => ({ ...prev, products: 'loading' }));
        addLog("Starting Products migration...");
        try {
            const batch = writeBatch(db);
            STORE_PRODUCTS.forEach((product) => {
                const docRef = doc(collection(db, "products"), product.id);
                batch.set(docRef, {
                    ...product,
                    updatedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                });
            });
            await batch.commit();
            addLog(`Successfully migrated ${STORE_PRODUCTS.length} products.`);
            setStatus(prev => ({ ...prev, products: 'success' }));
        } catch (err: any) {
            addLog(`Error migrating products: ${err.message}`);
            setStatus(prev => ({ ...prev, products: 'error' }));
        }
    };

    const migrateStyles = async () => {
        setStatus(prev => ({ ...prev, styles: 'loading' }));
        addLog("Starting Braiding Styles migration...");
        try {
            const batch = writeBatch(db);
            BRAID_STYLES.forEach((style) => {
                const docRef = doc(collection(db, "styles"), style.id);
                batch.set(docRef, {
                    ...style,
                    updatedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                });
            });
            await batch.commit();
            addLog(`Successfully migrated ${BRAID_STYLES.length} styles.`);
            setStatus(prev => ({ ...prev, styles: 'success' }));
        } catch (err: any) {
            addLog(`Error migrating styles: ${err.message}`);
            setStatus(prev => ({ ...prev, styles: 'error' }));
        }
    };

    const migratePresets = async () => {
        setStatus(prev => ({ ...prev, presets: 'loading' }));
        addLog("Starting Presets migration...");
        try {
            const batch = writeBatch(db);
            
            // Size Presets
            SIZE_PRESETS.forEach((preset) => {
                const docRef = doc(collection(db, "presets"), preset.id);
                batch.set(docRef, { ...preset, type: 'size', updatedAt: serverTimestamp() });
            });

            // Length Presets
            LENGTH_PRESETS.forEach((preset) => {
                const docRef = doc(collection(db, "presets"), preset.id);
                batch.set(docRef, { ...preset, type: 'length', updatedAt: serverTimestamp() });
            });

            await batch.commit();
            addLog(`Successfully migrated ${SIZE_PRESETS.length + LENGTH_PRESETS.length} presets.`);
            setStatus(prev => ({ ...prev, presets: 'success' }));
        } catch (err: any) {
            addLog(`Error migrating presets: ${err.message}`);
            setStatus(prev => ({ ...prev, presets: 'error' }));
        }
    };

    const migrateAll = async () => {
        await migrateProducts();
        await migrateStyles();
        await migratePresets();
        await migrateReviews();
    };

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-[#9F2D5C]/10 flex items-center justify-center text-[#9F2D5C]">
                    <Database size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                        Database Migration Tool
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        Syncing Local Content to Firestore
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <MigrationCard 
                    title="Products" 
                    count={STORE_PRODUCTS.length} 
                    status={status.products} 
                    onMigrate={migrateProducts}
                />
                <MigrationCard 
                    title="Braid Styles" 
                    count={BRAID_STYLES.length} 
                    status={status.styles} 
                    onMigrate={migrateStyles}
                />
                <MigrationCard 
                    title="Presets" 
                    count={SIZE_PRESETS.length + LENGTH_PRESETS.length} 
                    status={status.presets} 
                    onMigrate={migratePresets}
                />
                <MigrationCard 
                    title="Reviews" 
                    count={REVIEWS.length} 
                    status={status.reviews} 
                    onMigrate={migrateReviews}
                />
            </div>

            <div className="mb-12">
                 <Button 
                    onClick={migrateAll}
                    className="w-full h-16 rounded-3xl bg-[#9F2D5C] hover:bg-[#B8326A] text-white font-black text-lg gap-3 shadow-xl shadow-[#9F2D5C]/20"
                >
                    Run Full Migration
                    <ArrowRight size={20} />
                </Button>
            </div>

            <Card className="p-8 rounded-[2rem] bg-slate-900 border-none">
                <h3 className="text-white font-black italic uppercase tracking-tighter mb-4 flex items-center gap-2">
                    Migration Logs
                    <Badge className="bg-white/10 text-white/60 border-none">{logs.length}</Badge>
                </h3>
                <div className="font-mono text-xs text-emerald-400 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {logs.length === 0 && <p className="text-slate-600 italic">No logs yet...</p>}
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-2">
                            <span className="text-slate-600 shrink-0">[{i+1}]</span>
                            <span>{log}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </main>
    );
}

function MigrationCard({ title, count, status, onMigrate }: any) {
    return (
        <Card className="p-6 rounded-[2rem] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center text-center">
            <h3 className="font-black italic uppercase tracking-tighter mb-1">{title}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
                {count} items found
            </p>
            
            <div className="mb-8">
                {status === 'idle' && <Database size={40} className="text-slate-200" />}
                {status === 'loading' && <Loader2 size={40} className="text-[#9F2D5C] animate-spin" />}
                {status === 'success' && <CheckCircle2 size={40} className="text-emerald-500" />}
                {status === 'error' && <AlertCircle size={40} className="text-rose-500" />}
            </div>

            <Button 
                variant="secondary" 
                onClick={onMigrate}
                disabled={status === 'loading' || status === 'success'}
                className="w-full rounded-2xl font-bold text-xs uppercase tracking-widest"
            >
                {status === 'success' ? 'Migrated' : 'Migrate'}
            </Button>
        </Card>
    );
}
