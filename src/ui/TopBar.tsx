import React from 'react';

interface TopBarProps {
  gold: number;
  discoveredCount: number;
  totalPotions: number;
  elapsedSeconds: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  gold,
  discoveredCount,
  totalPotions,
  elapsedSeconds,
}) => {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = Math.floor(elapsedSeconds % 60);
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="topbar">
      <div className="gold">
        <span>✨</span> {Math.floor(gold)} gold
      </div>
      <h1>ALCHEMIST</h1>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div className="grimoire-progress">
          📖 {discoveredCount}/{totalPotions}
        </div>
        <div className="session-info">{timeString}</div>
      </div>
    </div>
  );
};
