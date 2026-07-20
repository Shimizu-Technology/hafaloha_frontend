import { useEffect } from 'react';
import circleLogo from '../ordering/assets/Hafaloha-circle-logo.png';
import foodCollage from '../ordering/assets/hafaloha_hero.webp';

interface IconProps {
  className?: string;
}

function PhoneIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a1.125 1.125 0 0 0-1.173.417l-.97 1.293a1.125 1.125 0 0 1-1.21.38 12.035 12.035 0 0 1-7.143-7.143 1.125 1.125 0 0 1 .38-1.21l1.293-.97c.37-.278.534-.752.417-1.173L6.963 3.102A1.125 1.125 0 0 0 5.872 2.25H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
    </svg>
  );
}

function MapIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}

function MailIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5A2.25 2.25 0 0 1 19.5 19.5h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0-8.51 5.314a2.25 2.25 0 0 1-2.48 0L2.25 6.75" />
    </svg>
  );
}

function ArrowIcon({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg className={className} aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function AvailabilityLoading() {
  return (
    <main className="min-h-screen bg-[#f4efe5] text-[#153c32] flex items-center justify-center px-6">
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto mb-6 h-24 w-24 rounded-full border border-[#153c32]/10 bg-white p-2 shadow-[0_18px_50px_rgba(21,60,50,0.12)]">
          <img src={circleLogo} alt="" className="h-full w-full animate-pulse rounded-full object-contain" />
        </div>
        <p className="font-display text-4xl text-[#153c32]">håfaloha!</p>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#153c32]/60">
          Checking online services
        </p>
      </div>
    </main>
  );
}

interface ServiceStatusPageProps {
  onRetry: () => void;
}

export function ServiceStatusPage({ onRetry }: ServiceStatusPageProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Online services paused | Håfaloha';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4efe5] text-[#153c32]">
      <div className="h-2 bg-[linear-gradient(90deg,#eb578c_0_25%,#45c0b5_25%_50%,#ffd84c_50%_75%,#ff7f6a_75%)]" aria-hidden="true" />

      <header className="border-b border-[#153c32]/10 bg-[#f4efe5]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <span className="font-display text-3xl tracking-tight text-[#153c32] sm:text-4xl">håfaloha!</span>
          <a
            href="tel:+16719893444"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#153c32]/20 px-4 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-[#153c32]/40 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#153c32] focus:ring-offset-2 focus:ring-offset-[#f4efe5]"
          >
            <PhoneIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Call Håfaloha</span>
            <span className="sm:hidden">Call us</span>
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-10 pt-8 sm:px-8 sm:pt-12 lg:px-10 lg:pb-16">
        <div className="overflow-hidden rounded-[1.75rem] border border-[#153c32]/10 bg-[#153c32] shadow-[0_30px_90px_rgba(21,60,50,0.18)] sm:rounded-[2.25rem]">
          <div className="relative h-36 overflow-hidden sm:h-48 lg:h-56">
            <img
              src={foodCollage}
              alt="A collage of Håfaloha food, shave ice, poke, açaí, and burgers"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#153c32]/45 to-transparent" aria-hidden="true" />
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="px-6 py-10 text-white sm:px-10 sm:py-14 lg:px-14 lg:py-16">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#ffd84c]">
                <span className="h-2 w-2 rounded-full bg-[#ffd84c]" aria-hidden="true" />
                Online services paused
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                Ordering is taking a little break.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">
                Håfaloha is not taking online orders or reservations through this site right now. For current shop hours, product availability, or anything else, reach the team directly.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="tel:+16719893444"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ffd84c] px-6 font-bold text-[#153c32] transition hover:-translate-y-0.5 hover:bg-[#ffe47c] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#153c32]"
                >
                  <PhoneIcon />
                  (671) 989-3444
                  <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=215%20Rojas%20St.%20Unit%20104%20Tamuning%20GU%2096913"
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-6 font-bold text-white transition hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#153c32]"
                >
                  <MapIcon />
                  Get directions
                  <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>

            <aside className="border-t border-white/10 bg-[#0d2f27] px-6 py-10 text-white sm:px-10 lg:border-l lg:border-t-0 lg:px-9 lg:py-14">
              <img
                src={circleLogo}
                alt="Håfaloha"
                className="h-28 w-28 rounded-full object-contain shadow-[0_14px_36px_rgba(0,0,0,0.25)]"
              />

              <h2 className="mt-8 text-xl font-extrabold tracking-tight">Find the Håfaloha team</h2>
              <address className="mt-5 not-italic text-[0.98rem] leading-relaxed text-white/72">
                215 Rojas St., Unit 104<br />
                Tamuning, Guam 96913
              </address>

              <a
                href="mailto:admin@hafaloha.com"
                className="mt-5 inline-flex items-center gap-2 font-semibold text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-4 focus:ring-offset-[#0d2f27]"
              >
                <MailIcon />
                admin@hafaloha.com
              </a>

              <div className="mt-9 border-t border-white/10 pt-7">
                <p className="text-sm leading-relaxed text-white/60">
                  Think the ordering system is back online?
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="group mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 px-4 text-sm font-bold text-white transition hover:border-white/50 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0d2f27]"
                >
                  Check again
                  <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </aside>
          </div>
        </div>

        <footer className="flex flex-col gap-3 px-1 pt-7 text-sm text-[#153c32]/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Håfaloha. All rights reserved.</p>
          <p>Guam-grown goods, food, and island flavor.</p>
        </footer>
      </section>
    </main>
  );
}
