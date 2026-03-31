import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const globalHotkeysSpy = vi.fn();
const persistenceSpy = vi.fn();
const architecturePersistenceSpy = vi.fn();

vi.mock('../hooks/useGlobalHotkeys', () => ({
  useGlobalHotkeys: (...args: unknown[]) => globalHotkeysSpy(...args),
}));

vi.mock('../hooks/usePersistence', () => ({
  usePersistence: (...args: unknown[]) => persistenceSpy(...args),
}));

vi.mock('../hooks/useArchitecturePersistence', () => ({
  useArchitecturePersistence: (...args: unknown[]) => architecturePersistenceSpy(...args),
}));

vi.mock('../components/canvas/SceneRoot', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="scene-root">{children}</div>
  ),
}));

vi.mock('../components/canvas/FloorPlane', () => ({
  default: () => <div data-testid="floor-plane" />,
}));

vi.mock('../components/canvas/FurnitureModel', () => ({
  default: () => <div data-testid="furniture-model" />,
}));

vi.mock('../components/canvas/GhostPreview', () => ({
  default: () => <div data-testid="ghost-preview" />,
}));

vi.mock('../components/canvas/cameras/FPSControls', () => ({
  default: () => <div data-testid="fps-controls" />,
}));

vi.mock('../components/layout/OverlayRoot', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="overlay-root">{children}</div>
  ),
}));

vi.mock('../components/layout/DockBar', () => ({
  default: () => <div data-testid="dock-bar" />,
}));

vi.mock('../components/layout/LeftPanel', () => ({
  default: () => <div data-testid="left-panel" />,
}));

vi.mock('../components/panels/PropertyPanel', () => ({
  default: () => <div data-testid="property-panel" />,
}));

vi.mock('../components/overlays/Crosshair', () => ({
  default: () => <div data-testid="crosshair" />,
}));

vi.mock('../components/overlays/ModeIndicator', () => ({
  default: () => <div data-testid="mode-indicator" />,
}));

vi.mock('../components/overlays/LockOverlay', () => ({
  default: () => <div data-testid="lock-overlay" />,
}));

vi.mock('../components/overlays/TopActions', () => ({
  default: () => <div data-testid="top-actions" />,
}));

vi.mock('../store/useStore', () => ({
  useStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      items: [],
      selectedAssetId: null,
      assets: [],
      addItem: vi.fn(),
    }),
}));

import App from '../App';

describe('App route shell', () => {
  let mountNode: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    globalHotkeysSpy.mockReset();
    persistenceSpy.mockReset();
    architecturePersistenceSpy.mockReset();

    mountNode = document.createElement('div');
    document.body.appendChild(mountNode);
    root = createRoot(mountNode);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    mountNode.remove();
    window.history.replaceState({}, '', '/');
  });

  it('renders the landing page at / without initializing editor hooks', () => {
    window.history.replaceState({}, '', '/');

    act(() => {
      root.render(<App />);
    });

    expect(mountNode.querySelector('[data-testid="landing-page"]')).not.toBeNull();
    expect(mountNode.querySelector('[data-testid="scene-root"]')).toBeNull();
    expect(globalHotkeysSpy).not.toHaveBeenCalled();
    expect(persistenceSpy).not.toHaveBeenCalled();
    expect(architecturePersistenceSpy).not.toHaveBeenCalled();
  });

  it('renders the editor shell at /editor and initializes editor hooks', () => {
    window.history.replaceState({}, '', '/editor');

    act(() => {
      root.render(<App />);
    });

    expect(mountNode.querySelector('[data-testid="landing-page"]')).toBeNull();
    expect(mountNode.querySelector('[data-testid="scene-root"]')).not.toBeNull();
    expect(globalHotkeysSpy).toHaveBeenCalledTimes(1);
    expect(persistenceSpy).toHaveBeenCalledWith();
    expect(architecturePersistenceSpy).toHaveBeenCalledWith();
  });
});
