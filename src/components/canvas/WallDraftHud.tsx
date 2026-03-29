import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';

export default function WallDraftHud() {
  const draftWall = useArchitectureEditorStore((state) => state.draftWall);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const wallTool = useArchitectureEditorStore((state) => state.toolState.wall);

  if (activeTool !== 'wall' || !draftWall) {
    return null;
  }

  const hints = [
    '按墙中线绘制',
    wallTool.modifiers.shiftKey ? '正交锁定' : null,
    wallTool.constraints.closureCandidateVertexId ? '释放以闭合' : null,
    '按 Tab 输入长度',
    'Esc 取消',
  ].filter((hint): hint is string => Boolean(hint));

  return (
    <group data-testid="wall-draft-hud">
      {hints.map((hint) => (
        <wall-draft-hint key={hint}>{hint}</wall-draft-hint>
      ))}
    </group>
  );
}
