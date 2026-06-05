"use client";

import { DEPOSIT_POLICY, CANCELLATION_POLICY, CONTACT_EMAIL, CONTACT_PHONE, FULL_ADDRESS } from "@/src/content/legal";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { BRAID_STYLES } from "@/lib/styles";
import { Facebook, Instagram } from "lucide-react";
import { Button, Input, Textarea, Card, Badge, useToast, Tooltip } from "@/components/ui";

// Dynamically import BraidsMap component to avoid SSR issues with Leaflet
const BraidsMap = dynamic(() => import("@/components/BraidsMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-surface-dark/5 flex items-center justify-center animate-pulse rounded-[2rem]">
            <span className="text-text-muted font-medium">Loading Map...</span>
        </div>
    ),
});

interface Attachment {
    file: File;
    preview: string;
    id: string;
}

export default function ContactPage() {
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        service: "",
        message: "",
    });

    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cleanup object URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            attachments.forEach(att => {
                if (att.preview) URL.revokeObjectURL(att.preview);
            });
        };
    }, [attachments]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newAttachments: Attachment[] = [];
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB

        for (const file of files) {
            if (file.size > MAX_SIZE) {
                showToast(`File ${file.name} is too large (max 10MB)`, "error");
                continue;
            }

            if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
                showToast(`File ${file.name} is not supported (Images or PDF only)`, "error");
                continue;
            }

            const preview = file.type.startsWith("image/")
                ? URL.createObjectURL(file)
                : "";

            newAttachments.push({
                file,
                preview,
                id: Math.random().toString(36).substring(7),
            });
        }

        setAttachments(prev => [...prev, ...newAttachments]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => {
            const item = prev.find(a => a.id === id);
            if (item?.preview) URL.revokeObjectURL(item.preview);
            return prev.filter(a => a.id !== id);
        });
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }
        if (!formData.service) newErrors.service = "Please select a service";
        if (!formData.message.trim()) newErrors.message = "Message is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            showToast("Please fix the errors in the form", "error");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to send message");
            }

            showToast("Message sent! We'll get back to you soon.", "success");
            // Reset form
            setFormData({ name: "", email: "", service: "", message: "" });
            setAttachments([]);
        } catch (error: any) {
            console.error("Contact form error:", error);
            showToast(error.message || "Something went wrong. Please try again.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid lg:grid-cols-2 gap-16">
                {/* Contact Info */}
                <div className="space-y-12">
                    <div>
                        <Badge className="mb-4">Get in Touch</Badge>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary mb-6">
                            Let&apos;s Talk About Your Next Style
                        </h1>
                        <p className="text-lg text-text-secondary">
                            Have questions about a style or need a custom quote? Fill out the form, and Dede will personally get back to you within 24 hours.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <a
                            href="tel:+19452754778"
                            className="flex items-center gap-6 p-4 rounded-2xl hover:bg-brand-primary/5 transition-colors group border border-transparent hover:border-brand-primary/10"
                        >
                            <div className="w-14 h-14 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                                <span className="material-icons text-2xl">phone</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Phone</p>
                                <p className="text-xl font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                                    {CONTACT_PHONE}
                                </p>
                            </div>
                        </a>

                        <a
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="flex items-center gap-6 p-4 rounded-2xl hover:bg-brand-primary/5 transition-colors group border border-transparent hover:border-brand-primary/10"
                        >
                            <div className="w-14 h-14 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                                <span className="material-icons text-2xl">email</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Email</p>
                                <p className="text-xl font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                                    {CONTACT_EMAIL}
                                </p>
                            </div>
                        </a>

                        <div className="flex items-center gap-6 p-4 rounded-2xl group border border-transparent">
                            <div className="w-14 h-14 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                                <span className="material-icons text-2xl">location_on</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Location</p>
                                <p className="text-xl font-bold text-text-primary leading-tight whitespace-pre-line">
                                    {FULL_ADDRESS.replace(/Manor/, '\nManor')}
                                </p>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(FULL_ADDRESS)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-brand-primary font-bold hover:underline mt-1 inline-block"
                                >
                                    View on Maps
                                </a>
                            </div>
                        </div>

                        <Card className="p-8 bg-surface/50 border-border">
                            <h3 className="text-xl font-bold text-text-primary mb-4">Business Hours</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-text-secondary">
                                    <span>Mon - Sat</span>
                                    <span className="font-bold text-text-primary">9:00 AM - 9:00 PM</span>
                                </div>
                                <div className="flex justify-between text-text-secondary border-t border-border pt-3">
                                    <span>Sun</span>
                                    <span className="text-brand-primary font-bold">Closed</span>
                                </div>
                            </div>
                        </Card>

                        {/* Cancellation Policy */}
                        <div className="flex items-start gap-4 p-6 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                            <div className="mt-1 w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="material-icons text-brand-primary text-xl">info</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-text-primary mb-1">Cancellation Policy</h4>
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    {DEPOSIT_POLICY} {CANCELLATION_POLICY}
                                </p>
                            </div>
                        </div>

                        {/* Social Media Links */}
                        <div className="pt-4">
                            <p className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 px-4">Follow Us</p>
                            <div className="flex gap-4 px-4">
                                {[
                                    { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61585347691705&sk=map', icon: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.893 12.89l.443-2.89h-2.773v-1.875c0-.79.387-1.563 1.63-1.563h1.26v-2.46s-1.144-.196-2.238-.196c-2.284 0-3.777 1.385-3.777 3.89V12h-2.54v2.89h2.54v6.988a10.04 10.04 0 003.124 0v-6.987h2.33z' },
                                    { name: 'Instagram', url: 'https://www.instagram.com/dedesbraids/', icon: 'M12 2C6.478 2 2 6.478 2 12s4.478 10 10 10 10-4.478 10-10S17.522 2 12 2zm5.762 12.335c.025-.45.038-1.262.038-2.435s-.013-1.985-.038-2.435c-.052-1.066-.37-1.89-.953-2.474-.584-.584-1.408-.901-2.474-.953C13.885 6.013 13.073 6 11.9 6s-1.985.013-2.435.038c-1.066.052-1.89.37-2.474.953-.584.584-.901 1.408-.953 2.474C6.013 9.915 6 10.727 6 11.9s.013 1.985.038 2.435c.052 1.066.37 1.89.953 2.474.584.584 1.408.901 2.474.953.45.025 1.262.038 2.435.038s1.985-.013 2.435-.038c1.066-.052 1.89-.37 2.474-.953.584-.584.901-1.408.953-2.474zM11.9 7.06l-.588-.004a41.691 41.691 0 00-.81 0c-.185.003-.432.01-.742.023a6.09 6.09 0 00-.79.077 3.08 3.08 0 00-.55.142 1.993 1.993 0 00-.676.446c-.195.195-.343.42-.446.676a3.08 3.08 0 00-.142.55 1.993 1.993 0 00-.676.446c-.195.195-.343.42-.446.676a3.08 3.08 0 00-.142.55 3.08 3.08 0 00-.142.55 6.09 6.09 0 00-.077.79c-.012.31-.02.557-.023.742-.002.184-.002.454 0 .81l.004.588-.004.588c-.002.356-.002.626 0 .81.003.185.01.432.023.742s.039.573.077.79c.039.219.086.402.142.55a2.001 2.001 0 001.122 1.122c.148.056.332.103.55.142.217.038.48.064.79.077.31.012.557.02.742.023.184.002.454.002.81 0l.588-.004.588.004c.356.002.626.002.81 0 .185-.003.432-.01.742-.023a6.09 6.09 0 00.79-.077c.219-.039.402-.086.55-.142a2.001 2.001 0 001.122-1.122c.056-.148.103-.332.142-.55a6.09 6.09 0 00.077-.79c.012-.31.02-.557.023-.742.002-.184.002-.454 0-.81l-.004-.588.004-.588c.002-.356.002-.626 0-.81-.003-.185-.01-.432-.023-.742a6.09 6.09 0 00-.077-.79 3.083 3.083 0 00-.142-.55 1.993 1.993 0 00-.446-.676 1.992 1.992 0 00-.676-.446 3.08 3.08 0 00-.55-.142 6.09 6.09 0 00-.79-.077 28.51 28.51 0 00-.742-.023 41.691 41.691 0 00-.81 0l-.588.004zm3.65 2.19a.68.68 0 00.207-.5.68.68 0 00-.208-.5.68.68 0 00-.5-.207.68.68 0 00-.499.208.68.68 0 00-.207.5c0 .194.07.36.207.499a.68.68 0 00.5.207.68.68 0 00.5-.207zm-.623 2.65c0 .84-.295 1.554-.884 2.143a2.918 2.918 0 01-2.143.884c-.84 0-1.554-.295-2.143-.884a2.918 2.918 0 01-.884-2.143c0-.84.295-1.554.884-2.143a2.919 2.919 0 012.143-.884c.84 0 1.554.295 2.143.884.59.589.884 1.303.884 2.143zm-1.06 0a1.89 1.89 0 00-.577-1.39 1.895 1.895 0 00-1.39-.577c-.543 0-1.006.192-1.39.576a1.895 1.895 0 00-.577 1.391c0 .543.192 1.006.576 1.39.385.385.848.577 1.391.577s1.006-.192 1.39-.577a1.89 1.89 0 00.577-1.39z' },
                                    { name: 'TikTok', url: 'https://www.tiktok.com/@dedesbraids', icon: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.972 8.87a3.5 3.5 0 0 1-2.654-1.448v4.932c0 2.014-1.632 3.646-3.646 3.646s-3.646-1.632-3.646-3.646 1.632-3.646 3.646-3.646c.055 0 .109.004.162.011v1.797a1.864 1.864 0 0 0-.162-.007c-1.028 0-1.86 0.832-1.86 1.86s.832 1.86 1.86 0.833 0 1.86-1.84 0 1.86-0.832 1.86-1.86V6h1.719c.162 1.541 1.405 2.745 2.951 2.858v1.997c-.098 0.009-.197 0.014-.296 0.015z' },
                                    { name: 'Yelp', url: 'https://www.yelp.com/biz/qsQ8HcD94A0PBK6GY3KoIw', icon: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.6-1.346l2.91 0.945s0.4 0.073 0.4 0.364c0 0.16-.06.31-.146.4l-1.636 2.582a0.814 0.814 0 0 1-0.436 0.182h-0.473l-1.564-2.618s-0.182-0.364 0.037-0.582c0.218-0.218 0.472-0.109 0.509-0.145l0.037-0.436s-0.145-0.255 0.145-0.182zm-8.545 13.091l0.182-2.072a0.688 0.688 0 0 1 0.29-0.364s0.4-0.145 0.582-0.036l2.619 1.31s0.4 0.181 0.4 0.508c-0.037 0.437-0.219 0.437-0.364 0.51l-3.055 0.654s-0.436 0.146-0.581-0.072a0.971 0.971 0 0 1-0.073-0.509zm4.945-3.236l-2.51-3.418s-0.363-0.4-0.181-0.691a0.64 0.64 0 0 1 0.363-0.291l2.4-0.873s0.108-0.036 0.218-0.145c0.364 0.218 0.255 0.655 0.255 0.655l0.036 4.145s-0.072 0.51-0.4 0.582c-0.328 0.072-0.581-0.182-0.581-0.182zm1.419 0.582l1.382 1.636a0.677 0.677 0 0 1 0.072 0.473c-0.072 0.218-0.472 0.364-0.472 0.364l-2.91 0.836s-0.4 0.072-0.545-0.182c-0.145-0.255 0-0.51 0.037-0.436l1.636-2.582s0.145-0.364 0.436-0.327c0.152 0.002 0.29 0.085 0.364 0.218zm-1.783 3.491l-2.036-0.655a0.6 0.6 0 0 1-0.291-0.364c-0.073-0.218 0.182-0.545 0.182-0.545l2.036-2.255s0.327-0.29 0.582-0.145c0.254 0.145 0.254 0.436 0.218 0.436l-0.036 3.018s0.036 0.437-0.219 0.51a1.2 1.2 0 0 1-0.436 0z' }
                                ].map((social) => (
                                    <Tooltip key={social.name} content={`Follow on ${social.name}`} position="top">
                                        <a
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center text-text-secondary hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all duration-300"
                                            aria-label={social.name}
                                        >
                                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                                <path fillRule="evenodd" clipRule="evenodd" d={social.icon} />
                                            </svg>
                                        </a>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Form */}
                <Card className="p-8 md:p-10 border-brand-primary/10 shadow-xl rounded-3xl h-fit">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <Input
                                label="Full Name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                error={errors.name}
                                placeholder="Jane Doe"
                                required
                            />
                            <Input
                                label="Email Address"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                error={errors.email}
                                placeholder="jane@example.com"
                                required
                            />
                        </div>

                        <div className="w-full">
                            <label className="block text-sm font-semibold mb-2 text-text-secondary">
                                Service Interest
                            </label>
                            <select
                                name="service"
                                value={formData.service}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-3 rounded-lg border-2 bg-surface text-text-primary outline-none transition-all ${errors.service
                                    ? "border-red-500 focus:ring-red-500/20"
                                    : "border-border focus:border-brand-primary focus:ring-brand-primary/20"
                                    }`}
                            >
                                <option value="">Select a service...</option>
                                {BRAID_STYLES.map(style => (
                                    <option key={style.id} value={style.name}>{style.name}</option>
                                ))}
                                <option value="Other">Other / Custom Request</option>
                            </select>
                            {errors.service && <p className="mt-1 text-sm text-red-500">{errors.service}</p>}
                        </div>

                        <Textarea
                            label="Your Message"
                            name="message"
                            value={formData.message}
                            onChange={handleInputChange}
                            error={errors.message}
                            placeholder="Tell us about the style you want, your hair type, or any questions you have..."
                            rows={5}
                            required
                        />

                        {/* Attachments */}
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-text-secondary">
                                Inspiration Images (Optional)
                            </label>
                            <div className="flex flex-wrap gap-4 mb-4">
                                {attachments.map((att) => (
                                    <div key={att.id} className="relative w-23 h-20 group">
                                        {att.preview ? (
                                            <img
                                                src={att.preview}
                                                className="w-full h-full object-cover rounded-xl border border-border"
                                                alt="Preview"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-surface-dark/10 rounded-xl flex items-center justify-center border border-border">
                                                <span className="material-icons text-text-muted">description</span>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(att.id)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <span className="material-icons text-xs">close</span>
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-20 h-20 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-text-muted hover:border-brand-primary hover:text-brand-primary transition-all"
                                >
                                    <span className="material-icons">add_a_photo</span>
                                    <span className="text-[10px] font-bold uppercase mt-1">Add</span>
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,application/pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <p className="text-xs text-text-muted">Max file size: 10MB. Formats: JPG, PNG, PDF.</p>
                        </div>

                        <Button
                            type="submit"
                            isLoading={isSubmitting}
                            className="w-full py-4 rounded-2xl text-lg shadow-xl"
                        >
                            Send Inquiry
                        </Button>
                    </form>
                </Card>
            </div>

            {/* Map Section — Full Width */}
            <div className="mt-20 -mx-4 sm:-mx-6 lg:-mx-8">
                <div className="relative">
                    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-10 text-center">
                        <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center mb-5 mx-auto">
                            <span className="material-icons text-brand-primary text-2xl">location_on</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-text-primary mb-3">Visit Our Studio</h2>
                        <p className="text-text-secondary max-w-xl mx-auto">
                            Located in the heart of Dallas, TX — stop by for your next style transformation.
                        </p>
                    </div>
                    <div className="w-full h-72 sm:h-80 md:h-[28rem] rounded-none sm:rounded-[2rem] sm:mx-auto sm:max-w-[95%] lg:max-w-[90%] overflow-hidden border border-border shadow-lg">
                        <BraidsMap
                            address={FULL_ADDRESS}
                            coordinates={[32.7831, -96.8181]}
                        />
                    </div>
                </div>
            </div>
        </main >
    );
}
