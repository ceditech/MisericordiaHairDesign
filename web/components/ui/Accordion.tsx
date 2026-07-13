"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    isOpen?: boolean;
    onToggle?: () => void;
}

export function AccordionItem({ title, children, isOpen, onToggle }: AccordionItemProps) {
    return (
        <div className="border-b border-slate-100 dark:border-slate-800 last:border-none">
            <button
                onClick={onToggle}
                className="w-full py-6 flex items-center justify-between text-left group"
                suppressHydrationWarning
            >
                <span className="font-bold text-slate-900 dark:text-white group-hover:text-[#9F2D5C] transition-colors">
                    {title}
                </span>
                <ChevronDown
                    size={20}
                    className={cn(
                        "text-slate-400 transition-transform duration-300",
                        isOpen && "rotate-180 text-[#9F2D5C]"
                    )}
                />
            </button>
            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isOpen ? "max-h-[500px] pb-6 opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium pr-8">
                    {children}
                </div>
            </div>
        </div>
    );
}

export function Accordion({ items }: { items: { title: string; content: React.ReactNode }[] }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-4 sm:p-8 shadow-sm">
            {items.map((item, idx) => (
                <AccordionItem
                    key={idx}
                    title={item.title}
                    isOpen={openIndex === idx}
                    onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
                >
                    {item.content}
                </AccordionItem>
            ))}
        </div>
    );
}
