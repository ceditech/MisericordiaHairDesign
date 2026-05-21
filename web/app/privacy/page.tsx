import { LAST_UPDATED, CONTACT_EMAIL } from "@/src/content/legal";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-8">
                    Privacy Policy
                </h1>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
                        Last updated: {LAST_UPDATED}
                    </p>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Introduction
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            Dede’s Braids (“we,” “us,” or “our”) operates a hair braiding salon in Manor, Texas and provides online information, appointment booking, and related services through our website (the “Site”). This Privacy Policy explains what information we collect, how we use it, and the choices you have.
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 mt-4">
                            By using our Site or booking an appointment, you agree to the practices described in this Privacy Policy.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Information We Collect
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            We may collect the following types of information:
                        </p>

                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3">1) Information you provide directly</h3>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mb-6">
                            <li><strong>Contact details:</strong> name, email address, phone number</li>
                            <li><strong>Appointment details:</strong> selected service/style, appointment date/time, preferences, notes or special requests</li>
                            <li><strong>Uploads:</strong> inspiration photos or reference images you choose to provide (if the Site allows uploads)</li>
                            <li><strong>Messages:</strong> information you submit through contact forms or inquiries</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3">2) Payment information</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            When you pay a deposit or full service amount, payments are processed by third-party payment providers (such as Stripe and/or PayPal). We do not store your full payment card details. The payment provider may collect information necessary to complete the transaction (e.g., card type, billing details, transaction identifiers).
                        </p>

                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-3">3) Automatically collected information</h3>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                            <li><strong>Device and usage data:</strong> IP address, browser type, device identifiers, pages viewed, referring/exit pages, date/time stamps</li>
                            <li><strong>Cookies and similar technologies:</strong> used for basic site functionality, analytics, preferences (such as theme settings), and security</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            How We Use Your Information
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            We use information for the following purposes:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                            <li><strong>To provide services and appointments:</strong> schedule, confirm, and manage bookings</li>
                            <li><strong>To communicate with you:</strong> send confirmations, reminders, updates, and respond to inquiries</li>
                            <li><strong>To process payments:</strong> facilitate deposits and full payments through payment providers</li>
                            <li><strong>To improve our Site and services:</strong> analyze usage trends, enhance user experience, and troubleshoot issues</li>
                            <li><strong>To protect safety and prevent fraud:</strong> verify transactions, secure the Site, and enforce policies</li>
                            <li><strong>To comply with legal obligations:</strong> taxes, accounting, and responding to lawful requests</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            How We Share Your Information
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            We may share your information only as needed:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mb-6">
                            <li><strong>Service providers:</strong> vendors that help operate the Site (hosting, analytics, email delivery, scheduling tools, file storage)</li>
                            <li><strong>Payment processors:</strong> Stripe/PayPal or similar providers to complete transactions</li>
                            <li><strong>Legal and safety reasons:</strong> if required by law, court order, or to protect rights, safety, and security</li>
                            <li><strong>Business transfers:</strong> if we are involved in a merger, sale, or transfer of assets (your information may be transferred as part of that transaction)</li>
                        </ul>
                        <p className="text-slate-600 dark:text-slate-400 font-semibold">
                            We do not sell your personal information.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Data Retention
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            We retain personal information only for as long as necessary to:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                            <li>provide services and manage appointments,</li>
                            <li>comply with legal/accounting obligations, and</li>
                            <li>resolve disputes or enforce agreements.</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Your Choices
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Depending on your location and applicable law, you may have rights to:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mb-6">
                            <li>request access to or correction of your personal information,</li>
                            <li>request deletion of certain information, or</li>
                            <li>opt out of marketing communications.</li>
                        </ul>
                        <p className="text-slate-600 dark:text-slate-400">
                            To make a request, contact us at{" "}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-primary hover:underline transition-all">
                                {CONTACT_EMAIL}
                            </a>. We may need to verify your identity before fulfilling requests.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Cookies and Analytics
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            We may use cookies and similar technologies to:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mb-6">
                            <li>keep the Site functioning properly,</li>
                            <li>remember preferences, and</li>
                            <li>understand how visitors use the Site.</li>
                        </ul>
                        <p className="text-slate-600 dark:text-slate-400">
                            You can control cookies through your browser settings. Disabling cookies may affect Site functionality.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Children’s Privacy
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            Our Site is not intended for children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided information to us, contact us so we can delete it.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Security
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            We use reasonable safeguards to protect information. However, no website or data transmission is 100% secure. Please use caution when sharing information online.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Changes to This Privacy Policy
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            We may update this Privacy Policy from time to time. The “Last updated” date above reflects the latest version. Continued use of the Site after changes means you accept the updated policy.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Contact Us
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            If you have any questions about this Privacy Policy, please contact us at{" "}
                            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-primary hover:underline transition-all font-bold">
                                {CONTACT_EMAIL}
                            </a>
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
