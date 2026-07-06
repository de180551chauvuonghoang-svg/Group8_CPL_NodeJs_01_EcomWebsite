import React, { useRef, useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

const BUBBLE_SIZE = 68;
const ICON_SIZE = 32;

interface ChatBubbleLauncherProps {
  onOpen: () => void;
}

export default function ChatBubbleLauncher({ onOpen }: ChatBubbleLauncherProps) {
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('ecom_chat_bubble_pos');
      if (saved) return JSON.parse(saved) as { x: number; y: number };
    } catch { /* ignore */ }
    return { x: 0, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0, moved: false });

  useEffect(() => {
    localStorage.setItem('ecom_chat_bubble_pos', JSON.stringify(position));
  }, [position]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
      moved: false
    };
    e.currentTarget.setPointerCapture(e.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragRef.current.moved = true;
        setIsDragging(true);
      }
      setPosition({ x: dragRef.current.posX + dx, y: dragRef.current.posY + dy });
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      setTimeout(() => setIsDragging(false), 0);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onClick={() => {
        if (!dragRef.current.moved && !isDragging) onOpen();
      }}
      className="gradient-btn"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 30px rgba(139, 92, 246, 0.5)',
        cursor: isDragging ? 'grabbing' : 'grab',
        border: 'none',
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: 'none',
        userSelect: 'none',
        animation: 'pulse-ring 2.5s ease-out infinite'
      }}
      aria-label="Mở chat hỗ trợ"
    >
      <MessageSquare size={ICON_SIZE} style={{ color: '#fff', pointerEvents: 'none' }} />
    </button>
  );
}
