import { formatUSPhone, isValidUSPhone } from "@/src/lib/utils";
import type { BookingFormData } from "@/src/lib/bookings/useBookingDraft";

interface DetailsStepProps {
    bookingData: BookingFormData;
    update: (patch: Partial<BookingFormData>) => void;
    /** Signed-in visitors do not see the account-creation block. */
    isSignedIn: boolean;
    photoError: string | null;
    onPhotoUpload: (file: File | undefined) => void;
    onRemovePhoto: () => void;
}

export function DetailsStep({ bookingData, update, isSignedIn, photoError, onPhotoUpload, onRemovePhoto }: DetailsStepProps) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-white">Your Information</h2>
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="space-y-8">

                    {/* Name + Email */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">
                                Full Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={bookingData.name}
                                onChange={(e) => update({ name: e.target.value })}
                                className="w-full bg-[#f8f6f7] dark:bg-slate-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#9F2D5C] outline-none"
                                placeholder="Jane Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">
                                Email Address <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="email"
                                value={bookingData.email}
                                onChange={(e) => update({ email: e.target.value })}
                                className="w-full bg-[#f8f6f7] dark:bg-slate-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#9F2D5C] outline-none"
                                placeholder="jane@example.com"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ml-4 ${bookingData.phone && !isValidUSPhone(bookingData.phone) ? 'text-red-500' : 'text-slate-400'}`}>
                            Phone Number <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="tel"
                            value={bookingData.phone}
                            onChange={(e) => update({ phone: formatUSPhone(e.target.value) })}
                            className={`w-full rounded-2xl p-4 outline-none transition-all ${
                                bookingData.phone && !isValidUSPhone(bookingData.phone) 
                                ? 'bg-red-50 dark:bg-red-900/10 border-2 border-red-500 text-red-600 focus:ring-2 focus:ring-red-500 focus:border-red-500' 
                                : 'bg-[#f8f6f7] dark:bg-slate-900 border-none focus:ring-2 focus:ring-[#9F2D5C]'
                            }`}
                            placeholder="(555) 000-0000"
                        />
                        {bookingData.phone && !isValidUSPhone(bookingData.phone) && (
                            <p className="text-[10px] text-red-500 font-bold ml-4 animate-in fade-in">Please enter a valid 10-digit US phone number.</p>
                        )}
                    </div>

                    {/* Account Creation for Guest Users */}
                    {!isSignedIn && (
                        <div className="p-8 rounded-3xl bg-[#9F2D5C]/5 border border-[#9F2D5C]/10 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#9F2D5C] flex items-center justify-center shadow-lg shadow-[#9F2D5C]/20">
                                    <span className="material-icons text-white text-base">person_add</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">Create an Account</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Recommended</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                Save your appointment and speed up future bookings. You&apos;ll be able to manage your history and get referral rewards!
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Password</label>
                                    <input
                                        type="password"
                                        value={bookingData.password}
                                        onChange={(e) => update({ password: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#9F2D5C] outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="flex items-end pb-3">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={bookingData.createAccount}
                                                onChange={(e) => update({ createAccount: e.target.checked })}
                                                className="peer hidden"
                                            />
                                            <div className="w-6 h-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 peer-checked:bg-[#9F2D5C] peer-checked:border-[#9F2D5C] transition-all flex items-center justify-center">
                                                <span className="material-icons text-white text-[14px]">check</span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Apply this password</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Special Requests */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-4">Special Requests</label>
                        <textarea
                            rows={4}
                            value={bookingData.notes}
                            onChange={(e) => update({ notes: e.target.value })}
                            className="w-full bg-[#f8f6f7] dark:bg-slate-900 border-none rounded-2xl p-4 focus:ring-2 focus:ring-[#9F2D5C] outline-none resize-none"
                            placeholder="Any specifics we should know?"
                        />
                    </div>

                    {/* Inspiration Photo */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between ml-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Inspiration Photo</label>
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Optional</span>
                        </div>

                        {photoError && (
                            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl px-5 py-3 text-xs font-semibold">
                                <span className="material-icons text-sm">error_outline</span>
                                {photoError}
                            </div>
                        )}

                        {!bookingData.photoPreview ? (
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => onPhotoUpload(e.target.files?.[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className={`border-2 border-dashed rounded-2xl p-8 text-center hover:border-[#9F2D5C] hover:bg-[#9F2D5C]/5 transition-all group ${photoError ? "border-red-300 dark:border-red-700" : "border-slate-200 dark:border-slate-700"}`}>
                                    <span className="material-icons text-4xl text-slate-300 dark:text-slate-600 group-hover:text-[#9F2D5C] mb-2 block">add_a_photo</span>
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">Click to upload inspiration photo</p>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tight">JPG, PNG, WEBP · Up to 5 MB</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative group rounded-3xl overflow-hidden aspect-video bg-slate-100 dark:bg-slate-900 shadow-inner">
                                <img src={bookingData.photoPreview} alt="Inspiration Preview" className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button
                                        onClick={onRemovePhoto}
                                        className="bg-white text-red-500 p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all"
                                        aria-label="Remove photo"
                                    >
                                        <span className="material-icons">delete</span>
                                    </button>
                                    <label className="bg-white text-[#9F2D5C] p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer" aria-label="Replace photo">
                                        <span className="material-icons">refresh</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => onPhotoUpload(e.target.files?.[0])}
                                        />
                                    </label>
                                </div>
                            </div>
                        )}
                        <p className="text-[11px] text-slate-400 ml-4 italic">Show us the style you&apos;re aiming for!</p>
                    </div>
                </div>
            </div>

        </div>
    );
}
