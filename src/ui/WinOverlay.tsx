import React from 'react';

interface WinOverlayProps {
  totalPotions: number;
  elapsedMinutes: number;
  elapsedSeconds: number;
  goldEarned: number;
  onNewSession: () => void;
}

export const WinOverlay: React.FC<WinOverlayProps> = ({
  totalPotions,
  elapsedMinutes,
  elapsedSeconds,
  goldEarned,
  onNewSession,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(8, 7, 15, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <h1
        style={{
          fontFamily: 'Cinzel',
          fontSize: '48px',
          color: '#ffd700',
          textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
          marginBottom: '32px',
          textAlign: 'center',
        }}
      >
        GRIMOIRE COMPLETE
      </h1>
      
      <div
        style={{
          background: '#13101e',
          border: '1px solid #3a2d6a',
          borderRadius: '8px',
          padding: '24px',
          minWidth: '300px',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '18px' }}>
          <span style={{ color: '#8b7ec8' }}>Potions Found:</span>
          <span style={{ color: '#d4c9a8' }}>{totalPotions}/{totalPotions}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '18px' }}>
          <span style={{ color: '#8b7ec8' }}>Time:</span>
          <span style={{ color: '#d4c9a8' }}>{elapsedMinutes}m {elapsedSeconds}s</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px' }}>
          <span style={{ color: '#8b7ec8' }}>Gold Earned:</span>
          <span style={{ color: '#ffd700' }}>{goldEarned}</span>
        </div>
      </div>

      <button
        onClick={onNewSession}
        style={{
          background: 'linear-gradient(135deg, #3a2580, #5a35a0)',
          color: '#e8dcc0',
          border: '1px solid #6a45b0',
          borderRadius: '6px',
          padding: '16px 32px',
          fontFamily: 'Cinzel',
          fontSize: '18px',
          cursor: 'pointer',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(100, 60, 200, 0.5)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        New Session
      </button>
    </div>
  );
};
