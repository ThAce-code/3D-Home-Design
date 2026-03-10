import { useStore } from '../../store/useStore.js';
import { Plus, Trash2 } from 'lucide-react';

export default function RoomPanel() {
  const rooms = useStore((s) => s.rooms);
  const selectedRoomId = useStore((s) => s.selectedRoomId);
  const selectRoom = useStore((s) => s.selectRoom);
  const updateRoom = useStore((s) => s.updateRoom);
  const removeRoom = useStore((s) => s.removeRoom);
  const addRoom = useStore((s) => s.addRoom);

  const selected = rooms.find((r) => r.id === selectedRoomId);

  const handleChange = (field: 'width' | 'depth' | 'height', value: string) => {
    if (!selected) return;
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    updateRoom(selected.id, { [field]: Math.min(50, Math.max(1, num)) });
  };

  const fieldLabels = { width: '宽度', depth: '深度', height: '层高' } as const;

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: '#F8F5F0' }}>房间管理</h3>
        <button
          type="button"
          onClick={() => addRoom({ width: 4, depth: 4, height: 3, x: 0, z: 0 })}
          className="p-1 rounded-md transition-colors hover:bg-white/10"
          style={{ color: '#E1C699' }}
        >
          <Plus size={18} />
        </button>
      </div>

      {rooms.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {rooms.map((r) => {
            const isSelected = selectedRoomId === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRoom(r.id)}
                className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors w-full text-left"
                style={{
                  color: isSelected ? '#F8F5F0' : '#9AB0A6',
                  borderLeft: isSelected ? '2px solid #28A375' : '2px solid transparent',
                  background: isSelected ? 'rgba(40,163,117,0.1)' : 'transparent',
                }}
              >
                <span>{r.width.toFixed(1)} × {r.depth.toFixed(1)}</span>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid rgba(248,245,240,0.06)' }}>
          {(['width', 'depth', 'height'] as const).map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm">
              <span className="w-10 text-xs" style={{ color: '#9AB0A6' }}>{fieldLabels[f]}</span>
              <input
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={selected[f]}
                onChange={(e) => handleChange(f, e.target.value)}
                className="flex-1 rounded-md px-2 py-1 text-sm outline-none"
                style={{
                  background: 'rgba(248,245,240,0.06)',
                  border: '1px solid rgba(248,245,240,0.06)',
                  color: '#F8F5F0',
                }}
              />
              <span className="text-xs" style={{ color: '#9AB0A6' }}>m</span>
            </label>
          ))}
          <button
            type="button"
            onClick={() => removeRoom(selected.id)}
            className="flex items-center justify-center gap-1.5 mt-1 py-1.5 rounded-lg text-sm transition-colors hover:bg-red-500/20"
            style={{ color: '#EF4444' }}
          >
            <Trash2 size={14} />
            删除房间
          </button>
        </div>
      )}
    </div>
  );
}
