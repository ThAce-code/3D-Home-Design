import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { createZonePropertyStoreController } from '../../architecture/editing/propertyController.js';
import type { ArchitectureDocument } from '../../architecture/domain/document.js';
import type { ZoneKind } from '../../architecture/domain/zone.js';
import { editorThemeVars } from '../../theme/editorTheme.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { Bath, BedDouble, CircleHelp, CookingPot, DoorOpen, Home, Sofa, Trash2, Trees, Utensils } from 'lucide-react';

interface Props {
  zoneId: string;
}

const zonePropertyController = createZonePropertyStoreController({
  documentStore: useArchitectureDocumentStore,
});

const zoneKindOptions: Array<{ value: ZoneKind; label: string; icon: typeof Home }> = [
  { value: 'living_room', label: '客厅', icon: Sofa },
  { value: 'bedroom', label: '卧室', icon: BedDouble },
  { value: 'kitchen', label: '厨房', icon: CookingPot },
  { value: 'bathroom', label: '卫生间', icon: Bath },
  { value: 'dining', label: '餐厅', icon: Utensils },
  { value: 'corridor', label: '走廊', icon: DoorOpen },
  { value: 'balcony', label: '阳台', icon: Trees },
  { value: 'room', label: '房间', icon: Home },
  { value: 'unknown', label: '未分类', icon: CircleHelp },
];

function getZoneArea(document: ArchitectureDocument, zoneId: string): number | null {
  const zone = document.zones[zoneId];

  if (!zone || zone.boundaryVertexIds.length < 3) {
    return null;
  }

  const points = zone.boundaryVertexIds.map((vertexId) => {
    const vertex = document.vertices[vertexId];

    return vertex ? [vertex.x, vertex.y] as const : null;
  });

  if (points.some((point) => point === null)) {
    return null;
  }

  let signedArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];

    if (!current || !next) {
      return null;
    }

    signedArea += (current[0] * next[1]) - (next[0] * current[1]);
  }

  return Math.abs(signedArea) / 2;
}

export default function ZonePropertyPanel({ zoneId }: Props) {
  const document = useArchitectureDocumentStore((state) => state.document);
  const zone = document.zones[zoneId];

  if (!zone) {
    return null;
  }

  const area = getZoneArea(document, zoneId);
  const activeKind = zoneKindOptions.find((option) => option.value === zone.kind) ?? zoneKindOptions[zoneKindOptions.length - 1];
  const ActiveKindIcon = activeKind.icon;
  const inputStyle = {
    background: editorThemeVars.field,
    border: `1px solid ${editorThemeVars.fieldBorder}`,
    color: editorThemeVars.text,
  };

  const handleNameChange = (value: string) => {
    const trimmed = value.trim();
    zonePropertyController.patchZone(zoneId, { name: trimmed.length > 0 ? trimmed : null });
  };

  const handleDelete = () => {
    zonePropertyController.deleteZone(zoneId);
    useArchitectureEditorStore.getState().clearSelection();
  };

  return (
    <div
      data-testid="zone-property-panel"
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
          <h3 className="text-sm font-semibold" style={{ color: editorThemeVars.text }}>房间</h3>
          <p className="text-xs" style={{ color: editorThemeVars.textMuted }}>
            命名房间并设置用途
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-xs" style={{ color: editorThemeVars.textMuted }}>
          名称
          <input
            aria-label="房间名称"
            type="text"
            value={zone.name ?? ''}
            placeholder="未命名房间"
            onChange={(event) => handleNameChange(event.target.value)}
            className="rounded-md px-2 py-1.5 text-sm outline-none"
            style={inputStyle}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs" style={{ color: editorThemeVars.textMuted }}>
          类型
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ background: editorThemeVars.accentSoft, color: editorThemeVars.accentStrong }}
            >
              <ActiveKindIcon size={16} />
            </div>
            <select
              aria-label="房间类型"
              value={zone.kind}
              onChange={(event) => zonePropertyController.patchZone(zoneId, { kind: event.target.value as ZoneKind })}
              className="flex-1 rounded-md px-2 py-1.5 text-sm outline-none"
              style={inputStyle}
            >
              {zoneKindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </label>

        <div
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: editorThemeVars.field, border: `1px solid ${editorThemeVars.fieldBorder}` }}
        >
          <span className="text-sm" style={{ color: editorThemeVars.textMuted }}>面积</span>
          <span className="text-sm font-medium" style={{ color: editorThemeVars.text }}>
            {area === null ? '未知' : `${area.toFixed(2)} m²`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-opacity hover:opacity-90"
          style={{ background: editorThemeVars.dangerSoft, color: editorThemeVars.danger }}
        >
          <Trash2 size={15} />
          删除房间
        </button>
      </div>
    </div>
  );
}
