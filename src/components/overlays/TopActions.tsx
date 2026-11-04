import { Eye, Redo2, Save, Settings, Undo2 } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { saveState } from '../../services/persistence.js';
import { saveArchitectureDocument } from '../../hooks/useArchitecturePersistence.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { editorTheme } from '../../theme/editorTheme.js';
import { enterSceneNavigation } from '../../services/navigation.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { architectureHistoryActions } from '../../services/architectureHistory.js';

interface Props {
  architectureModeEnabled?: boolean;
}

export default function TopActions({ architectureModeEnabled = false }: Props) {
  const canUndo = useArchitectureDocumentStore((state) => state.pastDocuments.length > 0);
  const canRedo = useArchitectureDocumentStore((state) => state.futureDocuments.length > 0);
  const hasPreview = useArchitectureEditorStore((state) => Boolean(state.draftWall || state.vertexDrag || state.wallDrag));
  const handleSave = async () => {
    if (architectureModeEnabled) {
      const { document } = useArchitectureDocumentStore.getState();
      await saveArchitectureDocument(document);
      return;
    }

    const { items } = useStore.getState();
    await saveState({ items });
  };

  const btnStyle = {
    width: 40,
    height: 40,
    background: editorTheme.surface,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${editorTheme.border}`,
    borderRadius: 8,
    color: editorTheme.textMuted,
    boxShadow: '0 18px 40px -28px rgba(82, 56, 33, 0.45)',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <button
        type="button"
        aria-label="保存设计"
        onClick={handleSave}
        className="flex items-center justify-center transition-opacity hover:opacity-100"
        style={btnStyle}
      >
        <Save size={18} />
      </button>
      {architectureModeEnabled ? (
        <>
          <button
            type="button"
            aria-label="撤销"
            title="撤销 (Ctrl+Z)"
            disabled={!canUndo && !hasPreview}
            onClick={() => architectureHistoryActions.perform('undo')}
            style={{ ...btnStyle, opacity: canUndo || hasPreview ? 1 : 0.35 }}
            className="flex items-center justify-center disabled:cursor-not-allowed"
          >
            <Undo2 size={18} />
          </button>
          <button
            type="button"
            aria-label="重做"
            title="重做 (Ctrl+Shift+Z / Ctrl+Y)"
            disabled={!canRedo && !hasPreview}
            onClick={() => architectureHistoryActions.perform('redo')}
            style={{ ...btnStyle, opacity: canRedo || hasPreview ? 1 : 0.35 }}
            className="flex items-center justify-center disabled:cursor-not-allowed"
          >
            <Redo2 size={18} />
          </button>
        </>
      ) : null}
      <button
        type="button"
        onClick={() => { void enterSceneNavigation(); }}
        aria-label="浏览场景"
        title="浏览场景"
        className="flex items-center justify-center transition-opacity hover:opacity-100"
        style={btnStyle}
      >
        <Eye size={18} />
      </button>
      <button
        type="button"
        className="flex items-center justify-center transition-opacity hover:opacity-100"
        style={btnStyle}
      >
        <Settings size={18} />
      </button>
    </div>
  );
}
