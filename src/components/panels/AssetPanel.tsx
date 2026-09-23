import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore.js';
import { Upload, X, Armchair, Loader2 } from 'lucide-react';
import { editorThemeVars } from '../../theme/editorTheme.js';

export default function AssetPanel() {
  const assets = useStore((s) => s.assets);
  const selectedAssetId = useStore((s) => s.selectedAssetId);
  const selectAsset = useStore((s) => s.selectAsset);
  const removeAsset = useStore((s) => s.removeAsset);
  const uploadAsset = useStore((s) => s.uploadAsset);
  const uploadStatus = useStore((s) => s.uploadStatus);
  const assetsLoading = useStore((s) => s.assetsLoading);
  const categories = useStore((s) => s.categories);
  const loadCategories = useStore((s) => s.loadCategories);
  const loadAssets = useStore((s) => s.loadAssets);

  const fileRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Load categories and assets on mount
  useEffect(() => {
    loadCategories();
    loadAssets();
  }, [loadCategories, loadAssets]);

  const handleCategoryClick = (slug: string | null) => {
    setActiveCategory(slug);
    if (slug) {
      loadAssets(slug);
    } else {
      loadAssets();
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.glb$/i, '');
    await uploadAsset(file, name, 'other');
    if (fileRef.current) fileRef.current.value = '';
  };

  const isUploading = uploadStatus === 'uploading';

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: editorThemeVars.text }}>家具库</h3>
      </div>

      {/* Category tabs */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${editorThemeVars.border} transparent` }}
      >
        <button
          type="button"
          onClick={() => handleCategoryClick(null)}
          className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
          style={{
            background: activeCategory === null ? editorThemeVars.accentSoft : editorThemeVars.field,
            border: `1px solid ${activeCategory === null ? editorThemeVars.border : editorThemeVars.fieldBorder}`,
            color: activeCategory === null ? editorThemeVars.accentStrong : editorThemeVars.textMuted,
          }}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            type="button"
            onClick={() => handleCategoryClick(cat.slug)}
            className="shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: activeCategory === cat.slug ? editorThemeVars.accentSoft : editorThemeVars.field,
              border: `1px solid ${activeCategory === cat.slug ? editorThemeVars.border : editorThemeVars.fieldBorder}`,
              color: activeCategory === cat.slug ? editorThemeVars.accentStrong : editorThemeVars.textMuted,
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Upload */}
      <button
        type="button"
        onClick={() => !isUploading && fileRef.current?.click()}
        disabled={isUploading}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: isUploading ? editorThemeVars.field : editorThemeVars.accentSoft,
          border: `1px solid ${editorThemeVars.border}`,
          color: editorThemeVars.accentStrong,
          opacity: isUploading ? 0.6 : 1,
          cursor: isUploading ? 'not-allowed' : 'pointer',
        }}
      >
        {isUploading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            上传中...
          </>
        ) : (
          <>
            <Upload size={16} />
            上传 GLB
          </>
        )}
      </button>
      <input ref={fileRef} type="file" accept=".glb" className="hidden" onChange={handleUpload} />

      {/* Upload error */}
      {uploadStatus === 'error' && (
        <p className="text-xs px-1" style={{ color: editorThemeVars.danger }}>
          上传失败，请重试
        </p>
      )}

      {/* Loading state */}
      {assetsLoading && assets.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin" style={{ color: editorThemeVars.textMuted, opacity: 0.35 }} />
        </div>
      )}

      {/* Asset grid */}
      <div className="grid grid-cols-2 gap-2">
        {assets.map((a) => {
          const isSelected = selectedAssetId === a.id;
          return (
            <div
              key={a.id}
              className="relative aspect-square rounded-lg transition-all group"
              style={{
                background: isSelected ? editorThemeVars.accentSoft : editorThemeVars.field,
                border: `1px solid ${isSelected ? editorThemeVars.border : editorThemeVars.fieldBorder}`,
                boxShadow: isSelected ? '0 12px 24px -20px rgba(82, 56, 33, 0.35)' : 'none',
              }}
            >
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectAsset(selectedAssetId === a.id ? null : a.id)}
                className="absolute inset-0 rounded-lg cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  ['--tw-ring-color' as string]: editorThemeVars.accent,
                  ['--tw-ring-offset-color' as string]: editorThemeVars.surfaceStrong,
                }}
              >
                {/* Thumbnail or fallback icon */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg">
                  {a.thumbUrl ? (
                    <img
                      src={a.thumbUrl}
                      alt={a.name}
                      className="w-full h-full object-contain p-1.5"
                      draggable={false}
                    />
                  ) : (
                    <Armchair
                      size={32}
                      className="transition-colors"
                      style={{
                        color: isSelected ? editorThemeVars.textMuted : editorThemeVars.textMuted,
                        opacity: isSelected ? 0.85 : 0.35,
                      }}
                    />
                  )}
                </div>

                {/* Name label */}
                <span
                  className="absolute bottom-1.5 left-2 right-2 text-[10px] truncate transition-colors"
                  style={{ color: isSelected ? editorThemeVars.text : editorThemeVars.textMuted }}
                >
                  {a.name}
                </span>
              </button>

              {/* Delete button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeAsset(a.id); }}
                className="absolute z-10 top-1.5 right-1.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: editorThemeVars.danger, background: 'transparent' }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {!assetsLoading && assets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Armchair size={36} style={{ color: editorThemeVars.textMuted, opacity: 0.2 }} />
          <p className="text-xs" style={{ color: editorThemeVars.textMuted, opacity: 0.55 }}>
            点击上方按钮上传家具模型
          </p>
        </div>
      )}
    </div>
  );
}
