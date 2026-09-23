import { findNearestWallBodySnapCandidate } from '../../architecture/geometry/wallDraftSnap.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';

export default function WallDraftHud() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const draftWall = useArchitectureEditorStore((state) => state.draftWall);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const wallTool = useArchitectureEditorStore((state) => state.toolState.wall);

  if (activeTool !== 'wall' || !draftWall) {
    return null;
  }

  const wallBodySnap = findNearestWallBodySnapCandidate(document, draftWall.currentPoint, 1e-6);
  const hints = [
    '按墙中线绘制',
    wallBodySnap ? '吸附到墙线' : null,
    wallTool.modifiers.shiftKey ? '正交锁定' : null,
    wallTool.constraints.closureCandidateVertexId ? '释放以闭合' : null,
    '按 Tab 输入长度',
    'Esc 取消',
  ].filter((hint): hint is string => Boolean(hint));

  return (
    <div
      data-testid="wall-draft-hud"
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 12px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(18px)',
        boxShadow: '0 12px 36px rgba(15, 23, 42, 0.16)',
        pointerEvents: 'none',
        color: '#173025',
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {hints.map((hint) => (
        <div key={hint}>{hint}</div>
      ))}
    </div>
  );
}
