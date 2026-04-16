import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../useStore';

describe('uiSlice', () => {
  beforeEach(() => { useStore.setState(useStore.getInitialState()); });

  it('default activeTab is building', () => {
    expect(useStore.getState().activeTab).toBe('building');
  });
  it('setActiveTab switches tab', () => {
    useStore.getState().setActiveTab('furniture');
    expect(useStore.getState().activeTab).toBe('furniture');
  });
  it('setTransformTool changes tool', () => {
    useStore.getState().setTransformTool('rotate');
    expect(useStore.getState().transformTool).toBe('rotate');
  });
});
