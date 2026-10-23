import { findNearestWallBodySnapCandidate } from '../../architecture/geometry/wallDraftSnap.js';
import { distanceBetweenPoints } from '../../architecture/topology/math.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { useStore } from '../../store/useStore.js';
import { editorThemeVars } from '../../theme/editorTheme.js';

const PANEL_OFFSET_LEFT = 288;
const HUD_DEFAULT_LEFT = 16;
const HUD_BOTTOM_CLEARING_DOCK = 96;

export default function WallDraftHud() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const draftWall = useArchitectureEditorStore((state) => state.draftWall);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const wallTool = useArchitectureEditorStore((state) => state.toolState.wall);
  const dockOpen = useStore((state) => state.dockOpen);

  if (activeTool !== 'wall' || !draftWall) {
    return null;
  }

  const wallBodySnap = findNearestWallBodySnapCandidate(document, draftWall.currentPoint, 1e-6);
  const draftLength = distanceBetweenPoints(draftWall.startPoint, draftWall.currentPoint);
  const hints = [
    `长度 ${draftLength.toFixed(2)} m`,
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
        left: dockOpen ? PANEL_OFFSET_LEFT : HUD_DEFAULT_LEFT,
        bottom: HUD_BOTTOM_CLEARING_DOCK,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 12px',
        borderRadius: 10,
        border: `1px solid ${editorThemeVars.border}`,
        background: editorThemeVars.surfaceStrong,
        backdropFilter: 'blur(18px)',
        boxShadow: '0 12px 36px rgba(15, 23, 42, 0.16)',
        pointerEvents: 'none',
        color: editorThemeVars.text,
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
