import { Save, Settings } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { saveState } from '../../services/persistence.js';
import { saveArchitectureDocument } from '../../hooks/useArchitecturePersistence.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { editorTheme } from '../../theme/editorTheme.js';

interface Props {
  architectureModeEnabled?: boolean;
}

export default function TopActions({ architectureModeEnabled = false }: Props) {
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
        onClick={handleSave}
        className="flex items-center justify-center transition-opacity hover:opacity-100"
        style={btnStyle}
      >
        <Save size={18} />
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
