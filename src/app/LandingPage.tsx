import { ArrowRight, Compass, DraftingCompass, House } from 'lucide-react';
import { navigateTo } from './router.js';
import { landingTheme } from '../theme/landingTheme.js';

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article
      className="rounded-[24px] border p-6 shadow-[0_24px_80px_-48px_rgba(82,56,33,0.45)] backdrop-blur-sm"
      style={{
        background: landingTheme.surface,
        borderColor: landingTheme.border,
      }}
    >
      <div
        className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: landingTheme.accentSoft, color: landingTheme.accentStrong }}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold tracking-tight" style={{ color: landingTheme.text }}>
        {title}
      </h3>
      <p className="text-sm leading-6" style={{ color: landingTheme.textMuted }}>
        {description}
      </p>
    </article>
  );
}

export default function LandingPage() {
  return (
    <main
      data-testid="landing-page"
      data-app-theme="landing"
      className="min-h-screen overflow-hidden"
      style={{
        background: `radial-gradient(circle at top left, ${landingTheme.backgroundAccent}, transparent 36%), ${landingTheme.background}`,
        color: landingTheme.text,
      }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-16 pt-6 sm:px-8 lg:px-10">
        <header
          className="flex items-center justify-between rounded-full border px-5 py-4 backdrop-blur-sm"
          style={{ background: landingTheme.surface, borderColor: landingTheme.border }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: landingTheme.accentSoft, color: landingTheme.accentStrong }}
            >
              <House size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] uppercase">3D Home Design</p>
              <p className="text-xs" style={{ color: landingTheme.textMuted }}>
                Residential floor planner
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigateTo('/editor')}
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:translate-y-[-1px]"
            style={{ background: landingTheme.accentStrong, color: '#fffaf2' }}
          >
            Enter Editor
            <ArrowRight size={16} />
          </button>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="max-w-3xl">
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ borderColor: landingTheme.border, color: landingTheme.textMuted }}
            >
              <Compass size={14} />
              V3 Architecture Core + Visual Reset
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Residential planning that stays simple to draw and solid to extend.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 sm:text-lg" style={{ color: landingTheme.textMuted }}>
              Draw walls, close rooms, inspect spaces, and keep the editor ready for the next layer:
              better editing UX, room semantics, and delivery tooling.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => navigateTo('/editor')}
                className="inline-flex items-center justify-center gap-3 rounded-full px-6 py-4 text-sm font-semibold transition-transform hover:translate-y-[-1px]"
                style={{ background: landingTheme.accentStrong, color: '#fffaf2' }}
              >
                Start Designing
                <ArrowRight size={16} />
              </button>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-full border px-6 py-4 text-sm font-semibold"
                style={{ borderColor: landingTheme.border, color: landingTheme.text }}
              >
                View Capabilities
              </a>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-[32px] border p-6 shadow-[0_40px_120px_-60px_rgba(62,40,19,0.65)]"
            style={{ background: landingTheme.surface, borderColor: landingTheme.border }}
          >
            <div
              className="absolute inset-x-6 top-6 h-40 rounded-[28px]"
              style={{
                background: `linear-gradient(135deg, ${landingTheme.accentSoft}, rgba(255,255,255,0.7))`,
              }}
            />
            <div className="relative mt-24 space-y-4 rounded-[28px] border bg-white/72 p-5" style={{ borderColor: landingTheme.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: landingTheme.textMuted }}>
                    Plan Flow
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">Landing → Editor</p>
                </div>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: landingTheme.accentSoft, color: landingTheme.accentStrong }}
                >
                  <DraftingCompass size={22} />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {['Wall drawing core', 'Stable zone identity', 'Light editor scene baseline'].map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm"
                    style={{ borderColor: landingTheme.border, color: landingTheme.textMuted }}
                  >
                    <span>{item}</span>
                    <span className="font-semibold" style={{ color: landingTheme.accentStrong }}>
                      Ready
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            icon={<DraftingCompass size={22} />}
            title="Wall-first editing"
            description="Keep wall drawing, snapping, and topology on a stable architecture core instead of scattering logic across scene events."
          />
          <FeatureCard
            icon={<Compass size={22} />}
            title="Room continuity"
            description="Treat zones as persisted objects so room identity survives edits instead of resetting on every rebuild."
          />
          <FeatureCard
            icon={<House size={22} />}
            title="Product-ready shell"
            description="Separate landing and editor entry points now, so V4 and V5 can expand without turning the app shell into a dead end."
          />
        </section>
      </div>
    </main>
  );
}
