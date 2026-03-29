import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { reduceArchitectureCommand } from '../../architecture/editing/reducers.js';

interface Props {
  wallId: string;
}

export default function WallPropertyPanel({ wallId }: Props) {
  const document = useArchitectureDocumentStore((state) => state.document);
  const replaceDocument = useArchitectureDocumentStore((state) => state.replaceDocument);
  const wall = document.walls[wallId];

  if (!wall) {
    return null;
  }

  const inputStyle = {
    background: 'rgba(248,245,240,0.06)',
    border: '1px solid rgba(248,245,240,0.06)',
    color: '#F8F5F0',
  };

  const patchWall = (patch: Partial<Pick<typeof wall, 'thickness' | 'height' | 'kind'>>) => {
    replaceDocument(reduceArchitectureCommand(document, {
      type: 'SET_WALL_PROPS',
      wallId,
      patch,
    }));
  };

  return (
    <div
      data-testid="wall-property-panel"
      className="fixed right-4 top-1/2 -translate-y-1/2 z-50 border overflow-hidden"
      style={{
        width: 260,
        background: 'rgba(19,61,47,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: 'rgba(248,245,240,0.06)',
        borderRadius: 12,
      }}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold" style={{ color: '#F8F5F0' }}>墙体</h3>
          <p className="text-xs" style={{ color: '#9AB0A6' }}>{wallId}</p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="w-16 text-xs" style={{ color: '#9AB0A6' }}>厚度</span>
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
              patchWall({ thickness: next });
            }}
            className="flex-1 rounded-md px-2 py-1 text-sm outline-none"
            style={inputStyle}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="w-16 text-xs" style={{ color: '#9AB0A6' }}>高度</span>
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
              patchWall({ height: next });
            }}
            className="flex-1 rounded-md px-2 py-1 text-sm outline-none"
            style={inputStyle}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="w-16 text-xs" style={{ color: '#9AB0A6' }}>类型</span>
          <select
            value={wall.kind}
            onChange={(event) => patchWall({ kind: event.target.value as typeof wall.kind })}
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
