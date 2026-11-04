import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import { buildZoneAreaDescriptors } from '../../architecture/geometry/zoneArea.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { editorTheme } from '../../theme/editorTheme.js';

export default function ZoneAreaLabels() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const labels = useMemo(() => buildZoneAreaDescriptors(document), [document]);

  if (!labels.length) {
    return null;
  }

  return (
    <group name="zone-area-labels">
      {labels.map((label) => (
        <Html
          key={label.zoneId}
          position={[label.centroid[0], 0.08, label.centroid[1]]}
          center
          transform={false}
          zIndexRange={[15, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            data-testid={`zone-area-label:${label.zoneId}`}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              border: `1px solid ${editorTheme.border}`,
              background: editorTheme.surfaceStrong,
              color: editorTheme.text,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: 12,
              lineHeight: 1.35,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 8px 20px rgba(47, 36, 24, 0.12)',
            }}
          >
            <div style={{ fontWeight: 600 }}>{label.name?.trim() || '未命名房间'}</div>
            <div style={{ color: editorTheme.textMuted }}>{label.area.toFixed(2)} m²</div>
          </div>
        </Html>
      ))}
    </group>
  );
}
