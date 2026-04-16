import { useEffect, useState } from 'react';

interface Piece {
  id: number;
  x: number;
  color: string;
  size: number;
  duration: number;
  delay: number;
  shape: 'rect' | 'circle' | 'star';
}

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

function Star({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  );
}

export function Confetti({ count = 60, duration = 3000 }: { count?: number; duration?: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    const newPieces: Piece[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 6,
      duration: Math.random() * 1.5 + 2,
      delay: Math.random() * 1.2,
      shape: (['rect', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
    }));
    setPieces(newPieces);

    const timer = setTimeout(() => setPieces([]), duration + 2000);
    return () => clearTimeout(timer);
  }, [count, duration]);

  if (pieces.length === 0) return null;

  return (
    <div className="plm-fixed plm-inset-0 plm-z-[200] plm-pointer-events-none plm-overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="plm-absolute plm-animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: '-20px',
            '--duration': `${piece.duration}s`,
            '--delay': `${piece.delay}s`,
          } as React.CSSProperties}
        >
          {piece.shape === 'rect' && (
            <div
              style={{
                width: piece.size,
                height: piece.size * 0.6,
                backgroundColor: piece.color,
                borderRadius: 1,
              }}
            />
          )}
          {piece.shape === 'circle' && (
            <div
              style={{
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                borderRadius: '50%',
              }}
            />
          )}
          {piece.shape === 'star' && <Star size={piece.size} color={piece.color} />}
        </div>
      ))}
    </div>
  );
}
