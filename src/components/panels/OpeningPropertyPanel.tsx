import { useEffect } from 'react';
import { DoorOpen, PanelTop, Trash2 } from 'lucide-react';
import { createOpeningPropertyStoreController } from '../../architecture/editing/propertyController.js';
import type { OpeningKind } from '../../architecture/domain/opening.js';
import { useArchitectureDocumentStore } from '../../store/architectureDocumentStore.js';
import { useArchitectureEditorStore } from '../../store/architectureEditorStore.js';
import { editorThemeVars } from '../../theme/editorTheme.js';

interface Props {
  openingId: string;
}

const openingPropertyController = createOpeningPropertyStoreController({
  documentStore: useArchitectureDocumentStore,
});

const kindOptions: Array<{ value: OpeningKind; label: string; icon: typeof DoorOpen }> = [
  { value: 'door', label: '门', icon: DoorOpen },
  { value: 'window', label: '窗', icon: PanelTop },
];

export default function OpeningPropertyPanel({ openingId }: Props) {
  const document = useArchitectureDocumentStore((state) => state.document);
  const opening = document.openings[openingId];

  useEffect(() => () => {
    const store = useArchitectureDocumentStore.getState();
    if (store.historyGroup?.id.startsWith(`opening:${openingId}:`)) {
      store.endHistoryGroup();
    }
  }, [openingId]);

  if (!opening) {
    return null;
  }

  const inputStyle = {
    background: editorThemeVars.field,
    border: `1px solid ${editorThemeVars.fieldBorder}`,
    color: editorThemeVars.text,
  };
  const ActiveIcon = kindOptions.find((option) => option.value === opening.kind)?.icon ?? DoorOpen;

  return (
    <div
      data-testid="opening-property-panel"
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
      <div className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold" style={{ color: editorThemeVars.text }}>门窗</h3>
          <p className="text-xs" style={{ color: editorThemeVars.textMuted }}>
            调整开口位置与尺寸
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-xs" style={{ color: editorThemeVars.textMuted }}>
          类型
          <div className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ background: editorThemeVars.accentSoft, color: editorThemeVars.accentStrong }}
            >
              <ActiveIcon size={16} />
            </div>
            <select
              aria-label="开口类型"
              value={opening.kind}
              onChange={(event) => openingPropertyController.patchOpening(openingId, {
                kind: event.target.value as OpeningKind,
              })}
              className="flex-1 rounded-md px-2 py-1.5 text-sm outline-none"
              style={inputStyle}
            >
              {kindOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </label>

        {([
          ['位置 t', 't', opening.t, 0, 1, 0.01],
          ['宽度', 'width', opening.width, 0.2, 5, 0.01],
          ['高度', 'height', opening.height, 0.2, 5, 0.01],
          ['窗台高', 'sillHeight', opening.sillHeight, 0, 3, 0.01],
        ] as const).map(([label, key, value, min, max, step]) => (
          <label key={key} className="flex flex-col gap-1.5 text-xs" style={{ color: editorThemeVars.textMuted }}>
            {label}
            <input
              aria-label={label}
              type="number"
              min={min}
              max={max}
              step={step}
              value={Number(value.toFixed(2))}
              onFocus={() => useArchitectureDocumentStore.getState().beginHistoryGroup(`opening:${openingId}:${key}`)}
              onBlur={() => useArchitectureDocumentStore.getState().endHistoryGroup()}
              onChange={(event) => {
                const next = Number.parseFloat(event.target.value);
                if (!Number.isFinite(next)) return;
                openingPropertyController.patchOpening(openingId, { [key]: next });
              }}
              className="rounded-md px-2 py-1.5 text-sm outline-none"
              style={inputStyle}
            />
          </label>
        ))}

        <button
          type="button"
          onClick={() => {
            openingPropertyController.deleteOpening(openingId);
            useArchitectureEditorStore.getState().clearSelection();
          }}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-opacity hover:opacity-90"
          style={{ background: editorThemeVars.dangerSoft, color: editorThemeVars.danger }}
        >
          <Trash2 size={15} />
          删除开口
        </button>
      </div>
    </div>
  );
}
