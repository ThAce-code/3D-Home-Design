import { useEffect, useMemo, useRef, useState } from 'react';
import { findNearestWallBodySnapCandidate } from '../../architecture/geometry/wallDraftSnap.js';
import { applyArchitectureInteractionCommands } from '../../architecture/editing/interaction.js';
import { reduceArchitectureCommand } from '../../architecture/editing/reducers.js';
import { getVertexDragCommitEffects } from '../../architecture/editing/vertexDragInteraction.js';
import { getWallDragCommitEffects } from '../../architecture/editing/wallDragInteraction.js';
import { resolveWallNumericEntryPoint } from '../../architecture/editing/wallNumericEntry.js';
import type { WallDragState } from '../../architecture/editing/tools.js';
import { distanceBetweenPoints } from '../../architecture/topology/math.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { useStore } from '../../store/useStore.js';
import { editorThemeVars } from '../../theme/editorTheme.js';

const PANEL_OFFSET_LEFT = 288;
const HUD_DEFAULT_LEFT = 16;
const HUD_BOTTOM_CLEARING_DOCK = 96;
const numericInputStyle = {
  width: 72,
  borderRadius: 6,
  border: `1px solid ${editorThemeVars.fieldBorder}`,
  background: editorThemeVars.field,
  color: editorThemeVars.text,
  padding: '4px 6px',
  fontSize: 12,
  outline: 'none',
};

export default function EditorStatusHud() {
  const document = useArchitectureDocumentStore((state) => state.document);
  const replaceDocument = useArchitectureDocumentStore((state) => state.replaceDocument);
  const draftWall = useArchitectureEditorStore((state) => state.draftWall);
  const vertexDrag = useArchitectureEditorStore((state) => state.vertexDrag);
  const wallDrag = useArchitectureEditorStore((state) => state.wallDrag);
  const activeTool = useArchitectureEditorStore((state) => state.activeTool);
  const selection = useArchitectureEditorStore((state) => state.selection);
  const wallTool = useArchitectureEditorStore((state) => state.toolState.wall);
  const commitDraftWall = useArchitectureEditorStore((state) => state.commitDraftWall);
  const commitVertexDrag = useArchitectureEditorStore((state) => state.commitVertexDrag);
  const commitWallDrag = useArchitectureEditorStore((state) => state.commitWallDrag);
  const setSelection = useArchitectureEditorStore((state) => state.setSelection);
  const setWallNumericEntryEnabled = useArchitectureEditorStore((state) => state.setWallNumericEntryEnabled);
  const setVertexDragNumericEntryEnabled = useArchitectureEditorStore((state) => state.setVertexDragNumericEntryEnabled);
  const setWallDragNumericEntryEnabled = useArchitectureEditorStore((state) => state.setWallDragNumericEntryEnabled);
  const setWallClosurePreview = useArchitectureEditorStore((state) => state.setWallClosurePreview);
  const dockOpen = useStore((state) => state.dockOpen);
  const wallDraftNumericEntryActive = activeTool === 'wall' && Boolean(draftWall) && wallTool.constraints.numericEntryEnabled;
  const vertexDragNumericEntryActive = Boolean(vertexDrag?.numericEntryEnabled);
  const wallDragNumericEntryActive = Boolean(wallDrag?.numericEntryEnabled);
  const currentLength = useMemo(() => (
    draftWall ? distanceBetweenPoints(draftWall.startPoint, draftWall.currentPoint) : 0
  ), [draftWall]);
  const [lengthInput, setLengthInput] = useState(() => currentLength.toFixed(2));
  const [vertexXInput, setVertexXInput] = useState('0.00');
  const [vertexYInput, setVertexYInput] = useState('0.00');
  const [wallOffsetInput, setWallOffsetInput] = useState('0.00');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const vertexXInputRef = useRef<HTMLInputElement | null>(null);
  const wallOffsetInputRef = useRef<HTMLInputElement | null>(null);
  const lengthInputRef = useRef(lengthInput);
  const replaceOnNextDigitRef = useRef(true);
  const hints = resolveHints({
    activeTool,
    document,
    draftWall,
    vertexDrag,
    wallDrag,
    selection,
    wallTool,
  });

  useEffect(() => {
    if (!wallDraftNumericEntryActive) {
      return;
    }

    const formattedLength = currentLength.toFixed(2);
    lengthInputRef.current = formattedLength;
    replaceOnNextDigitRef.current = true;
    setLengthInput(formattedLength);
  }, [currentLength, wallDraftNumericEntryActive]);

  useEffect(() => {
    if (!wallDraftNumericEntryActive) {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [wallDraftNumericEntryActive]);

  useEffect(() => {
    if (!vertexDragNumericEntryActive || !vertexDrag) {
      return;
    }

    setVertexXInput(vertexDrag.currentPosition[0].toFixed(2));
    setVertexYInput(vertexDrag.currentPosition[1].toFixed(2));
  }, [vertexDrag, vertexDragNumericEntryActive]);

  useEffect(() => {
    if (!vertexDragNumericEntryActive) {
      return;
    }

    vertexXInputRef.current?.focus();
    vertexXInputRef.current?.select();
  }, [vertexDragNumericEntryActive]);

  useEffect(() => {
    if (!wallDragNumericEntryActive || !wallDrag) {
      return;
    }

    setWallOffsetInput(getWallDragNormalOffset(wallDrag).toFixed(2));
  }, [wallDrag, wallDragNumericEntryActive]);

  useEffect(() => {
    if (!wallDragNumericEntryActive) {
      return;
    }

    wallOffsetInputRef.current?.focus();
    wallOffsetInputRef.current?.select();
  }, [wallDragNumericEntryActive]);

  const submitNumericLength = (value: string) => {
    if (!draftWall) {
      return;
    }

    const length = Number.parseFloat(value);
    const targetPoint = resolveWallNumericEntryPoint({
      startPoint: draftWall.startPoint,
      currentPoint: draftWall.currentPoint,
      length,
    });

    if (!targetPoint) {
      return;
    }

    replaceDocument(reduceArchitectureCommand(document, {
      type: 'DRAW_WALL',
      start: draftWall.startPoint,
      end: targetPoint,
    }));
    setWallClosurePreview(null);
    setWallNumericEntryEnabled(false);
    commitDraftWall();
  };

  const updateNumericLengthInput = (value: string) => {
    lengthInputRef.current = value;
    setLengthInput(value);
  };

  const submitVertexDragNumeric = () => {
    if (!vertexDrag) {
      return;
    }

    const x = Number.parseFloat(vertexXInput);
    const y = Number.parseFloat(vertexYInput);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    applyArchitectureInteractionCommands(
      getVertexDragCommitEffects({
        document,
        vertexId: vertexDrag.vertexId,
        targetPosition: [x, y],
      }),
      {
        replaceDocument,
        commitVertexDrag,
        setSelection,
      },
    );
  };

  const submitWallDragNumeric = () => {
    if (!wallDrag) {
      return;
    }

    const offset = Number.parseFloat(wallOffsetInput);
    const normal = getWallDragNormal(wallDrag);
    if (!Number.isFinite(offset) || !normal) {
      return;
    }

    applyArchitectureInteractionCommands(
      getWallDragCommitEffects({
        document,
        wallDrag: {
          ...wallDrag,
          currentOffset: [
            normal[0] * offset,
            normal[1] * offset,
          ],
        },
      }),
      {
        replaceDocument,
        commitWallDrag,
        setSelection,
      },
    );
  };

  useEffect(() => {
    if (!wallDraftNumericEntryActive) {
      return undefined;
    }

    const handleNumericKeyDown = (event: KeyboardEvent) => {
      const isDigit = /^\d$/.test(event.key);
      const isDecimal = event.key === '.';
      const isControlKey = event.key === 'Backspace' || event.key === 'Enter' || event.key === 'Escape';

      if (!isDigit && !isDecimal && !isControlKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (isDigit) {
        const nextValue = replaceOnNextDigitRef.current
          ? event.key
          : `${lengthInputRef.current}${event.key}`;
        replaceOnNextDigitRef.current = false;
        updateNumericLengthInput(nextValue);
        return;
      }

      if (isDecimal) {
        const nextValue = replaceOnNextDigitRef.current
          ? '0.'
          : lengthInputRef.current.includes('.')
            ? lengthInputRef.current
            : `${lengthInputRef.current}.`;
        replaceOnNextDigitRef.current = false;
        updateNumericLengthInput(nextValue);
        return;
      }

      if (event.key === 'Backspace') {
        replaceOnNextDigitRef.current = false;
        updateNumericLengthInput(lengthInputRef.current.slice(0, -1));
        return;
      }

      if (event.key === 'Escape') {
        setWallNumericEntryEnabled(false);
        return;
      }

      submitNumericLength(lengthInputRef.current);
    };

    window.addEventListener('keydown', handleNumericKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleNumericKeyDown, true);
    };
  }, [
    wallDraftNumericEntryActive,
    draftWall,
    document,
    replaceDocument,
    setWallClosurePreview,
    setWallNumericEntryEnabled,
    commitDraftWall,
  ]);

  const handleNumericSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitNumericLength(lengthInputRef.current);
  };

  const handleVertexDragNumericSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitVertexDragNumeric();
  };

  const handleWallDragNumericSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitWallDragNumeric();
  };

  if (!hints.length) {
    return null;
  }

  return (
    <div
      data-testid="editor-status-hud"
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
      {vertexDragNumericEntryActive ? (
        <form
          onSubmit={handleVertexDragNumericSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          <span>X</span>
          <input
            ref={vertexXInputRef}
            data-testid="vertex-drag-x-input"
            type="number"
            step="0.01"
            value={vertexXInput}
            onChange={(event) => setVertexXInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setVertexDragNumericEntryEnabled(false);
              }
              event.stopPropagation();
            }}
            style={numericInputStyle}
          />
          <span>Y</span>
          <input
            data-testid="vertex-drag-y-input"
            type="number"
            step="0.01"
            value={vertexYInput}
            onChange={(event) => setVertexYInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setVertexDragNumericEntryEnabled(false);
              }
              event.stopPropagation();
            }}
            style={numericInputStyle}
          />
          <span>m</span>
        </form>
      ) : null}
      {wallDragNumericEntryActive ? (
        <form
          onSubmit={handleWallDragNumericSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          <span>偏移</span>
          <input
            ref={wallOffsetInputRef}
            data-testid="wall-drag-offset-input"
            type="number"
            step="0.01"
            value={wallOffsetInput}
            onChange={(event) => setWallOffsetInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setWallDragNumericEntryEnabled(false);
              }
              event.stopPropagation();
            }}
            style={numericInputStyle}
          />
          <span>m</span>
        </form>
      ) : null}
      {wallDraftNumericEntryActive ? (
        <form
          onSubmit={handleNumericSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          <span>长度</span>
          <input
            ref={inputRef}
            data-testid="wall-length-input"
            type="number"
            min="0.01"
            step="0.01"
            value={lengthInput}
            onChange={(event) => updateNumericLengthInput(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
            style={numericInputStyle}
          />
          <span>m</span>
        </form>
      ) : null}
      {hints.map((hint) => (
        <div key={hint}>{hint}</div>
      ))}
    </div>
  );
}

function resolveHints({
  activeTool,
  document,
  draftWall,
  vertexDrag,
  wallDrag,
  selection,
  wallTool,
}: {
  activeTool: ReturnType<typeof useArchitectureEditorStore.getState>['activeTool'];
  document: ReturnType<typeof useArchitectureDocumentStore.getState>['document'];
  draftWall: ReturnType<typeof useArchitectureEditorStore.getState>['draftWall'];
  vertexDrag: ReturnType<typeof useArchitectureEditorStore.getState>['vertexDrag'];
  wallDrag: ReturnType<typeof useArchitectureEditorStore.getState>['wallDrag'];
  selection: ReturnType<typeof useArchitectureEditorStore.getState>['selection'];
  wallTool: ReturnType<typeof useArchitectureEditorStore.getState>['toolState']['wall'];
}) {
  if (vertexDrag) {
    if (vertexDrag.numericEntryEnabled) {
      return ['顶点精确输入 · Enter 确认 · Esc 取消'];
    }

    return [
      '拖动中 · 释放放置 · Tab 输入坐标 · Esc 取消',
      vertexDrag.snappedToVertexId ? '吸附到端点' : null,
    ].filter((hint): hint is string => Boolean(hint));
  }

  if (wallDrag) {
    return [
      wallDrag.numericEntryEnabled
        ? '墙体精确偏移 · Enter 确认 · Esc 取消'
        : '墙体拖动中 · 释放放置 · Tab 输入偏移 · Esc 取消',
    ];
  }

  if (activeTool === 'wall' && draftWall) {
    const wallBodySnap = findNearestWallBodySnapCandidate(document, draftWall.currentPoint, 1e-6);
    const draftLength = distanceBetweenPoints(draftWall.startPoint, draftWall.currentPoint);

    return [
      `长度 ${draftLength.toFixed(2)} m`,
      wallTool.constraints.numericEntryEnabled ? '输入长度后按 Enter' : null,
      '按墙中线绘制',
      wallBodySnap ? '吸附到墙线' : null,
      wallTool.modifiers.shiftKey ? '正交锁定' : null,
      wallTool.constraints.closureCandidateVertexId ? '释放以闭合' : null,
      '按 Tab 输入长度',
      'Esc 取消',
    ].filter((hint): hint is string => Boolean(hint));
  }

  if (activeTool === 'select') {
    if (selection.wallIds.length) {
      return ['拖动端点修改墙体 · Del 删除 · Esc 取消选择'];
    }

    if (selection.zoneIds.length) {
      return ['已选中区域 · Del 删除 · Esc 取消选择'];
    }

    return ['点击墙体或区域选中'];
  }

  if (activeTool === 'delete') {
    return ['点击墙体删除'];
  }

  return [];
}

function getWallDragNormal(wallDrag: WallDragState): Point2 | null {
  const dx = wallDrag.endVertexOrigin[0] - wallDrag.startVertexOrigin[0];
  const dy = wallDrag.endVertexOrigin[1] - wallDrag.startVertexOrigin[1];
  const length = Math.hypot(dx, dy);

  if (length <= 1e-9) {
    return null;
  }

  return [-dy / length, dx / length];
}

function getWallDragNormalOffset(wallDrag: WallDragState): number {
  const normal = getWallDragNormal(wallDrag);
  if (!normal) {
    return 0;
  }

  return wallDrag.currentOffset[0] * normal[0] + wallDrag.currentOffset[1] * normal[1];
}
