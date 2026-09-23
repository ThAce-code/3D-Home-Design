import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';

interface Props {
  zoneId: string;
}

export default function ZonePropertyPanel({ zoneId }: Props) {
  const document = useArchitectureDocumentStore((state) => state.document);
  const zone = document.zones[zoneId];

  if (!zone) {
    return null;
  }

  return (
    <div
      data-testid="zone-property-panel"
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
      <div className="p-4 flex flex-col gap-2">
        <h3 className="text-sm font-semibold" style={{ color: '#F8F5F0' }}>Zone</h3>
        <p className="text-xs" style={{ color: '#9AB0A6' }}>{zoneId}</p>
        <p className="text-sm" style={{ color: '#F8F5F0' }}>
          kind: {zone.kind}
        </p>
        <p className="text-sm" style={{ color: '#F8F5F0' }}>
          boundary vertices: {zone.boundaryVertexIds.length}
        </p>
      </div>
    </div>
  );
}
