export interface StepItem {
    step: number;
    label: string;
}

export function ProgressStepper({ currentStep, steps }: { currentStep: number; steps: StepItem[] }) {
    return (
        <nav className="max-w-4xl mx-auto mb-16">
            <div className="flex items-center justify-between relative">
                <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -z-10" />
                {steps.map((item) => (
                    <div key={item.step} className="flex flex-col items-center gap-2">
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm z-10 transition-all ${currentStep >= item.step
                                ? "bg-[#9F2D5C] text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                }`}
                        >
                            {currentStep > item.step ? (
                                <span className="material-icons text-base">check</span>
                            ) : (
                                <span className="text-sm font-bold">{item.step}</span>
                            )}
                        </div>
                        <span
                            className={`text-[10px] uppercase tracking-widest font-bold ${currentStep >= item.step ? "text-[#9F2D5C]" : "text-slate-400"
                                }`}
                        >
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </nav>
    );
}
