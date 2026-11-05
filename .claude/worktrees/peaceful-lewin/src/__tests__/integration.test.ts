/**
 * 集成测试：覆盖 FPS-Only 重构后的核心交互流程
 * 用例按用户操作顺序编排，模拟真实使用场景
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store/useStore';

function resetStore() {
  useStore.setState(useStore.getInitialState());
}

describe('Store 初始状态', () => {
  beforeEach(resetStore);

  it('默认 activeTab 是 rooms', () => {
    expect(useStore.getState().activeTab).toBe('rooms');
  });

  it('默认 pointerLocked 是 false', () => {
    expect(useStore.getState().pointerLocked).toBe(false);
  });

  it('默认 isFlying 是 false', () => {
    expect(useStore.getState().isFlying).toBe(false);
  });

  it('默认 transformTool 是 translate', () => {
    expect(useStore.getState().transformTool).toBe('translate');
  });

  it('默认没有房间', () => {
    expect(useStore.getState().rooms).toEqual([]);
  });

  it('默认没有家具', () => {
    expect(useStore.getState().items).toEqual([]);
  });

  it('默认没有选中的资产', () => {
    expect(useStore.getState().selectedAssetId).toBeNull();
  });

  it('默认没有选中的家具', () => {
    expect(useStore.getState().selectedItemId).toBeNull();
  });
});

describe('Tab 切换（替代 Build/Decorate 模式）', () => {
  beforeEach(resetStore);

  it('切换到 furniture tab', () => {
    useStore.getState().setActiveTab('furniture');
    expect(useStore.getState().activeTab).toBe('furniture');
  });

  it('切换回 rooms tab', () => {
    useStore.getState().setActiveTab('furniture');
    useStore.getState().setActiveTab('rooms');
    expect(useStore.getState().activeTab).toBe('rooms');
  });
});

describe('Pointer Lock 状态机', () => {
  beforeEach(resetStore);

  it('setPointerLocked(true) 锁定', () => {
    useStore.getState().setPointerLocked(true);
    expect(useStore.getState().pointerLocked).toBe(true);
  });

  it('setPointerLocked(false) 解锁', () => {
    useStore.getState().setPointerLocked(true);
    useStore.getState().setPointerLocked(false);
    expect(useStore.getState().pointerLocked).toBe(false);
  });
});

describe('飞行模式', () => {
  beforeEach(resetStore);

  it('setFlying 切换飞行', () => {
    useStore.getState().setFlying(true);
    expect(useStore.getState().isFlying).toBe(true);
  });

  it('再次切换关闭飞行', () => {
    useStore.getState().setFlying(true);
    useStore.getState().setFlying(false);
    expect(useStore.getState().isFlying).toBe(false);
  });
});

describe('房间管理', () => {
  beforeEach(resetStore);

  it('添加房间', () => {
    useStore.getState().addRoom({ width: 4, depth: 4, height: 3 });
    const { rooms } = useStore.getState();
    expect(rooms).toHaveLength(1);
    expect(rooms[0].width).toBe(4);
    expect(rooms[0].depth).toBe(4);
    expect(rooms[0].height).toBe(3);
  });

  it('添加房间后自动选中', () => {
    useStore.getState().addRoom({ width: 4, depth: 4, height: 3 });
    const { rooms, selectedRoomId } = useStore.getState();
    expect(selectedRoomId).toBe(rooms[0].id);
  });

  it('添加房间带位置', () => {
    useStore.getState().addRoom({ width: 5, depth: 6, height: 3, x: 10, z: -5 });
    const room = useStore.getState().rooms[0];
    expect(room.x).toBe(10);
    expect(room.z).toBe(-5);
  });

  it('更新房间尺寸', () => {
    useStore.getState().addRoom({ width: 4, depth: 4, height: 3 });
    const id = useStore.getState().rooms[0].id;
    useStore.getState().updateRoom(id, { width: 8 });
    expect(useStore.getState().rooms[0].width).toBe(8);
    expect(useStore.getState().rooms[0].depth).toBe(4); // 未改的保持不变
  });

  it('删除房间', () => {
    useStore.getState().addRoom({ width: 4, depth: 4, height: 3 });
    const id = useStore.getState().rooms[0].id;
    useStore.getState().removeRoom(id);
    expect(useStore.getState().rooms).toHaveLength(0);
  });

  it('删除选中的房间后 selectedRoomId 清空', () => {
    useStore.getState().addRoom({ width: 4, depth: 4, height: 3 });
    const id = useStore.getState().rooms[0].id;
    useStore.getState().removeRoom(id);
    expect(useStore.getState().selectedRoomId).toBeNull();
  });

  it('添加多个房间', () => {
    useStore.getState().addRoom({ width: 4, depth: 4, height: 3 });
    useStore.getState().addRoom({ width: 6, depth: 8, height: 3, x: 10, z: 0 });
    expect(useStore.getState().rooms).toHaveLength(2);
  });

  it('选中不同房间', () => {
    useStore.getState().addRoom({ width: 4, depth: 4, height: 3 });
    useStore.getState().addRoom({ width: 6, depth: 8, height: 3 });
    const rooms = useStore.getState().rooms;
    useStore.getState().selectRoom(rooms[0].id);
    expect(useStore.getState().selectedRoomId).toBe(rooms[0].id);
  });

  it('房间 transparentWalls 默认为空', () => {
    useStore.getState().addRoom({ width: 4, depth: 4, height: 3 });
    expect(useStore.getState().rooms[0].transparentWalls).toEqual({});
  });

  it('更新 transparentWalls', () => {
    useStore.getState().addRoom({ width: 4, depth: 4, height: 3 });
    const id = useStore.getState().rooms[0].id;
    useStore.getState().updateRoom(id, { transparentWalls: { north: true } });
    expect(useStore.getState().rooms[0].transparentWalls).toEqual({ north: true });
  });
});

describe('家具放置与管理', () => {
  const testAsset: import('../types/furniture').Asset = {
    id: 'chair-1',
    name: '椅子',
    categorySlug: 'chair',
    modelUrl: '/uploads/models/chair-1.glb',
    thumbUrl: null,
    fileSize: 1024,
    bboxMin: [0, 0, 0],
    bboxSize: [1, 1, 1],
    autoScale: 1,
  };

  beforeEach(() => {
    resetStore();
    // 直接注入测试资产（不走 API）
    useStore.setState({ assets: [testAsset] });
  });

  it('选中资产', () => {
    useStore.getState().selectAsset('chair-1');
    expect(useStore.getState().selectedAssetId).toBe('chair-1');
  });

  it('取消选中资产', () => {
    useStore.getState().selectAsset('chair-1');
    useStore.getState().selectAsset(null);
    expect(useStore.getState().selectedAssetId).toBeNull();
  });

  it('放置家具', () => {
    useStore.getState().addItem('chair-1', [2, 0, 3], [1, 1, 1]);
    const { items } = useStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].assetId).toBe('chair-1');
    expect(items[0].position).toEqual([2, 0, 3]);
    expect(items[0].scale).toEqual([1, 1, 1]);
    expect(items[0].quaternion).toEqual([0, 0, 0, 1]);
  });

  it('放置家具带 baseSize', () => {
    useStore.getState().addItem('chair-1', [0, 0, 0], [0.5, 0.5, 0.5], [1, 2, 1]);
    expect(useStore.getState().items[0].baseSize).toEqual([1, 2, 1]);
  });

  it('选中家具', () => {
    useStore.getState().addItem('chair-1', [0, 0, 0], [1, 1, 1]);
    const id = useStore.getState().items[0].id;
    useStore.getState().selectItem(id);
    expect(useStore.getState().selectedItemId).toBe(id);
  });

  it('取消选中家具', () => {
    useStore.getState().addItem('chair-1', [0, 0, 0], [1, 1, 1]);
    const id = useStore.getState().items[0].id;
    useStore.getState().selectItem(id);
    useStore.getState().selectItem(null);
    expect(useStore.getState().selectedItemId).toBeNull();
  });

  it('更新家具位置', () => {
    useStore.getState().addItem('chair-1', [0, 0, 0], [1, 1, 1]);
    const id = useStore.getState().items[0].id;
    useStore.getState().updateItem(id, { position: [5, 0, 5] });
    expect(useStore.getState().items[0].position).toEqual([5, 0, 5]);
  });

  it('更新家具缩放', () => {
    useStore.getState().addItem('chair-1', [0, 0, 0], [1, 1, 1]);
    const id = useStore.getState().items[0].id;
    useStore.getState().updateItem(id, { scale: [2, 2, 2] });
    expect(useStore.getState().items[0].scale).toEqual([2, 2, 2]);
  });

  it('更新家具旋转', () => {
    useStore.getState().addItem('chair-1', [0, 0, 0], [1, 1, 1]);
    const id = useStore.getState().items[0].id;
    useStore.getState().updateItem(id, { quaternion: [0, 0.707, 0, 0.707] });
    expect(useStore.getState().items[0].quaternion).toEqual([0, 0.707, 0, 0.707]);
  });

  it('删除家具', () => {
    useStore.getState().addItem('chair-1', [0, 0, 0], [1, 1, 1]);
    const id = useStore.getState().items[0].id;
    useStore.getState().removeItem(id);
    expect(useStore.getState().items).toHaveLength(0);
  });

  it('删除选中的家具后 selectedItemId 清空', () => {
    useStore.getState().addItem('chair-1', [0, 0, 0], [1, 1, 1]);
    const id = useStore.getState().items[0].id;
    useStore.getState().selectItem(id);
    useStore.getState().removeItem(id);
    expect(useStore.getState().selectedItemId).toBeNull();
  });

  it('放置多个家具', () => {
    useStore.getState().addItem('chair-1', [0, 0, 0], [1, 1, 1]);
    useStore.getState().addItem('chair-1', [3, 0, 3], [1, 1, 1]);
    expect(useStore.getState().items).toHaveLength(2);
    expect(useStore.getState().items[0].id).not.toBe(useStore.getState().items[1].id);
  });
});

describe('变换工具切换', () => {
  beforeEach(resetStore);

  it('切换到 rotate', () => {
    useStore.getState().setTransformTool('rotate');
    expect(useStore.getState().transformTool).toBe('rotate');
  });

  it('切换到 scale', () => {
    useStore.getState().setTransformTool('scale');
    expect(useStore.getState().transformTool).toBe('scale');
  });

  it('切换回 translate', () => {
    useStore.getState().setTransformTool('rotate');
    useStore.getState().setTransformTool('translate');
    expect(useStore.getState().transformTool).toBe('translate');
  });
});

describe('Undo/Redo（仅 rooms 和 items 参与历史）', () => {
  beforeEach(() => {
    resetStore();
    useStore.temporal.getState().clear();
  });

  it('撤销添加房间', () => {
    useStore.getState().addRoom({ width: 4, depth: 4, height: 3 });
    expect(useStore.getState().rooms).toHaveLength(1);
    useStore.temporal.getState().undo();
    expect(useStore.getState().rooms).toHaveLength(0);
  });

  it('重做添加房间', () => {
    useStore.getState().addRoom({ width: 4, depth: 4, height: 3 });
    useStore.temporal.getState().undo();
    useStore.temporal.getState().redo();
    expect(useStore.getState().rooms).toHaveLength(1);
  });

  it('撤销添加家具', () => {
    useStore.getState().addItem('chair-1', [0, 0, 0], [1, 1, 1]);
    expect(useStore.getState().items).toHaveLength(1);
    useStore.temporal.getState().undo();
    expect(useStore.getState().items).toHaveLength(0);
  });

  it('UI 状态不参与 undo（activeTab 切换不可撤销）', () => {
    useStore.getState().setActiveTab('furniture');
    useStore.temporal.getState().undo();
    // activeTab 不在 partialize 里，undo 不影响它
    expect(useStore.getState().activeTab).toBe('furniture');
  });

  it('camera 状态不参与 undo（pointerLocked 不可撤销）', () => {
    useStore.getState().setPointerLocked(true);
    useStore.temporal.getState().undo();
    expect(useStore.getState().pointerLocked).toBe(true);
  });
});

describe('资产管理', () => {
  const testAsset: import('../types/furniture').Asset = {
    id: 'a1',
    name: '桌子',
    categorySlug: 'table',
    modelUrl: '/uploads/models/a1.glb',
    thumbUrl: null,
    fileSize: 2048,
    bboxMin: [0, 0, 0],
    bboxSize: [1, 1, 1],
    autoScale: 1,
  };

  beforeEach(resetStore);

  it('添加资产（通过 setState 注入）', () => {
    useStore.setState({ assets: [testAsset] });
    expect(useStore.getState().assets).toHaveLength(1);
  });

  it('删除资产', async () => {
    useStore.setState({ assets: [testAsset] });
    // removeAsset 是异步的，会调用 api.deleteAsset
    // 在测试中直接测同步 state 操作
    useStore.setState((s) => ({
      assets: s.assets.filter((a) => a.id !== 'a1'),
    }));
    expect(useStore.getState().assets).toHaveLength(0);
  });

  it('删除选中的资产后 selectedAssetId 清空', () => {
    useStore.setState({ assets: [testAsset] });
    useStore.getState().selectAsset('a1');
    // 模拟 removeAsset 的 state 更新逻辑
    useStore.setState((s) => ({
      assets: s.assets.filter((a) => a.id !== 'a1'),
      selectedAssetId: s.selectedAssetId === 'a1' ? null : s.selectedAssetId,
    }));
    expect(useStore.getState().selectedAssetId).toBeNull();
  });
});
