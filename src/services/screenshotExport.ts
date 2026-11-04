export interface ScreenshotExportResult {
  dataUrl: string;
  filename: string;
}

function findSceneCanvas(): HTMLCanvasElement | null {
  const byTestId = document.querySelector<HTMLCanvasElement>('[data-testid="scene-canvas"] canvas');
  if (byTestId) {
    return byTestId;
  }

  return document.querySelector<HTMLCanvasElement>('canvas');
}

export function captureScenePng(filenamePrefix = 'home-design'): ScreenshotExportResult | null {
  const canvas = findSceneCanvas();
  if (!canvas) {
    return null;
  }

  const dataUrl = canvas.toDataURL('image/png');
  if (!dataUrl.startsWith('data:image/png')) {
    return null;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    dataUrl,
    filename: `${filenamePrefix}-${stamp}.png`,
  };
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function exportScenePng(filenamePrefix = 'home-design'): boolean {
  const result = captureScenePng(filenamePrefix);
  if (!result) {
    return false;
  }

  downloadDataUrl(result.dataUrl, result.filename);
  return true;
}
