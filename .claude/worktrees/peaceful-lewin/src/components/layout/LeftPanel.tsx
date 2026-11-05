import { useStore } from '../../store/useStore.js';
import RoomPanel from '../panels/RoomPanel.js';
import AssetPanel from '../panels/AssetPanel.js';
import MaterialPanel from '../panels/MaterialPanel.js';
import MeasurePanel from '../panels/MeasurePanel.js';
import ExportPanel from '../panels/ExportPanel.js';

const panelMap = {
  rooms: RoomPanel,
  furniture: AssetPanel,
  materials: MaterialPanel,
  measure: MeasurePanel,
  export: ExportPanel,
} as const;

export default function LeftPanel() {
  const activeTab = useStore((s) => s.activeTab);
  const dockOpen = useStore((s) => s.dockOpen);

  const Panel = panelMap[activeTab];

  return (
    <div
      className="fixed left-4 z-50 overflow-y-auto overflow-x-hidden border transition-all duration-150"
      style={{
        bottom: 96,
        width: 256,
        maxHeight: 'calc(100vh - 120px)',
        background: 'rgba(19,61,47,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: 'rgba(248,245,240,0.06)',
        borderRadius: 12,
        transform: dockOpen ? 'translateX(0)' : 'translateX(-280px)',
        opacity: dockOpen ? 1 : 0,
        pointerEvents: dockOpen ? 'auto' : 'none',
      }}
    >
      <Panel />
    </div>
  );
}
