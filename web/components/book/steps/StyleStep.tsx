import type { ReactNode } from "react";
import type { BraidStyle } from "@/src/lib/styles";
import { Skeleton } from "@/components/ui";

interface StyleStepProps {
    styles: BraidStyle[];
    loadingStyles: boolean;
    selectedStyle: BraidStyle | null;
    onSelectStyle: (style: BraidStyle) => void;
    /** The size, length and add-on block, shown once a style is chosen. */
    customization: ReactNode;
}

export function StyleStep({ styles, loadingStyles, selectedStyle, onSelectStyle, customization }: StyleStepProps) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10">
                <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">Select Braid Style</h2>
                <p className="text-lg text-slate-500 dark:text-slate-400">Choose the perfect look for your next appointment.</p>
            </div>

            {loadingStyles ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="aspect-[4/5] rounded-[2rem]" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {styles.map((style) => (
                        <div
                            key={style.id}
                            onClick={() => onSelectStyle(style)}
                            className={`group relative bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.03] border-4 cursor-pointer ${selectedStyle?.id === style.id ? "border-[#9F2D5C]" : "border-transparent"}`}
                        >
                            <div className="aspect-[4/5] relative overflow-hidden">
                                <img alt={style.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src={style.image} />
                                {selectedStyle?.id === style.id && (
                                    <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                                        <div className="bg-[#9F2D5C] text-white p-2 rounded-full flex items-center justify-center shadow-xl">
                                            <span className="material-icons text-base">check</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 text-center">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-[#9F2D5C] transition-colors">{style.name}</h3>
                                <p className="text-xs text-slate-400 mt-1">{style.duration}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Options for Selected Style */}
            {selectedStyle && customization}
        </div>
    );
}
