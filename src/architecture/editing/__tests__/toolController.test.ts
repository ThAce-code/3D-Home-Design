import { describe, expect, it, vi } from 'vitest';
import { createArchitectureToolStoreController } from '../toolController';

describe('architecture tool controller', () => {
  it('reads the latest tool setter when selecting a tool', () => {
    const firstSetActiveTool = vi.fn();
    const latestSetActiveTool = vi.fn();
    let editorState = {
      activeTool: 'select' as const,
      setActiveTool: firstSetActiveTool,
    };

    const controller = createArchitectureToolStoreController({
      editorStore: {
        getState: () => editorState,
      },
    });

    editorState = {
      activeTool: 'wall',
      setActiveTool: latestSetActiveTool,
    };

    controller.selectTool('delete');

    expect(firstSetActiveTool).not.toHaveBeenCalled();
    expect(latestSetActiveTool).toHaveBeenCalledTimes(1);
    expect(latestSetActiveTool).toHaveBeenCalledWith('delete');
  });
});
