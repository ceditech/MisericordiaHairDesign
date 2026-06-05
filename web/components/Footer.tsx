import { CONTACT_EMAIL, CONTACT_PHONE, FULL_ADDRESS } from "@/src/content/legal";
import Link from "next/link";
import { Tooltip } from "./ui";

export default function Footer() {
    return (
        <footer className="bg-[#3A0F1F] text-[#FFF8EF] pt-20 pb-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-2">
                        {/* Brand name: Rose Wine + Warm Ivory */}
                        <span className="text-2xl font-extrabold tracking-tighter mb-6 block">
                            <span className="text-[#9F2D5C]">MISERICORDIA</span>
                            <span className="text-[#FFF8EF]"> HAIR DESIGNS</span>
                        </span>
                        <p className="text-[#C9A8B2] max-w-xs mb-8 leading-relaxed">
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
                                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#9F2D5C] hover:text-white transition-all duration-300"
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
                                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#9F2D5C] hover:text-white transition-all duration-300"
                                    aria-label="Instagram"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.478 2 2 6.478 2 12s4.478 10 10 10 10-4.478 10-10S17.522 2 12 2zm5.762 12.335c.025-.45.038-1.262.038-2.435s-.013-1.985-.038-2.435c-.052-1.066-.37-1.89-.953-2.474-.584-.584-1.408-.901-2.474-.953C13.885 6.013 13.073 6 11.9 6s-1.985.013-2.435.038c-1.066.052-1.89.37-2.474.953-.584.584-.901 1.408-.953 2.474C6.013 9.915 6 10.727 6 11.9s.013 1.985.038 2.435c.052 1.066.37 1.89.953 2.474.584.584 1.408.901 2.474.953.45.025 1.262.038 2.435.038s1.985-.013 2.435-.038c1.066-.052 1.89-.37 2.474-.953.584-.584.901-1.408.953-2.474zM11.9 7.06c-.196-.002-.39-.003-.588-.004a41.691 41.691 0 00-.81 0c-.185.003-.432.01-.742.023a6.09 6.09 0 00-.79.077 3.08 3.08 0 00-.55.142 1.993 1.993 0 00-.676.446c-.195.195-.343.42-.446.676a3.08 3.08 0 00-.142.55 6.09 6.09 0 00-.077.79c-.012.31-.02.557-.023.742-.002.184-.002.454 0 .81l.004.588-.004.588c-.002.356-.002.626 0 .81.003.185.01.432.023.742s.039.573.077.79c.039.219.086.402.142.55a2.001 2.001 0 001.122 1.122c.148.056.332.103.55.142.217.038.48.064.79.077.31.012.557.02.742.023.184.002.454.002.81 0l.588-.004.588.004c.356.002.626.002.81 0 .185-.003.432-.01.742-.023a6.09 6.09 0 00.79-.077c.219-.039.402-.086.55-.142a2.001 2.001 0 001.122-1.122c.056-.148.103-.332.142-.55a6.09 6.09 0 00.077-.79c.012-.31.02-.557.023-.742.002-.184.002-.454 0-.81l-.004-.588.004-.588c.002-.356.002-.626 0-.81-.003-.185-.01-.432-.023-.742a6.09 6.09 0 00-.077-.79 3.083 3.083 0 00-.142-.55 1.993 1.993 0 00-1.122-1.122 3.08 3.08 0 00-.55-.142 6.09 6.09 0 00-.79-.077 28.51 28.51 0 00-.742-.023 41.691 41.691 0 00-.81 0l-.588.004zm3.65 2.19a.68.68 0 000-1a.68.68 0 00-.999.001.68.68 0 00.5 1.206.68.68 0 00.5-.207zm-.623 2.65c0 .84-.295 1.554-.884 2.143a2.918 2.918 0 01-2.143.884c-.84 0-1.554-.295-2.143-.884a2.918 2.918 0 01-.884-2.143c0-.84.295-1.554.884-2.143a2.919 2.919 0 012.143-.884c.84 0 1.554.295 2.143.884.59.589.884 1.303.884 2.143zm-1.06 0a1.89 1.89 0 00-.577-1.39 1.895 1.895 0 00-1.39-.577c-.543 0-1.006.192-1.39.576a1.895 1.895 0 00-.577 1.391c0 .543.192 1.006.576 1.39.385.385.848.577 1.391.577s1.006-.192 1.39-.577a1.89 1.89 0 00.577-1.39z" />
                                    </svg>
                                </a>
                            </Tooltip>
                            {/* TikTok */}
                            <Tooltip content="Follow on TikTok" position="top">
                                <a
                                    href="https://www.tiktok.com/@dedesbraids"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#9F2D5C] hover:text-white transition-all duration-300"
                                    aria-label="TikTok"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.28 8.28 0 004.84 1.55V6.87a4.85 4.85 0 01-1.07-.18z" />
                                    </svg>
                                </a>
                            </Tooltip>
                            {/* Yelp */}
                            <Tooltip content="View on Yelp" position="top">
                                <a
                                    href="https://www.yelp.com/biz/qsQ8HcD94A0PBK6GY3KoIw"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#9F2D5C] hover:text-white transition-all duration-300"
                                    aria-label="Yelp"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 2C6.478 2 2 6.478 2 12s4.478 10 10 10 10-4.478 10-10S17.522 2 12 2zm-1.26 14.47c-.1.35-.42.53-.77.43l-1.76-.52a.63.63 0 01-.44-.77l.68-2.33c.1-.35.44-.54.79-.43l1.77.52c.35.1.54.44.43.79l-.7 2.31zm-2.2-4.93a.63.63 0 01-.78-.44l-.5-1.74c-.1-.35.09-.71.44-.81l2.31-.7c.35-.1.71.09.81.44l.5 1.74c.1.35-.09.71-.44.81l-2.34.7zm4.34 5.62c0 .37-.3.67-.67.67h-1.82a.67.67 0 01-.67-.67v-2.43c0-.37.3-.67.67-.67h1.82c.37 0 .67.3.67.67v2.43zm1.56-6.13l-1.74.5a.63.63 0 01-.78-.43l-.5-1.74c-.1-.35.09-.71.44-.81l1.74-.5c.35-.1.71.09.81.44l.5 1.74c.1.35-.09.71-.47.8zm1.93 5.48l-1.77.52c-.35.1-.69-.08-.79-.43l-.7-2.31c-.1-.35.09-.69.43-.79l1.77-.52c.35-.1.69.08.79.43l.7 2.31c.1.35-.08.69-.43.79z" />
                                    </svg>
                                </a>
                            </Tooltip>
                        </div>
                    </div>

                    <div>
                        {/* Section heading in Champagne Gold */}
                        <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-6 text-[#D8A75F]">Quick Links</h4>
                        <ul className="space-y-4 text-[#C9A8B2]">
                            <li><Link href="/#services" className="hover:text-[#FFF8EF] transition-colors">All Services</Link></li>
                            <li><Link href="/our-styles" className="hover:text-[#FFF8EF] transition-colors">Our Styles</Link></li>
                            <li><Link href="/products" className="hover:text-[#FFF8EF] transition-colors">Products</Link></li>
                            <li><Link href="/affiliate" className="hover:text-[#FFF8EF] transition-colors">Affiliate Program</Link></li>
                            <li><Link href="/book" className="hover:text-[#FFF8EF] transition-colors">Pricing List</Link></li>
                            <li><Link href="/policies" className="hover:text-[#FFF8EF] transition-colors">Booking Policy</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-6 text-[#D8A75F]">Contact</h4>
                        <ul className="space-y-4 text-[#C9A8B2]">
                            <li className="flex items-start gap-3">
                                <span className="material-icons text-[#D8A75F] text-sm mt-0.5">location_on</span>
                                <span className="whitespace-pre-line">
                                    {FULL_ADDRESS.replace(/Manor/, '\nManor')}
                                </span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="material-icons text-[#D8A75F] text-sm">phone</span>
                                <a href={`tel:${CONTACT_PHONE.replace(/\D/g, '')}`} className="hover:text-[#FFF8EF] transition-colors">
                                    {CONTACT_PHONE}
                                </a>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="material-icons text-[#D8A75F] text-sm">email</span>
                                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-[#FFF8EF] transition-colors">
                                    {CONTACT_EMAIL}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[#C9A8B2] text-sm">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
                        <p>© {new Date().getFullYear()} Misericordia Hair Designs. All rights reserved.</p>
                        <span className="hidden md:inline opacity-20">|</span>
                        <p>
                            Designed and Developed by{" "}
                            <a
                                href="https://edxmediagroup.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#C9A8B2] hover:text-[#D8A75F] transition-colors font-medium"
                            >
                                EDX Web Studio
                            </a>
                        </p>
                    </div>
                    <div className="flex gap-8">
                        <Link href="/privacy" className="hover:text-[#FFF8EF] transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-[#FFF8EF] transition-colors">Terms of Service</Link>
                        <Link href="/policies" className="hover:text-[#FFF8EF] transition-colors">Policies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
