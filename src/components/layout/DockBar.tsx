import { useStore } from '../../store/useStore.js';
import type { DockTab } from '../../types/camera.js';
import { Home, Armchair, Palette, Ruler, Camera } from 'lucide-react';
import { editorTheme } from '../../theme/editorTheme.js';

const dockItems: { tab: DockTab; icon: typeof Home; label: string }[] = [
  { tab: 'building', icon: Home, label: '建筑' },
  { tab: 'furniture', icon: Armchair, label: '家具' },
  { tab: 'materials', icon: Palette, label: '材质' },
  { tab: 'measure', icon: Ruler, label: '测量' },
  { tab: 'export', icon: Camera, label: '导出' },
];

export default function DockBar() {
  const activeTab = useStore((s) => s.activeTab);
  const dockOpen = useStore((s) => s.dockOpen);
  const toggleDock = useStore((s) => s.toggleDock);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-end gap-2 px-3 py-2 rounded-2xl border"
      style={{
        background: editorTheme.surface,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: editorTheme.border,
        boxShadow: '0 20px 48px -32px rgba(82, 56, 33, 0.45)',
      }}
    >
      {dockItems.map((item) => {
        const isActive = dockOpen && activeTab === item.tab;
        const Icon = item.icon;
        return (
          <button
            key={item.tab}
            type="button"
            onClick={() => toggleDock(item.tab)}
            className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-150 relative group"
            style={{ minWidth: 56 }}
          >
            <Icon
              size={22}
              className="transition-colors duration-150"
              style={{ color: isActive ? editorTheme.accentStrong : editorTheme.textMuted }}
            />
            <span
              className="text-[11px] leading-none transition-colors duration-150"
              style={{ color: isActive ? editorTheme.text : editorTheme.textMuted }}
            >
              {item.label}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full"
                style={{ background: editorTheme.accentStrong }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
