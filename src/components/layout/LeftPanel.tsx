import { useStore } from '../../store/useStore.js';
import AssetPanel from '../panels/AssetPanel.js';
import MaterialPanel from '../panels/MaterialPanel.js';
import MeasurePanel from '../panels/MeasurePanel.js';
import ExportPanel from '../panels/ExportPanel.js';
import BuildingToolPanel from '../panels/BuildingToolPanel.js';
import { editorTheme } from '../../theme/editorTheme.js';

const panelMap = {
  building: BuildingToolPanel,
  furniture: AssetPanel,
  materials: MaterialPanel,
  measure: MeasurePanel,
  export: ExportPanel,
} as const;

interface Props {
  architectureModeEnabled?: boolean;
}

export default function LeftPanel({ architectureModeEnabled = false }: Props) {
  const activeTab = useStore((s) => s.activeTab);
  const dockOpen = useStore((s) => s.dockOpen);

  const Panel = architectureModeEnabled ? BuildingToolPanel : panelMap[activeTab];

  return (
    <div
      className="fixed left-4 z-50 overflow-y-auto overflow-x-hidden border transition-all duration-150"
      style={{
        bottom: 96,
        width: 256,
        maxHeight: 'calc(100vh - 120px)',
        background: editorTheme.surface,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: editorTheme.border,
        borderRadius: 12,
        boxShadow: '0 24px 56px -36px rgba(82, 56, 33, 0.48)',
        transform: dockOpen ? 'translateX(0)' : 'translateX(-280px)',
        opacity: dockOpen ? 1 : 0,
        pointerEvents: dockOpen ? 'auto' : 'none',
      }}
    >
      <Panel />
    </div>
  );
}
