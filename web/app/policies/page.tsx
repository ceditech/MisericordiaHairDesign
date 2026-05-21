import Link from "next/link";
import {
    LAST_UPDATED,
    CONTACT_EMAIL,
    BUSINESS_NAME,
    LOCATION,
    DEPOSIT_POLICY,
    CANCELLATION_POLICY,
    DEPOSIT_AMOUNT,
} from "@/src/content/legal";

export const metadata = {
    title: `Booking Policies | ${BUSINESS_NAME}`,
    description: `Deposit, cancellation, and booking policies for ${BUSINESS_NAME} in ${LOCATION}.`,
};

export default function PoliciesPage() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-8">
                    Booking Policies
                </h1>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
                        Last updated: {LAST_UPDATED}
                    </p>

                    {/* Table of Contents */}
                    <nav className="mb-14 p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                            On this page
                        </p>
                        <ul className="space-y-2 list-none pl-0">
                            <li>
                                <a href="#deposit-policy" className="text-brand-primary hover:underline font-semibold transition-colors">
                                    Deposit Policy
                                </a>
                            </li>
                            <li>
                                <a href="#cancellation-policy" className="text-brand-primary hover:underline font-semibold transition-colors">
                                    Cancellation Policy
                                </a>
                            </li>
                            <li>
                                <a href="#faq" className="text-brand-primary hover:underline font-semibold transition-colors">
                                    Frequently Asked Questions
                                </a>
                            </li>
                        </ul>
                    </nav>

                    {/* Deposit Policy */}
                    <section id="deposit-policy" className="mb-14 scroll-mt-24">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Deposit Policy
                        </h2>
                        <div className="bg-brand-primary/5 dark:bg-brand-primary/10 border border-brand-primary/20 rounded-2xl p-6 mb-6">
                            <p className="text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                                {DEPOSIT_POLICY}
                            </p>
                        </div>
                        <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                            <li>
                                A <strong>{DEPOSIT_AMOUNT}</strong> deposit is required at the time of booking to secure your appointment.
                            </li>
                            <li>
                                The deposit is <strong>non-refundable</strong> under all circumstances, including no-shows and late cancellations.
                            </li>
                            <li>
                                Your deposit will be credited toward your total service cost on the day of your appointment.
                            </li>
                            <li>
                                You may choose to pay the full service amount at the time of booking instead of just the deposit.
                            </li>
                        </ul>
                    </section>

                    {/* Cancellation Policy */}
                    <section id="cancellation-policy" className="mb-14 scroll-mt-24">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Cancellation Policy
                        </h2>
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-6 mb-6">
                            <p className="text-amber-800 dark:text-amber-300 font-semibold leading-relaxed">
                                {CANCELLATION_POLICY}
                            </p>
                        </div>
                        <ul className="space-y-3 text-slate-600 dark:text-slate-400">
                            <li>
                                <strong>24+ hours before your appointment:</strong> You may cancel or reschedule at no additional charge. Your deposit remains non-refundable.
                            </li>
                            <li>
                                <strong>Less than 24 hours before your appointment:</strong> A cancellation fee of 50% of the scheduled service cost ({DEPOSIT_AMOUNT}) will be charged.
                            </li>
                            <li>
                                <strong>No-shows:</strong> If you do not arrive for your scheduled appointment without prior notice, the full deposit will be forfeited.
                            </li>
                            <li>
                                <strong>Late arrivals:</strong> If you arrive more than 15 minutes late, your appointment may need to be rescheduled depending on availability, and the deposit may be forfeited.
                            </li>
                        </ul>
                    </section>

                    {/* FAQ */}
                    <section id="faq" className="mb-14 scroll-mt-24">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                            Frequently Asked Questions
                        </h2>
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    How do I reschedule my appointment?
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Please contact us at{" "}
                                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-primary hover:underline font-bold">
                                        {CONTACT_EMAIL}
                                    </a>{" "}
                                    at least 24 hours before your scheduled appointment. We will do our best to accommodate your preferred date and time. Your original deposit will be applied to the rescheduled appointment.
                                </p>
                            </div>

                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    What happens if I arrive late?
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    We understand that things happen. If you are running late, please call or text us as soon as possible. Arrivals up to 15 minutes late can generally be accommodated without changes. After 15 minutes, your appointment may need to be shortened or rescheduled depending on the stylist&apos;s schedule.
                                </p>
                            </div>

                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Can I get a refund on my deposit?
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    The {DEPOSIT_AMOUNT} deposit is non-refundable. It is charged to reserve your time slot and compensate for the blocked appointment space. However, your deposit is always credited toward the total service cost when you attend your appointment.
                                </p>
                            </div>

                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    What payment methods do you accept?
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    We accept credit and debit cards (Visa, Mastercard, American Express) through Stripe, as well as PayPal. The remaining balance at your appointment can be paid via the same methods or cash.
                                </p>
                            </div>

                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    Do I need to bring anything to my appointment?
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Just bring yourself and any inspiration photos for the style you want (you can also upload these during the booking process). We supply all braiding hair and products unless you have a specific brand preference — in that case, please bring your own and let us know in advance.
                                </p>
                            </div>

                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                    How long do braiding appointments take?
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Appointment duration depends on the style. Most services range from 2–12 hours. You can see the estimated duration for each style on our{" "}
                                    <Link href="/book" className="text-brand-primary hover:underline font-bold">
                                        booking page
                                    </Link>
                                    . Plan to be comfortable — feel free to bring snacks, a phone charger, or entertainment.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Contact */}
                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Questions?
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            If you have any questions about our policies, please contact us at{" "}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-primary hover:underline transition-all font-bold">
                                {CONTACT_EMAIL}
                            </a>{" "}
                            or visit our{" "}
                            <Link href="/contact" className="text-brand-primary hover:underline transition-all font-bold">
                                Contact page
                            </Link>
                            .
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
