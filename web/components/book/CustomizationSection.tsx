import type { SizePreset, LengthPreset } from "@/src/constants/braidPresets";
import type { AddonDoc } from "@/src/lib/firebase/ownerService";

export interface CustomizationValues {
    sizeId: string;
    lengthId: string;
    washingAddon: boolean;
    takeDownAddon: boolean;
}

interface CustomizationSectionProps {
    styleName?: string;
    sizePresets: SizePreset[];
    lengthPresets: LengthPreset[];
    addons: AddonDoc[];
    values: CustomizationValues;
    onChange: (patch: Partial<CustomizationValues>) => void;
}

/** Size, length and add-on choices, shown on steps 1, 2 and 4 of the booking wizard. */
export function CustomizationSection({ styleName, sizePresets, lengthPresets, addons, values, onChange }: CustomizationSectionProps) {
    return (
        <div className="mt-12 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 fade-in zoom-in duration-500">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Customize Your {styleName}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Size */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Available Size Options</label>
                    <div className="space-y-2">
                        {sizePresets.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => onChange({ sizeId: preset.id })}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${values.sizeId === preset.id ? 'border-[#9F2D5C] bg-[#9F2D5C]/5 dark:bg-[#9F2D5C]/10' : 'border-transparent bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'}`}
                            >
                                <div>
                                    <p className={`font-bold text-sm ${values.sizeId === preset.id ? 'text-[#9F2D5C]' : 'text-slate-900 dark:text-white'}`}>{preset.label}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{preset.description} ({preset.priceGuidance})</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${values.sizeId === preset.id ? 'border-[#9F2D5C] bg-[#9F2D5C]' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {values.sizeId === preset.id && <span className="material-icons text-white text-[12px]">check</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Length */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Available Length Options</label>
                    <div className="space-y-2">
                        {lengthPresets.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => onChange({ lengthId: preset.id })}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${values.lengthId === preset.id ? 'border-[#9F2D5C] bg-[#9F2D5C]/5 dark:bg-[#9F2D5C]/10' : 'border-transparent bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'}`}
                            >
                                <div>
                                    <p className={`font-bold text-sm ${values.lengthId === preset.id ? 'text-[#9F2D5C]' : 'text-slate-900 dark:text-white'}`}>{preset.label}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{preset.inches}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${values.lengthId === preset.id ? 'border-[#9F2D5C] bg-[#9F2D5C]' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {values.lengthId === preset.id && <span className="material-icons text-white text-[12px]">check</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add-ons */}
            <div className="border-t border-slate-200 dark:border-slate-700/50 pt-8 space-y-4">
                <label className="flex flex-row items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl cursor-pointer hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-800">
                    <input
                        type="checkbox"
                        checked={values.washingAddon}
                        onChange={(e) => onChange({ washingAddon: e.target.checked })}
                        className="w-6 h-6 rounded-md border-slate-300 text-[#9F2D5C] focus:ring-[#9F2D5C] bg-slate-100 dark:bg-slate-800"
                    />
                    <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">Add Washing Service (+${addons.find(a => a.id === 'wash')?.price || 25})</p>
                        <p className="text-xs text-slate-500">Start your appointment with a clean, prepped foundation.</p>
                    </div>
                </label>
                <label className="flex flex-row items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl cursor-pointer hover:shadow-md transition-shadow border border-slate-100 dark:border-slate-800">
                    <input
                        type="checkbox"
                        checked={values.takeDownAddon}
                        onChange={(e) => onChange({ takeDownAddon: e.target.checked })}
                        className="w-6 h-6 rounded-md border-slate-300 text-[#9F2D5C] focus:ring-[#9F2D5C] bg-slate-100 dark:bg-slate-800"
                    />
                    <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">Add Take Down Service (+${addons.find(a => a.id === 'take-down')?.price || 45})</p>
                        <p className="text-xs text-slate-500">Professional removal of your previous style.</p>
                    </div>
                </label>
            </div>
        </div>
    );
}
