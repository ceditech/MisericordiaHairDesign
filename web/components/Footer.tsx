import { CONTACT_EMAIL, CONTACT_PHONE, FULL_ADDRESS } from "@/src/content/legal";
import Link from "next/link";
import { Tooltip } from "./ui";

export default function Footer() {
    return (
        <footer className="bg-surface text-text-primary pt-20 pb-10 border-t border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-2">
                        <span className="text-2xl font-extrabold tracking-tighter text-brand-secondary mb-6 block">
                            MISERICORDIA
                            <span className="text-text-primary"> HAIR DESIGNS</span>
                        </span>
                        <p className="text-text-secondary max-w-xs mb-8">
                            Professional African American braiding service focusing on hair health, creativity, and customer
                            satisfaction since 2018.
                        </p>
                        <div className="flex gap-4">
                            {/* Facebook */}
                            <Tooltip content="Follow on Facebook" position="top">
                                <a
                                    href="https://www.facebook.com/108665884265377"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-surface-dark/10 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all duration-300"
                                    aria-label="Facebook"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.893 12.89l.443-2.89h-2.773v-1.875c0-.79.387-1.563 1.63-1.563h1.26v-2.46s-1.144-.196-2.238-.196c-2.284 0-3.777 1.385-3.777 3.89V12h-2.54v2.89h2.54v6.988a10.04 10.04 0 003.124 0v-6.987h2.33z" />
                                    </svg>
                                </a>
                            </Tooltip>
                            {/* Instagram */}
                            <Tooltip content="Follow on Instagram" position="top">
                                <a
                                    href="https://www.instagram.com/dedesbraids/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-surface-dark/10 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all duration-300"
                                    aria-label="Instagram"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.478 2 2 6.478 2 12s4.478 10 10 10 10-4.478 10-10S17.522 2 12 2zm5.762 12.335c.025-.45.038-1.262.038-2.435s-.013-1.985-.038-2.435c-.052-1.066-.37-1.89-.953-2.474-.584-.584-1.408-.901-2.474-.953C13.885 6.013 13.073 6 11.9 6s-1.985.013-2.435.038c-1.066.052-1.89.37-2.474.953-.584.584-.901 1.408-.953 2.474C6.013 9.915 6 10.727 6 11.9s.013 1.985.038 2.435c.052 1.066.37 1.89.953 2.474.584.584 1.408.901 2.474.953.45.025 1.262.038 2.435.038s1.985-.013 2.435-.038c1.066-.052 1.89-.37 2.474-.953.584-.584.901-1.408.953-2.474zM11.9 7.06l-.588-.004a41.691 41.691 0 00-.81 0c-.185.003-.432.01-.742.023a6.09 6.09 0 00-.79.077 3.08 3.08 0 00-.55.142 1.993 1.993 0 00-.676.446c-.195.195-.343.42-.446.676a3.08 3.08 0 00-.142.55 1.993 1.993 0 00-.676.446c-.195.195-.343.42-.446.676a3.08 3.08 0 00-.142.55 3.08 3.08 0 00-.142.55 6.09 6.09 0 00-.077.79c-.012.31-.02.557-.023.742-.002.184-.002.454 0 .81l.004.588-.004.588c-.002.356-.002.626 0 .81.003.185.01.432.023.742s.039.573.077.79c.039.219.086.402.142.55a2.001 2.001 0 001.122 1.122c.148.056.332.103.55.142.217.038.48.064.79.077.31.012.557.02.742.023.184.002.454.002.81 0l.588-.004.588.004c.356.002.626.002.81 0 .185-.003.432-.01.742-.023a6.09 6.09 0 00.79-.077c.219-.039.402-.086.55-.142a2.001 2.001 0 001.122-1.122c.056-.148.103-.332.142-.55a6.09 6.09 0 00.077-.79c.012-.31.02-.557.023-.742.002-.184.002-.454 0-.81l-.004-.588.004-.588c.002-.356.002-.626 0-.81-.003-.185-.01-.432-.023-.742a6.09 6.09 0 00-.077-.79 3.083 3.083 0 00-.142-.55 1.993 1.993 0 00-.446-.676 1.992 1.992 0 00-.676-.446 3.08 3.08 0 00-.55-.142 6.09 6.09 0 00-.79-.077 28.51 28.51 0 00-.742-.023 41.691 41.691 0 00-.81 0l-.588.004zm3.65 2.19a.68.68 0 00.207-.5.68.68 0 00-.208-.5.68.68 0 00-.5-.207.68.68 0 00-.499.208.68.68 0 00-.207.5c0 .194.07.36.207.499a.68.68 0 00.5.207.68.68 0 00.5-.207zm-.623 2.65c0 .84-.295 1.554-.884 2.143a2.918 2.918 0 01-2.143.884c-.84 0-1.554-.295-2.143-.884a2.918 2.918 0 01-.884-2.143c0-.84.295-1.554.884-2.143a2.919 2.919 0 012.143-.884c.84 0 1.554.295 2.143.884.59.589.884 1.303.884 2.143zm-1.06 0a1.89 1.89 0 00-.577-1.39 1.895 1.895 0 00-1.39-.577c-.543 0-1.006.192-1.39.576a1.895 1.895 0 00-.577 1.391c0 .543.192 1.006.576 1.39.385.385.848.577 1.391.577s1.006-.192 1.39-.577a1.89 1.89 0 00.577-1.39z" />
                                    </svg>
                                </a>
                            </Tooltip>
                            {/* TikTok */}
                            <Tooltip content="Follow on TikTok" position="top">
                                <a
                                    href="https://www.tiktok.com/@dedesbraids"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-surface-dark/10 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all duration-300"
                                    aria-label="TikTok"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.972 8.87a3.5 3.5 0 0 1-2.654-1.448v4.932c0 2.014-1.632 3.646-3.646 3.646s-3.646-1.632-3.646-3.646 1.632-3.646 3.646-3.646c.055 0 .109.004.162.011v1.797a1.864 1.864 0 0 0-.162-.007c-1.028 0-1.86 0.832-1.86 1.86s.832 1.86 1.86 0.833 0 1.86-1.84 0 1.86-0.832 1.86-1.86V6h1.719c.162 1.541 1.405 2.745 2.951 2.858v1.997c-.098 0.009-.197 0.014-.296 0.015z" />
                                    </svg>
                                </a>
                            </Tooltip>
                            {/* Yelp */}
                            <Tooltip content="View on Yelp" position="top">
                                <a
                                    href="https://www.yelp.com/biz/qsQ8HcD94A0PBK6GY3KoIw"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-surface-dark/10 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all duration-300"
                                    aria-label="Yelp"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.6-1.346l2.91 0.945s0.4 0.073 0.4 0.364c0 0.16-.06.31-.146.4l-1.636 2.582a0.814 0.814 0 0 1-0.436 0.182h-0.473l-1.564-2.618s-0.182-0.364 0.037-0.582c0.218-0.218 0.472-0.109 0.509-0.145l0.037-0.436s-0.145-0.255 0.145-0.182zm-8.545 13.091l0.182-2.072a0.688 0.688 0 0 1 0.29-0.364s0.4-0.145 0.582-0.036l2.619 1.31s0.4 0.181 0.4 0.508c-0.037 0.437-0.219 0.437-0.364 0.51l-3.055 0.654s-0.436 0.146-0.581-0.072a0.971 0.971 0 0 1-0.073-0.509zm4.945-3.236l-2.51-3.418s-0.363-0.4-0.181-0.691a0.64 0.64 0 0 1 0.363-0.291l2.4-0.873s0.108-0.036 0.218-0.145c0.364 0.218 0.255 0.655 0.255 0.655l0.036 4.145s-0.072 0.51-0.4 0.582c-0.328 0.072-0.581-0.182-0.581-0.182zm1.419 0.582l1.382 1.636a0.677 0.677 0 0 1 0.072 0.473c-0.072 0.218-0.472 0.364-0.472 0.364l-2.91 0.836s-0.4 0.072-0.545-0.182c-0.145-0.255 0-0.51 0.037-0.436l1.636-2.582s0.145-0.364 0.436-0.327c0.152 0.002 0.29 0.085 0.364 0.218zm-1.783 3.491l-2.036-0.655a0.6 0.6 0 0 1-0.291-0.364c-0.073-0.218 0.182-0.545 0.182-0.545l2.036-2.255s0.327-0.29 0.582-0.145c0.254 0.145 0.254 0.436 0.218 0.436l-0.036 3.018s0.036 0.437-0.219 0.51a1.2 1.2 0 0 1-0.436 0z" />
                                    </svg>
                                </a>
                            </Tooltip>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold mb-6 text-text-primary">Quick Links</h4>
                        <ul className="space-y-4 text-text-secondary">
                            <li>
                                <Link href="/#services" className="hover:text-text-primary transition-colors">
                                    All Services
                                </Link>
                            </li>
                            <li>
                                <Link href="/our-styles" className="hover:text-text-primary transition-colors">
                                    Our Styles
                                </Link>
                            </li>
                            <li>
                                <Link href="/products" className="hover:text-text-primary transition-colors">
                                    Products
                                </Link>
                            </li>
                            <li>
                                <Link href="/affiliate" className="hover:text-text-primary transition-colors">
                                    Affiliate Program
                                </Link>
                            </li>
                            <li>
                                <Link href="/book" className="hover:text-text-primary transition-colors">
                                    Pricing List
                                </Link>
                            </li>
                            <li>
                                <Link href="/policies" className="hover:text-text-primary transition-colors">
                                    Booking Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold mb-6 text-text-primary">Contact</h4>
                        <ul className="space-y-4 text-text-secondary">
                            <li className="flex items-start gap-3">
                                <span className="material-icons text-brand-secondary text-sm mt-0.5">location_on</span>
                                <span className="whitespace-pre-line">
                                    {FULL_ADDRESS.replace(/Manor/, '\nManor')}
                                </span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="material-icons text-brand-secondary text-sm">phone</span>
                                <a href={`tel:${CONTACT_PHONE.replace(/\D/g, '')}`} className="hover:text-text-primary transition-colors">
                                    {CONTACT_PHONE}
                                </a>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="material-icons text-brand-secondary text-sm">email</span>
                                <a
                                    href={`mailto:${CONTACT_EMAIL}`}
                                    className="hover:text-text-primary transition-colors"
                                >
                                    {CONTACT_EMAIL}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-text-secondary text-sm">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
                        <p>© {new Date().getFullYear()} Misericordia Hair Designs. All rights reserved.</p>
                        <span className="hidden md:inline opacity-20">|</span>
                        <p>
                            Designed and Developed by{" "}
                            <a
                                href="https://edxmediagroup.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-brand-secondary transition-colors font-medium"
                            >
                                EDX Web Studio
                            </a>
                        </p>
                    </div>
                    <div className="flex gap-8">
                        <Link href="/privacy" className="hover:text-white transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/terms" className="hover:text-white transition-colors">
                            Terms of Service
                        </Link>
                        <Link href="/policies" className="hover:text-white transition-colors">
                            Policies
                        </Link>
                    </div>
                </div>
            </div>
        </footer >
    );
}
