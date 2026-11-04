import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureScenePng, downloadDataUrl, exportScenePng } from '../screenshotExport';

describe('screenshotExport', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('captures png data from the scene canvas', () => {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('data-testid', 'ignored');
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-testid', 'scene-canvas');
    const glCanvas = document.createElement('canvas');
    vi.spyOn(glCanvas, 'toDataURL').mockReturnValue('data:image/png;base64,abc');
    wrapper.appendChild(glCanvas);
    document.body.appendChild(wrapper);
    document.body.appendChild(canvas);

    expect(captureScenePng('plan')).toMatchObject({
      dataUrl: 'data:image/png;base64,abc',
      filename: expect.stringMatching(/^plan-.+\.png$/),
    });
  });

  it('downloads a data url via an anchor click', () => {
    const click = vi.fn();
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = createElement(tagName);
      if (tagName === 'a') {
        element.click = click;
      }
      return element;
    });

    downloadDataUrl('data:image/png;base64,abc', 'shot.png');
    expect(click).toHaveBeenCalled();
  });

  it('returns false when no canvas exists', () => {
    expect(exportScenePng()).toBe(false);
  });
});
