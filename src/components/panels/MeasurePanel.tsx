import { editorThemeVars } from '../../theme/editorTheme.js';

export default function MeasurePanel() {
  return (
    <div className="p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold" style={{ color: editorThemeVars.text }}>测量工具</h3>
      <p className="text-xs" style={{ color: editorThemeVars.textMuted }}>即将推出</p>
    </div>
  );
}
