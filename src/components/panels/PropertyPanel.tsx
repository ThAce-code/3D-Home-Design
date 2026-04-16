import { useStore } from '../../store/useStore.js';
import { Move, RotateCw, Maximize2, Trash2, Copy } from 'lucide-react';
import type { TransformTool } from '../../types/camera.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import WallPropertyPanel from './WallPropertyPanel.js';
import ZonePropertyPanel from './ZonePropertyPanel.js';
import { editorThemeVars } from '../../theme/editorTheme.js';

const tools: { value: TransformTool; icon: typeof Move; label: string }[] = [
  { value: 'translate', icon: Move, label: '移动' },
  { value: 'rotate', icon: RotateCw, label: '旋转' },
  { value: 'scale', icon: Maximize2, label: '缩放' },
];

interface Props {
  architectureModeEnabled?: boolean;
}

export default function PropertyPanel({ architectureModeEnabled = false }: Props) {
  const architectureSelection = useArchitectureEditorStore((state) => state.selection);
  const items = useStore((s) => s.items);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const updateItem = useStore((s) => s.updateItem);
  const removeItem = useStore((s) => s.removeItem);
  const assets = useStore((s) => s.assets);
  const transformTool = useStore((s) => s.transformTool);
  const setTransformTool = useStore((s) => s.setTransformTool);

  if (architectureModeEnabled) {
    const wallId = architectureSelection.wallIds[0];
    if (wallId) {
      return <WallPropertyPanel wallId={wallId} />;
    }

    const zoneId = architectureSelection.zoneIds[0];
    if (zoneId) {
      return <ZonePropertyPanel zoneId={zoneId} />;
    }

    return null;
  }

  const item = items.find((i) => i.id === selectedItemId);
  if (!item) return null;

  const asset = assets.find((a) => a.id === item.assetId);

  const handlePosChange = (axis: 0 | 1 | 2, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const pos: [number, number, number] = [...item.position];
    pos[axis] = num;
    updateItem(item.id, { position: pos });
  };

  const handleScaleChange = (axis: 0 | 1 | 2, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    const scl: [number, number, number] = [...item.scale];
    scl[axis] = num;
    updateItem(item.id, { scale: scl });
  };

  const axisLabels = ['X', 'Y', 'Z'] as const;

  const inputStyle = {
    background: editorThemeVars.field,
    border: `1px solid ${editorThemeVars.fieldBorder}`,
    color: editorThemeVars.text,
  };

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 border overflow-hidden"
      style={{
        width: 240,
        background: editorThemeVars.surfaceStrong,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: editorThemeVars.border,
        borderRadius: 12,
        animation: 'panel-pop 150ms ease-out',
        boxShadow: '0 24px 56px -36px rgba(82, 56, 33, 0.48)',
      }}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        {asset && (
          <h3 className="text-sm font-semibold" style={{ color: editorThemeVars.text }}>{asset.name}</h3>
        )}

        {/* Toolbar */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: editorThemeVars.field }}>
          {tools.map((t) => {
            const isActive = transformTool === t.value;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTransformTool(t.value)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: isActive ? editorThemeVars.accentSoft : 'transparent',
                  color: isActive ? editorThemeVars.accentStrong : editorThemeVars.textMuted,
                }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Position */}
        <div style={{ borderTop: `1px solid ${editorThemeVars.border}` }} className="pt-3">
          <h4 className="text-xs mb-2" style={{ color: editorThemeVars.textMuted }}>位置</h4>
          <div className="flex flex-col gap-1.5">
            {axisLabels.map((label, i) => (
              <label key={label} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-xs font-medium" style={{ color: editorThemeVars.textMuted }}>{label}</span>
                <input
                  type="number"
                  step="0.1"
                  value={item.position[i].toFixed(2)}
                  onChange={(e) => handlePosChange(i as 0|1|2, e.target.value)}
                  className="flex-1 rounded-md px-2 py-1 text-sm outline-none"
                  style={inputStyle}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div style={{ borderTop: `1px solid ${editorThemeVars.border}` }} className="pt-3">
          <h4 className="text-xs mb-2" style={{ color: editorThemeVars.textMuted }}>缩放</h4>
          <div className="flex flex-col gap-1.5">
            {axisLabels.map((label, i) => (
              <label key={label} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-xs font-medium" style={{ color: editorThemeVars.textMuted }}>{label}</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.01"
                  value={item.scale[i].toFixed(2)}
                  onChange={(e) => handleScaleChange(i as 0|1|2, e.target.value)}
                  className="flex-1 rounded-md px-2 py-1 text-sm outline-none"
                  style={inputStyle}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${editorThemeVars.border}` }}>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm transition-colors"
            style={{ color: editorThemeVars.danger, background: editorThemeVars.dangerSoft }}
          >
            <Trash2 size={14} />
            删除
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm transition-colors"
            style={{ color: editorThemeVars.accentStrong, background: editorThemeVars.field }}
          >
            <Copy size={14} />
            复制
          </button>
        </div>
      </div>
    </div>
  );
}
