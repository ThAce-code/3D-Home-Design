import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { createWallPropertyStoreController } from '../../architecture/editing/propertyController.js';
import { editorThemeVars } from '../../theme/editorTheme.js';

interface Props {
  wallId: string;
}

const wallPropertyController = createWallPropertyStoreController({
  documentStore: useArchitectureDocumentStore,
});

export default function WallPropertyPanel({ wallId }: Props) {
  const document = useArchitectureDocumentStore((state) => state.document);
  const wall = document.walls[wallId];

  if (!wall) {
    return null;
  }

  const inputStyle = {
    background: editorThemeVars.field,
    border: `1px solid ${editorThemeVars.fieldBorder}`,
    color: editorThemeVars.text,
  };

  return (
    <div
      data-testid="wall-property-panel"
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 border overflow-hidden"
      style={{
        width: 260,
        background: editorThemeVars.surfaceStrong,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: editorThemeVars.border,
        borderRadius: 12,
        boxShadow: '0 24px 56px -36px rgba(82, 56, 33, 0.48)',
      }}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold" style={{ color: editorThemeVars.text }}>墙体</h3>
          <p className="text-xs" style={{ color: editorThemeVars.textMuted }}>{wallId}</p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="w-16 text-xs" style={{ color: editorThemeVars.textMuted }}>厚度</span>
          <input
            type="number"
            min="0.05"
            step="0.01"
            value={wall.thickness}
            onChange={(event) => {
              const next = Number.parseFloat(event.target.value);
              if (!Number.isFinite(next) || next <= 0) {
                return;
              }
              wallPropertyController.patchWall(wallId, { thickness: next });
            }}
            className="flex-1 rounded-md px-2 py-1 text-sm outline-none"
            style={inputStyle}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="w-16 text-xs" style={{ color: editorThemeVars.textMuted }}>高度</span>
          <input
            type="number"
            min="0.5"
            step="0.1"
            value={wall.height}
            onChange={(event) => {
              const next = Number.parseFloat(event.target.value);
              if (!Number.isFinite(next) || next <= 0) {
                return;
              }
              wallPropertyController.patchWall(wallId, { height: next });
            }}
            className="flex-1 rounded-md px-2 py-1 text-sm outline-none"
            style={inputStyle}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="w-16 text-xs" style={{ color: editorThemeVars.textMuted }}>类型</span>
          <select
            value={wall.kind}
            onChange={(event) => wallPropertyController.patchWall(wallId, { kind: event.target.value as typeof wall.kind })}
            className="flex-1 rounded-md px-2 py-1 text-sm outline-none"
            style={inputStyle}
          >
            <option value="structural">structural</option>
            <option value="partition">partition</option>
          </select>
        </label>
      </div>
    </div>
  );
}
