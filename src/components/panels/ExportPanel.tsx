import { useState } from 'react';
import { Download, ImageDown } from 'lucide-react';
import { exportScenePng } from '../../services/screenshotExport.js';
import { editorThemeVars } from '../../theme/editorTheme.js';

export default function ExportPanel() {
  const [message, setMessage] = useState<string | null>(null);

  const handleExportPng = () => {
    const ok = exportScenePng('architecture-plan');
    setMessage(ok ? '已导出 PNG 截图' : '未找到可导出的画布');
  };

  return (
    <div data-testid="export-panel" className="p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold" style={{ color: editorThemeVars.text }}>导出</h3>
        <p className="text-xs leading-5" style={{ color: editorThemeVars.textMuted }}>
          导出当前场景视图为 PNG 图片。
        </p>
      </div>

      <button
        type="button"
        aria-label="导出 PNG"
        onClick={handleExportPng}
        className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm transition-opacity hover:opacity-90"
        style={{
          background: editorThemeVars.accentSoft,
          color: editorThemeVars.accentStrong,
          border: `1px solid ${editorThemeVars.border}`,
        }}
      >
        <ImageDown size={16} />
        导出 PNG
      </button>

      <div
        className="rounded-lg px-3 py-2 text-xs leading-5"
        style={{
          background: editorThemeVars.field,
          border: `1px solid ${editorThemeVars.fieldBorder}`,
          color: editorThemeVars.textMuted,
        }}
      >
        <div className="flex items-center gap-2 mb-1" style={{ color: editorThemeVars.text }}>
          <Download size={14} />
          平面图截图
        </div>
        使用 WebGL 画布直出，适合快速分享当前编辑视角。矢量平面图导出后续版本提供。
      </div>

      {message ? (
        <p className="text-xs" style={{ color: editorThemeVars.textMuted }} data-testid="export-panel-message">
          {message}
        </p>
      ) : null}
    </div>
  );
}
