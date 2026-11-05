import { useStore } from '../../store/useStore.js';
import { Move, RotateCw, Maximize2, Trash2, Copy } from 'lucide-react';
import type { TransformTool } from '../../types/camera.js';

const tools: { value: TransformTool; icon: typeof Move; label: string }[] = [
  { value: 'translate', icon: Move, label: '移动' },
  { value: 'rotate', icon: RotateCw, label: '旋转' },
  { value: 'scale', icon: Maximize2, label: '缩放' },
];

export default function PropertyPanel() {
  const items = useStore((s) => s.items);
  const selectedItemId = useStore((s) => s.selectedItemId);
  const updateItem = useStore((s) => s.updateItem);
  const removeItem = useStore((s) => s.removeItem);
  const assets = useStore((s) => s.assets);
  const transformTool = useStore((s) => s.transformTool);
  const setTransformTool = useStore((s) => s.setTransformTool);

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
    background: 'rgba(248,245,240,0.06)',
    border: '1px solid rgba(248,245,240,0.06)',
    color: '#F8F5F0',
  };

  return (
    <div
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 border overflow-hidden"
      style={{
        width: 240,
        background: 'rgba(19,61,47,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: 'rgba(248,245,240,0.06)',
        borderRadius: 12,
        animation: 'panel-pop 150ms ease-out',
      }}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        {asset && (
          <h3 className="text-sm font-semibold" style={{ color: '#F8F5F0' }}>{asset.name}</h3>
        )}

        {/* Toolbar */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(248,245,240,0.04)' }}>
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
                  background: isActive ? 'rgba(40,163,117,0.2)' : 'transparent',
                  color: isActive ? '#28A375' : '#9AB0A6',
                }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Position */}
        <div style={{ borderTop: '1px solid rgba(248,245,240,0.06)' }} className="pt-3">
          <h4 className="text-xs mb-2" style={{ color: '#9AB0A6' }}>位置</h4>
          <div className="flex flex-col gap-1.5">
            {axisLabels.map((label, i) => (
              <label key={label} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-xs font-medium" style={{ color: '#9AB0A6' }}>{label}</span>
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
        <div style={{ borderTop: '1px solid rgba(248,245,240,0.06)' }} className="pt-3">
          <h4 className="text-xs mb-2" style={{ color: '#9AB0A6' }}>缩放</h4>
          <div className="flex flex-col gap-1.5">
            {axisLabels.map((label, i) => (
              <label key={label} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-xs font-medium" style={{ color: '#9AB0A6' }}>{label}</span>
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
        <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid rgba(248,245,240,0.06)' }}>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm transition-colors hover:bg-red-500/20"
            style={{ color: '#EF4444' }}
          >
            <Trash2 size={14} />
            删除
          </button>
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/10"
            style={{ color: '#E1C699' }}
          >
            <Copy size={14} />
            复制
          </button>
        </div>
      </div>
    </div>
  );
}
