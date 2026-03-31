import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { editorThemeVars } from '../../theme/editorTheme.js';

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
        background: editorThemeVars.surfaceStrong,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderColor: editorThemeVars.border,
        borderRadius: 12,
        boxShadow: '0 24px 56px -36px rgba(82, 56, 33, 0.48)',
      }}
    >
      <div className="p-4 flex flex-col gap-2">
        <h3 className="text-sm font-semibold" style={{ color: editorThemeVars.text }}>Zone</h3>
        <p className="text-xs" style={{ color: editorThemeVars.textMuted }}>{zoneId}</p>
        <p className="text-sm" style={{ color: editorThemeVars.text }}>
          kind: {zone.kind}
        </p>
        <p className="text-sm" style={{ color: editorThemeVars.text }}>
          boundary vertices: {zone.boundaryVertexIds.length}
        </p>
      </div>
    </div>
  );
}
