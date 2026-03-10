import { Save, Settings } from 'lucide-react';
import { useStore } from '../../store/useStore.js';
import { saveState } from '../../services/persistence.js';

export default function TopActions() {
  const handleSave = async () => {
    const { rooms, items } = useStore.getState();
    await saveState({ rooms, items });
  };

  const btnStyle = {
    width: 40,
    height: 40,
    background: 'rgba(19,61,47,0.85)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(248,245,240,0.06)',
    borderRadius: 8,
    color: '#9AB0A6',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2">
      <button
        type="button"
        onClick={handleSave}
        className="flex items-center justify-center transition-colors hover:text-[#F8F5F0]"
        style={btnStyle}
      >
        <Save size={18} />
      </button>
      <button
        type="button"
        className="flex items-center justify-center transition-colors hover:text-[#F8F5F0]"
        style={btnStyle}
      >
        <Settings size={18} />
      </button>
    </div>
  );
}
