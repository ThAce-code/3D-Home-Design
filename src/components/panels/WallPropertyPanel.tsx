import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { createWallPropertyStoreController } from '../../architecture/editing/propertyController.js';
import { editorThemeVars } from '../../theme/editorTheme.js';
import { distanceBetweenPoints } from '../../architecture/topology/math.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { Ruler, Trash2 } from 'lucide-react';
import type { WallKind } from '../../architecture/domain/wall.js';

interface Props {
  wallId: string;
}

const wallPropertyController = createWallPropertyStoreController({
  documentStore: useArchitectureDocumentStore,
});

const wallKindLabels: Record<WallKind, string> = {
  structural: '承重墙',
  partition: '隔墙',
};

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
  const startVertex = document.vertices[wall.startVertexId];
  const endVertex = document.vertices[wall.endVertexId];
  const wallLength = startVertex && endVertex
    ? distanceBetweenPoints([startVertex.x, startVertex.y], [endVertex.x, endVertex.y])
    : null;

  const handleDelete = () => {
    wallPropertyController.deleteWall(wallId);
    useArchitectureEditorStore.getState().clearSelection();
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
      <div className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold" style={{ color: editorThemeVars.text }}>墙体</h3>
          <p className="text-xs" style={{ color: editorThemeVars.textMuted }}>
            调整墙体尺寸和类型
          </p>
        </div>

        <div
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: editorThemeVars.field, border: `1px solid ${editorThemeVars.fieldBorder}` }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: editorThemeVars.text }}>
            <Ruler size={15} style={{ color: editorThemeVars.accentStrong }} />
            <span>长度</span>
          </div>
          <span className="text-sm font-medium" style={{ color: editorThemeVars.text }}>
            {wallLength === null ? '未知' : `${wallLength.toFixed(2)} m`}
          </span>
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
            <option value="structural">{wallKindLabels.structural}</option>
            <option value="partition">{wallKindLabels.partition}</option>
          </select>
        </label>

        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-opacity hover:opacity-90"
          style={{ background: editorThemeVars.dangerSoft, color: editorThemeVars.danger }}
        >
          <Trash2 size={15} />
          删除墙体
        </button>
      </div>
    </div>
  );
}
