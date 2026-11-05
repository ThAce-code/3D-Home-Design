import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Box,
  Compass,
  Home,
  Layers,
  Move,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { MotionConfig, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import LiquidGlass from './liquid-glass/LiquidGlass.js';
import {
  DEFAULT_LIQUID_GLASS_SETTINGS,
  LiquidGlassSettingsContext,
  supportsSvgBackdropFilter,
  type LiquidGlassSettings,
} from './liquid-glass/useLiquidGlass.js';
import { navigateTo } from './router.js';

const HERO_SRC = '/hero-interior.webp';
const PLAN_SRC = '/landing-plan.webp';
const BRAND_TINT = 'rgba(38, 220, 214, 0.18)';
const JELLY = { type: 'spring', stiffness: 500, damping: 18, mass: 0.6 } as const;
const MORPH = { type: 'spring', stiffness: 220, damping: 28 } as const;

type Tone = 'light' | 'dark';

/* Busy, high-contrast backdrops: refraction is only visible when there are edges to bend. */
const STRIPES =
  'repeating-linear-gradient(90deg, rgba(20,23,26,0.85) 0 3px, transparent 3px 26px)';
const COLOR_FIELD = [
  'radial-gradient(circle at 18% 30%, #26dcd6 0, transparent 34%)',
  'radial-gradient(circle at 78% 22%, #ff9f1c 0, transparent 30%)',
  'radial-gradient(circle at 60% 82%, #7c6cff 0, transparent 32%)',
  'radial-gradient(circle at 30% 85%, #ff5d8f 0, transparent 26%)',
  'linear-gradient(135deg, #f6f1e8, #e4eef0)',
].join(', ');

function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

function DemoNav({ tone, compact }: { tone: Tone; compact: boolean }) {
  const viewport = useViewportWidth();
  const expandedWidth = Math.min(1080, viewport - 32);
  const compactWidth = Math.min(560, viewport - 32);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center">
      <LiquidGlass
        data-testid="lg-demo-nav"
        radius="pill"
        tone={tone}
        sheen
        className="pointer-events-auto flex items-center justify-between gap-4 px-3"
        initial={false}
        animate={{ width: compact ? compactWidth : expandedWidth, height: compact ? 56 : 68 }}
        transition={MORPH}
      >
        <button
          type="button"
          aria-label="返回首页"
          onClick={() => navigateTo('/')}
          className="flex shrink-0 items-center gap-2 rounded-full px-3 py-2 font-headline text-base font-bold tracking-tight"
        >
          <img src="/logo.webp" alt="" className="h-8 w-8" />
          <motion.span animate={{ opacity: compact ? 0 : 1, width: compact ? 0 : 'auto' }} className="hidden overflow-hidden whitespace-nowrap sm:block">
            Facility Design
          </motion.span>
        </button>
        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          {[
            ['#lens', '折射'],
            ['#controls', '控件'],
            ['#compare', '对比'],
            ['#dark', '深色'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full px-4 py-2 transition-colors hover:bg-white/20">
              {label}
            </a>
          ))}
        </nav>
        <GlassButton tone={tone} tint={BRAND_TINT} className="h-11 shrink-0 px-5 text-sm" onClick={() => navigateTo('/editor')}>
          打开编辑器
        </GlassButton>
      </LiquidGlass>
    </div>
  );
}

function GlassButton({
  children,
  className = '',
  tone = 'light',
  tint,
  onClick,
  label,
  pressed,
}: {
  children: ReactNode;
  className?: string;
  tone?: Tone;
  tint?: string;
  onClick?: () => void;
  label?: string;
  pressed?: boolean;
}) {
  return (
    <LiquidGlass
      radius="pill"
      tone={tone}
      tint={tint}
      sheen
      className={`inline-flex ${className}`}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scaleX: 1.06, scaleY: 0.92, transition: JELLY }}
      transition={JELLY}
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
        className="relative z-10 flex h-full w-full items-center justify-center gap-2 rounded-full font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#006a66] focus-visible:ring-offset-2"
      >
        {children}
      </button>
    </LiquidGlass>
  );
}

function GlassSwitch({
  checked,
  onChange,
  label,
  tone = 'light',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  tone?: Tone;
}) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      whileTap="pressed"
      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#006a66]"
    >
      <LiquidGlass
        radius="pill"
        tone={tone}
        tint={checked ? 'rgba(38, 220, 214, 0.55)' : undefined}
        className="h-8 w-[60px] p-[3px]"
      >
        <LiquidGlass
          radius="pill"
          tone="light"
          tint="rgba(255, 255, 255, 0.55)"
          className="h-[26px] w-[26px]"
          style={{ originX: checked ? 1 : 0 }}
          initial={false}
          animate={{ x: checked ? 28 : 0 }}
          variants={{ pressed: { scaleX: 1.3, scaleY: 0.9 } }}
          transition={JELLY}
        />
      </LiquidGlass>
    </motion.button>
  );
}

function GlassSegmented({ options, tone = 'light' }: { options: string[]; tone?: Tone }) {
  const [active, setActive] = useState(options[0]);
  const groupId = useId();
  return (
    <LiquidGlass radius="pill" tone={tone} className="inline-flex gap-1 p-1.5" role="radiogroup" aria-label="视图模式">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={active === option}
          tabIndex={active === option ? 0 : -1}
          onKeyDown={(event) => {
            const index = options.indexOf(option);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
              : ['ArrowRight', 'ArrowDown'].includes(event.key) ? (index + 1) % options.length
                : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? (index + options.length - 1) % options.length : -1;
            if (next < 0) return;
            event.preventDefault();
            setActive(options[next]);
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
          }}
          onClick={() => setActive(option)}
          className="relative h-10 min-w-[68px] rounded-full px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[#006a66] sm:min-w-[84px] sm:px-5"
        >
          {active === option ? (
            <LiquidGlass
              layoutId={`segment-thumb-${groupId}`}
              radius="pill"
              tone="light"
              tint="rgba(255, 255, 255, 0.5)"
              className="absolute inset-0"
              transition={MORPH}
            />
          ) : null}
          <span className="relative z-10">{option}</span>
        </button>
      ))}
    </LiquidGlass>
  );
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="font-label text-xs font-bold uppercase tracking-[0.25em] opacity-70">{eyebrow}</p>
      <h2 className="mt-3 font-headline text-4xl font-bold tracking-tight md:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-relaxed opacity-80">{children}</p>
    </div>
  );
}

function LensPlayground() {
  const areaRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={areaRef} className="relative mx-auto h-[520px] max-w-6xl overflow-hidden rounded-[36px] shadow-2xl">
      <img src={PLAN_SRC} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ backgroundImage: STRIPES, opacity: 0.35 }} />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-2 px-10 font-headline text-[64px] font-bold leading-none tracking-tight text-[#14171a]/80 select-none md:text-[96px]">
        <span>Refraction</span>
        <span className="text-[#ff9f1c]">Bends Light</span>
        <span className="text-[#006a66]">At The Edge</span>
      </div>
      <LiquidGlass
        data-testid="lg-demo-lens"
        drag
        dragConstraints={areaRef}
        dragElastic={0.12}
        dragMomentum={false}
        radius="pill"
        className="absolute top-16 right-6 h-[160px] w-[160px] cursor-grab active:cursor-grabbing sm:right-[24%] sm:h-[200px] sm:w-[200px]"
        whileDrag={{ scale: 1.06 }}
        transition={JELLY}
      />
      <LiquidGlass
        drag
        dragConstraints={areaRef}
        dragElastic={0.12}
        dragMomentum={false}
        data-testid="lg-demo-reference"
        radius={32}
        sheen
        className="absolute bottom-14 left-4 flex h-[104px] w-[min(300px,calc(100%-32px))] cursor-grab items-center justify-center font-semibold active:cursor-grabbing sm:left-[18%]"
        whileDrag={{ scale: 1.04 }}
        transition={JELLY}
      >
        <span className="flex items-center gap-2"><Move className="h-4 w-4" /> 拖动我，看边缘折射</span>
      </LiquidGlass>
    </div>
  );
}

function CompareCard({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative flex h-[260px] w-full items-center justify-center overflow-hidden rounded-[28px]"
        style={{ backgroundImage: `${STRIPES}, url(${HERO_SRC})`, backgroundSize: 'auto, cover', backgroundPosition: 'center' }}
      >
        {children}
      </div>
      <div className="text-center">
        <p className="font-headline text-lg font-bold">{title}</p>
        <p className="mt-1 max-w-xs text-sm opacity-75">{note}</p>
      </div>
    </div>
  );
}

const SLIDERS: Array<{ key: keyof LiquidGlassSettings; label: string; min: number; max: number; step: number; unit?: string }> = [
  { key: 'refraction', label: '折射强度', min: 0, max: 90, step: 1, unit: 'px' },
  { key: 'bezel', label: '边缘宽度', min: 4, max: 48, step: 1, unit: 'px' },
  { key: 'dispersion', label: '色散', min: 0, max: 0.4, step: 0.01 },
  { key: 'blur', label: '模糊', min: 0, max: 12, step: 0.5, unit: 'px' },
  { key: 'saturation', label: '饱和度', min: 1, max: 2.4, step: 0.05 },
];

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: LiquidGlassSettings;
  onChange: (next: LiquidGlassSettings) => void;
}) {
  const [open, setOpen] = useState(false);
  const supported = supportsSvgBackdropFilter();

  if (!open) {
    return (
      <div className="fixed right-5 bottom-5 z-50">
        <GlassButton className="h-12 px-5 text-sm" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" /> 参数
        </GlassButton>
      </div>
    );
  }

  return (
    <LiquidGlass
      data-testid="lg-demo-settings"
      radius={28}
      tint="rgba(247,249,251,0.86)"
      role="region"
      aria-label="玻璃参数"
      className="fixed right-4 bottom-4 z-50 max-h-[calc(100dvh-110px)] w-[min(300px,calc(100vw-32px))] overflow-y-auto p-5 text-sm"
      initial={{ y: 24, scale: 0.96 }}
      animate={{ y: 0, scale: 1 }}
      transition={MORPH}
    >
      <div className="flex items-center justify-between">
        <p className="font-headline text-base font-bold">玻璃参数</p>
        <button type="button" aria-label="收起参数面板" onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/30">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p data-testid="lg-demo-support" className={`mt-2 rounded-xl px-3 py-2 text-xs leading-relaxed ${supported ? 'bg-[#26dcd6]/20' : 'bg-[#ff9f1c]/25'}`}>
        {supported
          ? (settings.refract ? '边缘折射已开启，可拖动玻璃观察变化。' : '边缘折射已关闭，当前显示毛玻璃。')
          : '当前浏览器使用毛玻璃兼容模式。可在桌面 Chrome / Edge 中体验边缘折射。'}
      </p>
      <div className="mt-4 space-y-3">
        <label className="flex items-center justify-between">
          <span>边缘折射</span>
          <GlassSwitch label="边缘折射" checked={settings.refract} onChange={(refract) => onChange({ ...settings, refract })} />
        </label>
        <label className="flex items-center justify-between">
          <span>高光跟随指针</span>
          <GlassSwitch label="高光跟随指针" checked={settings.specular} onChange={(specular) => onChange({ ...settings, specular })} />
        </label>
        {SLIDERS.map(({ key, label, min, max, step, unit }) => (
          <label key={key} className="block">
            <span className="flex justify-between">
              <span>{label}</span>
              <span className="tabular-nums opacity-70">
                {Number(settings[key])}
                {unit ?? ''}
              </span>
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={Number(settings[key])}
              onChange={(event) => onChange({ ...settings, [key]: Number(event.target.value) })}
              className="mt-1 w-full accent-[#006a66]"
            />
          </label>
        ))}
        <button
          type="button"
          onClick={() => onChange(DEFAULT_LIQUID_GLASS_SETTINGS)}
          className="w-full rounded-full py-2 text-xs font-semibold hover:bg-white/30"
        >
          恢复默认
        </button>
      </div>
    </LiquidGlass>
  );
}

export default function LiquidGlassDemoPage() {
  const reduceMotion = useReducedMotion();
  const [settings, setSettings] = useState(DEFAULT_LIQUID_GLASS_SETTINGS);
  const [compact, setCompact] = useState(false);
  const [tone, setTone] = useState<Tone>('light');
  const [switchOn, setSwitchOn] = useState(true);
  const [activeTool, setActiveTool] = useState('移动');
  const { scrollY } = useScroll();

  // The navbar adapts to whatever section is currently under its centre line.
  const syncNavWithScroll = (y: number) => {
    setCompact(y > 80);
    const probe = 50;
    const sections = document.querySelectorAll<HTMLElement>('[data-lg-section-tone]');
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= probe && rect.bottom > probe) {
        setTone(section.dataset.lgSectionTone === 'dark' ? 'dark' : 'light');
        break;
      }
    }
  };
  useMotionValueEvent(scrollY, 'change', syncNavWithScroll);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Liquid Glass 样式实验室 · Facility Design';
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <LiquidGlassSettingsContext.Provider value={settings}>
        <div data-testid="lg-demo-page" data-app-theme="landing" className="min-h-screen overflow-x-hidden bg-[#eef2f4] font-body text-[#14171a]">
          <DemoNav tone={tone} compact={compact} />

          <section data-lg-section-tone="light" className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-28 pb-20">
            <img src={HERO_SRC} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#eef2f4]" />
            <div className="relative z-10 flex max-w-4xl flex-col items-center text-center">
              <LiquidGlass radius="pill" className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold tracking-widest uppercase">
                <Sparkles className="h-3.5 w-3.5" /> Liquid Glass Lab
              </LiquidGlass>
              <h1 className="font-headline text-5xl leading-[0.95] font-bold tracking-tight md:text-7xl">
                会折射光线的
                <br />
                界面玻璃
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#2c3237]">
                边缘弯折背景、高光跟随指针、按压有果冻回弹，滚动时导航栏收缩并按背景切换明暗。右下角可以实时调参数。
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <GlassButton tint={BRAND_TINT} className="h-16 px-9 text-lg" onClick={() => navigateTo('/editor')}>
                  开始设计
                </GlassButton>
                <GlassButton className="h-16 px-9 text-lg" onClick={() => document.getElementById('compare')?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth' })}>
                  看新旧对比
                </GlassButton>
              </div>
              <LiquidGlass radius="pill" sheen className="mt-14 inline-flex items-center gap-1 p-2" aria-label="编辑器工具条预览">
                {[
                  [Move, '移动'],
                  [Box, '房间'],
                  [Layers, '图层'],
                  [Ruler, '测量'],
                  [Compass, '漫游'],
                ].map(([Icon, label]) => {
                  const ToolIcon = Icon as typeof Move;
                  return (
                    <GlassButton key={label as string} label={label as string} pressed={activeTool === label} onClick={() => setActiveTool(label as string)} className="h-12 w-12" tint={activeTool === label ? BRAND_TINT : 'rgba(255,255,255,0.05)'}>
                      <ToolIcon className="h-5 w-5" />
                    </GlassButton>
                  );
                })}
              </LiquidGlass>
              <p aria-live="polite" className="mt-4 text-sm">工具预览：{activeTool}</p>
            </div>
          </section>

          <section id="lens" data-lg-section-tone="light" className="px-6 py-28">
            <SectionTitle eyebrow="01 · Refraction" title="边缘折射">
              玻璃中间保持清晰，只有靠近边缘的一圈会把背景向内弯折，越靠边越强，像一块凸透镜。拖动下面的两块玻璃，看条纹和文字在边缘处的弯曲。
            </SectionTitle>
            <LensPlayground />
          </section>

          <section id="controls" data-lg-section-tone="light" className="relative px-6 py-28" style={{ background: COLOR_FIELD }}>
            <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: STRIPES }} />
            <div className="relative">
              <SectionTitle eyebrow="02 · Controls" title="控件与动效">
                点击切换视图，观察滑块流动；按住开关和按钮，感受轻微的压缩与回弹。这里的控件用于预览交互手感。
              </SectionTitle>
              <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
                <LiquidGlass radius={32} sheen className="flex flex-col items-center gap-6 p-5 sm:p-10">
                  <GlassSegmented options={['平面', '3D', '漫游']} />
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">吸附网格</span>
                    <GlassSwitch label="吸附网格" checked={switchOn} onChange={setSwitchOn} />
                  </div>
                  <div className="flex gap-3">
                    <GlassButton label="首页" className="h-14 w-14" onClick={() => navigateTo('/')}><Home className="h-5 w-5" /></GlassButton>
                    <GlassButton label="图层" pressed={activeTool === '图层'} onClick={() => setActiveTool('图层')} className="h-14 w-14" tint={activeTool === '图层' ? BRAND_TINT : undefined}><Layers className="h-5 w-5" /></GlassButton>
                    <GlassButton label="测量" pressed={activeTool === '测量'} onClick={() => setActiveTool('测量')} className="h-14 w-14" tint={activeTool === '测量' ? BRAND_TINT : undefined}><Ruler className="h-5 w-5" /></GlassButton>
                  </div>
                </LiquidGlass>
                <LiquidGlass radius={32} sheen className="flex flex-col justify-between p-8">
                  <div>
                    <p className="text-xs font-bold tracking-widest uppercase opacity-60">Room</p>
                    <p className="mt-2 font-headline text-3xl font-bold">客厅</p>
                    <p className="mt-1 opacity-75">5.40 m × 4.55 m · 层高 2.80 m</p>
                  </div>
                  <div className="mt-8 grid grid-cols-3 gap-3 text-center">
                    {[
                      ['24.6', '面积 ㎡'],
                      ['4', '墙体'],
                      ['2', '门窗'],
                    ].map(([value, label]) => (
                      <LiquidGlass key={label} radius={18} tint="rgba(255,255,255,0.18)" className="py-4">
                        <p className="font-headline text-2xl font-bold">{value}</p>
                        <p className="text-xs opacity-70">{label}</p>
                      </LiquidGlass>
                    ))}
                  </div>
                </LiquidGlass>
              </div>
            </div>
          </section>

          <section id="compare" data-lg-section-tone="light" className="px-6 py-28">
            <SectionTitle eyebrow="03 · Compare" title="新旧对比">
              同一张背景上的三种写法。左边是修复前的首页：外层 filter 让 backdrop-filter 失效，玻璃后面的条纹完全清晰。
            </SectionTitle>
            <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
              <CompareCard title="修复前的首页" note="父级 filter: contrast(1.05) 让模糊失效，只剩半透明白底加双线边框。">
                <div style={{ filter: 'contrast(1.05)' }}>
                  <div className="liquid-glass-shell flex h-[96px] w-[240px] items-center justify-center rounded-[32px] font-semibold">
                    <span className="liquid-glass-depth-ring" />
                    <span className="liquid-glass-inner-ring" />
                    <span className="relative z-10">Start Designing</span>
                  </div>
                </div>
              </CompareCard>
              <CompareCard title="修复后：毛玻璃" note="模糊和饱和度恢复，Safari / Firefox 上新组件也是这个样子。">
                <LiquidGlass radius={32} refract={false} className="flex h-[96px] w-[240px] items-center justify-center font-semibold">
                  Start Designing
                </LiquidGlass>
              </CompareCard>
              <CompareCard title="Liquid Glass" note="边缘折射 + 色散 + 跟随指针的高光；中间保持通透。">
                <LiquidGlass radius={32} sheen className="flex h-[96px] w-[240px] items-center justify-center font-semibold">
                  Start Designing
                </LiquidGlass>
              </CompareCard>
            </div>
          </section>

          <section
            id="dark"
            data-lg-section-tone="dark"
            className="relative min-h-screen overflow-hidden px-6 py-32 text-white"
            style={{ background: 'linear-gradient(160deg, #0d1316, #102a2b 55%, #2b1a0c)' }}
          >
            <img src={PLAN_SRC} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-screen" />
            <div className="pointer-events-none absolute -top-20 left-1/4 h-96 w-96 rounded-full bg-[#26dcd6]/40 blur-3xl" />
            <div className="pointer-events-none absolute right-1/5 bottom-0 h-80 w-80 rounded-full bg-[#ff9f1c]/35 blur-3xl" />
            <div className="relative">
              <SectionTitle eyebrow="04 · Adaptive" title="深色背景自适应">
                滚到这里时导航栏会切到深色玻璃：底色变暗、文字变白、高光减弱，保证文字对比度。
              </SectionTitle>
              <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-6">
                <GlassSegmented options={['材质', '灯光', '导出']} tone="dark" />
                <GlassSwitch label="夜景模式" tone="dark" checked={switchOn} onChange={setSwitchOn} />
                <GlassButton tone="dark" className="h-14 px-8" onClick={() => navigateTo('/editor')}>
                  进入编辑器
                </GlassButton>
              </div>
            </div>
          </section>

          <footer data-lg-section-tone="light" className="flex flex-col items-center gap-3 px-6 py-16 text-sm opacity-80">
            <p className="max-w-lg text-center">Liquid Glass 样式预览 · 支持系统减少动态效果设置。折射在桌面 Chrome / Edge 中体验最佳。</p>
            <button type="button" className="underline underline-offset-4" onClick={() => navigateTo('/')}>
              返回首页
            </button>
          </footer>

          <SettingsPanel settings={settings} onChange={setSettings} />
        </div>
      </LiquidGlassSettingsContext.Provider>
    </MotionConfig>
  );
}
