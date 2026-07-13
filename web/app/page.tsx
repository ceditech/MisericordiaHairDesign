import Link from "next/link";
import Image from "next/image";
import Reviews from "@/components/Reviews";
import StylesCarousel from "@/components/StylesCarousel";
import HeroCarousel from "@/components/HeroCarousel";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-32 lg:pb-40">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="z-10 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-widest mb-6">
                <span className="flex h-2 w-2 rounded-full bg-brand-primary animate-pulse"></span>
                Expert Braiding Studio
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-text-primary leading-[1.1] mb-6">
                Braids that <br />
                <span className="text-brand-primary">Speak Your</span> Language
              </h1>
              <p className="text-lg text-text-secondary mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Experience the artistry of professional African American braiding. From knotless styles to intricate
                cornrows, we weave confidence and beauty into every strand.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/book"
                  className="bg-brand-primary hover:bg-brand-secondary text-white px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-xl shadow-brand-primary/30 flex items-center justify-center gap-2"
                >
                  Book Your Session <span className="material-icons">calendar_today</span>
                </Link>
                <Link
                  href="#services"
                  className="bg-surface border border-border px-10 py-4 rounded-xl font-bold text-lg transition-all hover:border-brand-primary text-text-primary"
                >
                  View Styles
                </Link>
              </div>
              <div className="mt-12 flex items-center justify-center lg:justify-start gap-6">
                <div className="flex -space-x-3">
                  <img
                    className="w-12 h-12 rounded-full border-2 border-surface object-cover"
                    alt="Satisfied client portrait"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAb04Qk9XCBchHD3EpgkMfXFoq2Va-i2WOq2TsTeD5quInGv6SQJGBoJuwuQdHs5nNHtIdDZ5WV97p19g7zCGZcYcwwlMxEKsmNhhuhuoV3SN3I4UbUu_-lZsKQIkoW9w_s4iRqpR6YJTNqRnC0XfUt672BBykoh_LaYLdlia6oA8d7Sp6bWwkLujg9MkFLX-Q4GDBBwvHTy_ry0bEfCU2DTBGRvWaK8mRuP3_koDry7Tm53lfvx3IzAux0wkO3dPSaUilqcglbGA"
                  />
                  <img
                    className="w-12 h-12 rounded-full border-2 border-surface object-cover"
                    alt="Client with braided hair"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOkcvO4o8XJawZRpRvpKE7cee3zCVOrz644ElUdBxzf6g5lFWssyiJxpxyX1oKgJTO7psDVb3NHNRJ00aNzQTPj21TJbtSGnZAxad2xsAhUt_KTgRG7AqAdu8ul01wVJs5OiLwyrvbd9S_eRvD7iH683gpQG9cN3A6Yo3a2Nw17pLH7XRuoqPsy9P-YglrOIw4A1iDFVenypxt3MSdMHp98Gw3lV0f6Aig4XKmTTHxrG14ZTyZ-EoU22srnDYrm8Cv-89zGPCIjQ"
                  />
                  <img
                    className="w-12 h-12 rounded-full border-2 border-surface object-cover"
                    alt="Professional stylist portrait"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEgoQJPgXdINCxkIjeYF1hiLK3wdLYHfrjSzDaJmWKlCrW7FCE_PVimyPDSOaShobemWI_y2WkdOT1ovsQNnfyjewey2F_BbcygOsMTta_r_vMcMwImkFQND1B75KYUolv1swM8Yh-t3qjdCr_n-Zr_orFvIEoaF1QQTym3XpCgATlsxxXdiS7le7tzELGH3jbTPpTJjVavbsWN7oN2GrXc6RdnfOPX59xynA_kLZ1PGcdyhBxqdsRlXEFhCcWoGFOcM2h8iqdlQ"
                  />
                </div>
                <div className="text-sm font-medium">
                  <span className="block text-text-primary font-bold">500+ Happy Clients</span>
                  <span className="text-text-muted">★★★★★ Rated Studio</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-brand-primary/20 rounded-full blur-3xl -z-10 scale-75"></div>
              <HeroCarousel />
            </div>
          </div>
        </div>
      </header>

      {/* Why Choose Us */}
      <section className="py-24 bg-surface" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-text-primary mb-4">
              Why Choose MHDESIGNS&apos;s?
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              At MHDESIGNS&apos;s Braids, our mission is to empower individuals through beautiful and personalized
              hairstyles. We believe that every client deserves to feel confident and stylish with their unique look.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="p-8 rounded-2xl bg-background border border-border/50 transition-transform hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-6">
                <span className="material-icons text-brand-primary text-3xl">star</span>
              </div>
              <h3 className="text-xl font-bold mb-4 text-text-primary">Expert Stylists</h3>
              <p className="text-text-secondary leading-relaxed">
                Years of mastery in traditional and modern braiding techniques to give you a flawless look every time.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-background border border-border/50 transition-transform hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-6">
                <span className="material-icons text-brand-primary text-3xl">verified_user</span>
              </div>
              <h3 className="text-xl font-bold mb-4 text-text-primary">Protective Styling</h3>
              <p className="text-text-secondary leading-relaxed">
                We prioritize hair health, ensuring tension-free methods that promote growth and protect your edges.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-background border border-border/50 transition-transform hover:-translate-y-2">
              <div className="w-14 h-14 rounded-xl bg-brand-primary/10 flex items-center justify-center mb-6">
                <span className="material-icons text-brand-primary text-3xl">favorite</span>
              </div>
              <h3 className="text-xl font-bold mb-4 text-text-primary">Confidence Boost</h3>
              <p className="text-text-secondary leading-relaxed">
                Step out with a hairstyle that makes you feel powerful, beautiful, and ready to take on the world.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Gallery */}
      <section className="py-24 bg-background" id="services">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-text-primary mb-4">
                Our Popular Styles
              </h2>
              <p className="text-text-secondary">
                Discover our most requested braiding styles and book your transformation.
              </p>
            </div>
            <Link
              href="/book"
              className="hidden md:inline-flex items-center gap-2 text-brand-primary font-bold hover:gap-3 transition-all"
            >
              View All Styles <span className="material-icons text-sm">arrow_forward</span>
            </Link>
          </div>
          <StylesCarousel />
        </div>
      </section>

      {/* Reviews Section */}
      <Reviews />

      {/* Booking CTA */}
      <section className="py-24 bg-brand-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6">Ready for Your New Look?</h2>
          <p className="text-white/80 text-lg mb-12 max-w-2xl mx-auto">
            Book your appointment online today and experience the best braiding service in the city. Spots fill up
            fast!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="bg-white text-brand-primary px-10 py-4 rounded-xl font-extrabold text-lg transition-all hover:scale-105 shadow-2xl"
            >
              Schedule Appointment
            </Link>
            <Link
              href="/contact"
              className="bg-brand-primary/20 backdrop-blur-md border border-white/30 text-white px-10 py-4 rounded-xl font-extrabold text-lg transition-all hover:bg-white/10"
            >
              Contact Us
            </Link>
          </div>
          <p className="mt-8 text-white/60 text-sm font-medium">
            Only $50 deposit for all services while scheduling. Please check the{" "}
            <Link href="/policies" className="underline underline-offset-4 hover:text-white transition-colors">
              cancellation policy
            </Link>.
          </p>
        </div>
      </section>
    </>
  );
}
