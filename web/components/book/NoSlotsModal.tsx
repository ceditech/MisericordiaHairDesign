import { Modal } from "@/components/ui";
import { CONTACT_PHONE } from "@/src/content/legal";

interface NoSlotsModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string;
    styleDuration?: string;
}

export function NoSlotsModal({ isOpen, onClose, date, styleDuration }: NoSlotsModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="No Slots Available">
            <div className="flex flex-col items-center justify-center text-center pb-4">
                <div className="w-16 h-16 bg-[#9F2D5C]/10 rounded-full flex items-center justify-center mb-6">
                    <span className="material-icons text-[#9F2D5C] text-3xl">event_busy</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                    We&apos;re sorry, but there are no available slots for <strong className="text-slate-900 dark:text-white">{date}</strong>.
                    This may be because we are fully booked, or the remaining time before our <strong>9:00 PM</strong> closing time is not enough to complete your selected style (<span className="text-[#9F2D5C] font-semibold">{styleDuration}</span>).
                </p>
                <button
                    onClick={onClose}
                    className="w-full bg-[#9F2D5C] text-white py-4 rounded-xl font-bold hover:bg-[#8A264F] transition-colors shadow-md hover:shadow-lg"
                >
                    Select Another Day
                </button>
                <div className="mt-6 p-4 rounded-xl bg-[#9F2D5C]/5 border border-[#9F2D5C]/20 flex items-start gap-3 text-left">
                    <div className="relative flex h-3 w-3 mt-1 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9F2D5C] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#9F2D5C]"></span>
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        <strong className="text-[#9F2D5C] block mb-0.5">Need Help or need urgent services?</strong>
                        Please call <a href={`tel:${CONTACT_PHONE.replace(/\D/g, '')}`} className="font-bold text-[#9F2D5C] hover:underline">{CONTACT_PHONE}</a>, or email <a href="mailto:mariefleurekpe@gmail.com" className="font-bold text-[#9F2D5C] hover:underline">mariefleurekpe@gmail.com</a>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
