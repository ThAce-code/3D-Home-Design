import { useCallback, useSyncExternalStore } from 'react';

export type LandingLocale = 'en' | 'zh';

export const LANDING_LOCALE_STORAGE_KEY = 'facility-landing-locale';

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function readStoredLocale(): LandingLocale {
  if (typeof window === 'undefined') return 'en';
  try {
    const value = window.localStorage.getItem(LANDING_LOCALE_STORAGE_KEY);
    return value === 'zh' ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

let current: LandingLocale = typeof window === 'undefined' ? 'en' : readStoredLocale();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return current;
}

export const landingCopy = {
  en: {
    brand: 'Facility Design',
    navGallery: 'Gallery',
    navDocs: 'Docs',
    navExperience: 'Experience',
    navStudio: 'Studio',
    authAria: 'Sign in / Sign up',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    appearanceDay: 'Day appearance',
    appearanceNight: 'Night appearance',
    localeSwitch: '中文',
    badge: 'Next-Gen Spatial Engine',
    titleLine1: 'Build Your',
    titleLine2: 'Architectural',
    titleLine3: 'Dream. Realized.',
    subtitle:
      'A precision configurator for interactive 3D interior design and floor planning. Craft environments with the fluidity of an artist and the precision of an engineer.',
    cta: 'Start Designing',
    previewTitle: 'Design with the',
    previewTitleEm: 'Speed of Thought.',
    featureRay: 'Real-time Raytracing',
    featureRayBody:
      'Visualize materials, lighting, and textures with cinematic fidelity as you work. No wait times, just instant beauty.',
    featureAssets: 'Smart Asset Library',
    featureAssetsBody:
      'Access a curated gallery of 5,000+ architect-certified furniture pieces, fixtures, and structural elements.',
    featureDrag: 'Drag & Drop Geometry',
    featureDragBody:
      'Seamlessly manipulate 3D volumes with our proprietary spatial snapping engine. Architecture made tactile.',
    featureFps: 'Immersive FPS Roaming',
    featureFpsBody:
      'Experience your floor plans in real-time first-person perspective. Walk through your creation before a single brick is laid.',
    featureFacility: 'Facility Optimized',
    featureFacilityBody:
      'Engineered for large-scale architectural workflows. High-poly counts, real-time lighting, and precise CAD exports.',
    experienceEyebrow: 'Experience',
    experienceTitle: 'Walk through every decision before it becomes built space.',
    experienceBody:
      'Move from layout to atmosphere with an interface tuned for spatial feedback, immersive review, and a calmer design flow from concept through presentation.',
    footerRights: '© 2024 Facility Design Architectural Studio. All rights reserved.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    signIn: 'Sign in / Sign up',
  },
  zh: {
    brand: 'Facility Design',
    navGallery: '图廊',
    navDocs: '文档',
    navExperience: '体验',
    navStudio: '工作室',
    authAria: '登录 / 注册',
    menuOpen: '打开菜单',
    menuClose: '关闭菜单',
    appearanceDay: '日间外观',
    appearanceNight: '夜间外观',
    localeSwitch: 'EN',
    badge: '下一代空间引擎',
    titleLine1: '构筑你的',
    titleLine2: '建筑',
    titleLine3: '梦想。成真。',
    subtitle:
      '面向交互式三维室内设计与平面规划的精密配置器。以艺术家的流畅感与工程师的精确度塑造空间。',
    cta: '开始设计',
    previewTitle: '以思维的',
    previewTitleEm: '速度设计。',
    featureRay: '实时光线追踪',
    featureRayBody: '在创作过程中以电影级保真度预览材质、光线与纹理。无需等待，所见即所得。',
    featureAssets: '智能资产库',
    featureAssetsBody: '精选 5,000+ 经建筑师认证的家具、装置与结构构件，随时取用。',
    featureDrag: '拖放几何',
    featureDragBody: '以专有空间吸附引擎流畅操控三维体块，让建筑编辑可触可感。',
    featureFps: '沉浸式第一人称漫游',
    featureFpsBody: '以实时第一人称视角体验平面方案，在动工前走遍你的创作。',
    featureFacility: '设施级优化',
    featureFacilityBody: '面向大型建筑工作流：高多边形、实时光照与精确 CAD 导出。',
    experienceEyebrow: '体验',
    experienceTitle: '在成为建成空间之前，走完每一个决策。',
    experienceBody:
      '从布局到氛围，界面为空间反馈与沉浸审阅而调校，让概念到呈现的流程更从容。',
    footerRights: '© 2024 Facility Design 建筑工作室。保留所有权利。',
    privacy: '隐私政策',
    terms: '服务条款',
    signIn: '登录 / 注册',
  },
} as const;

export type LandingCopy = {
  [K in keyof (typeof landingCopy)['en']]: string;
};

export function getLandingLocale(): LandingLocale {
  return current;
}

export function setLandingLocale(next: LandingLocale) {
  current = next;
  try {
    window.localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, next);
  } catch {
    // ignore
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
  }
  emit();
}

export function toggleLandingLocale(): LandingLocale {
  const next = current === 'en' ? 'zh' : 'en';
  setLandingLocale(next);
  return next;
}

export function hydrateLandingLocale() {
  const stored = readStoredLocale();
  current = stored;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = stored === 'zh' ? 'zh-CN' : 'en';
  }
  emit();
}

export function useLandingLocale() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, () => 'en' as LandingLocale);
  const setLocale = useCallback((next: LandingLocale) => {
    setLandingLocale(next);
  }, []);
  const toggle = useCallback(() => toggleLandingLocale(), []);
  const copy = landingCopy[locale];
  return { locale, setLocale, toggle, copy };
}
