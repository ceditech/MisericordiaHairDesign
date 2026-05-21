import { LAST_UPDATED, CONTACT_EMAIL, DEPOSIT_POLICY, CANCELLATION_POLICY } from "@/src/content/legal";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-8">
                    Terms of Service
                </h1>
                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-lg text-slate-600 dark:text-slate-400 mb-10">
                        Last updated: {LAST_UPDATED}
                    </p>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Agreement to Terms
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            These Terms of Service (“Terms”) govern your access to and use of the Dede’s Braids website (the “Site”) and your booking of services with Dede’s Braids (“we,” “us,” our”). By using the Site or booking an appointment, you agree to these Terms. If you do not agree, do not use the Site.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Use License
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            Unless otherwise stated, the Site and its content (text, images, design elements, logos) are owned by or licensed to Dede’s Braids and are protected by intellectual property laws.
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 mb-6 font-semibold">
                            You may:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mb-6">
                            <li>view and use the Site for personal, non-commercial purposes, and</li>
                            <li>book services and communicate with us through the Site.</li>
                        </ul>
                        <p className="text-slate-600 dark:text-slate-400 mb-4 font-semibold">
                            You may not:
                        </p>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                            <li>copy, reproduce, distribute, or exploit Site content for commercial purposes without our written permission,</li>
                            <li>attempt to reverse engineer or disrupt the Site, or</li>
                            <li>use the Site for unlawful or harmful activities.</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Service Terms
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4 italic">
                            (Fully professionally licensed to operate in Texas)
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            Dede’s Braids provides hair braiding services and related styling services. We operate as a professionally licensed business in Texas.
                        </p>

                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Appointments & Booking</h3>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mb-8">
                            <li>Appointments may be booked online through the Site (or other approved channels).</li>
                            <li>You are responsible for providing accurate contact and booking information.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Deposits and Payments</h3>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mb-8">
                            <li>We may require a deposit and/or full payment to secure an appointment.</li>
                            <li>Payments may be processed through third-party payment providers such as Stripe and/or PayPal.</li>
                            <li>By submitting payment, you authorize the charge according to your selected option.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Client Responsibilities</h3>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2 mb-8">
                            <li>Please arrive on time for your appointment. Late arrival may reduce service time or require rescheduling.</li>
                            <li>If you have allergies, sensitivities, scalp conditions, or special requirements, inform us in advance.</li>
                            <li>If you provide inspiration photos, you confirm you have the right to share them.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Service Outcomes</h3>
                        <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 space-y-2">
                            <li>Hair outcomes can vary based on hair type, length, condition, and maintenance. We do our best to meet your requested style, but results may vary.</li>
                            <li>If you have concerns about a service, please contact us promptly so we can discuss appropriate next steps.</li>
                        </ul>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Cancellation Policy
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                            {DEPOSIT_POLICY}
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 font-bold border-l-4 border-brand-primary pl-4 py-2 bg-brand-primary/5">
                            {CANCELLATION_POLICY}
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            No-Show / Late Policy
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            If you do not show up for your appointment or arrive too late to complete the service, you may be charged fees consistent with our booking policies, and/or the appointment may be canceled or rescheduled at our discretion.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Third-Party Services and Links
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            The Site may integrate or link to third-party services (such as payment processors). We are not responsible for third-party content, policies, or practices. Your use of third-party services is governed by their terms and policies.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Disclaimers
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            The Site is provided on an “as is” and “as available” basis. We do not guarantee the Site will be uninterrupted, error-free, or free of harmful components.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Limitation of Liability
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            To the fullest extent permitted by law, Dede’s Braids is not liable for indirect, incidental, special, or consequential damages arising from use of the Site or services. Our total liability for any claim related to the Site or services will not exceed the amount you paid to us for the relevant service.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Changes to These Terms
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            We may update these Terms from time to time. The “Last updated” date will reflect the current version. Continued use of the Site after changes means you accept the updated Terms.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                            Contact Us
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            If you have any questions about these Terms, please contact us at{" "}
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
