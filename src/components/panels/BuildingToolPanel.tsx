import { SquarePen, Pointer, Hand, Eraser } from 'lucide-react';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import type { ArchitectureTool } from '../../architecture/editing/tools.js';
import { createArchitectureToolStoreController } from '../../architecture/editing/toolController.js';
import { editorThemeVars } from '../../theme/editorTheme.js';

const tools: { tool: ArchitectureTool; icon: typeof Pointer; label: string }[] = [
  { tool: 'select', icon: Pointer, label: '选择' },
  { tool: 'wall', icon: SquarePen, label: '墙体' },
  { tool: 'pan', icon: Hand, label: '平移' },
  { tool: 'delete', icon: Eraser, label: '删除' },
];

const toolController = createArchitectureToolStoreController({
  editorStore: useArchitectureEditorStore,
});

export default function BuildingToolPanel() {
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);

  return (
    <div data-testid="building-tool-panel" className="p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold" style={{ color: editorThemeVars.text }}>建筑工具</h3>
        <p className="text-xs leading-5" style={{ color: editorThemeVars.textMuted }}>
          V1 仅支持 disconnected simple loops，不支持共享墙 face extraction。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {tools.map(({ tool, icon: Icon, label }) => {
          const isActive = activeTool === tool;

          return (
            <button
              key={tool}
              type="button"
              onClick={() => toolController.selectTool(tool)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
              style={{
                background: isActive ? editorThemeVars.accentSoft : editorThemeVars.field,
                color: isActive ? editorThemeVars.accentStrong : editorThemeVars.textMuted,
                border: `1px solid ${isActive ? editorThemeVars.border : editorThemeVars.fieldBorder}`,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
