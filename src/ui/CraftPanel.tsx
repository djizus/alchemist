import React from 'react';
import { INGREDIENT_TIER } from '../game/constants';

interface CraftPanelProps {
  craftSlots: string[];
  craftResult: { type: 'success' | 'fail'; text: string } | null;
  inventory: [string, number][]; // [name, count] sorted
  testedCount: number;
  onSetSlot: (idx: number, val: string) => void;
  onBrew: () => void;
}

export const CraftPanel: React.FC<CraftPanelProps> = ({
  craftSlots,
  craftResult,
  inventory,
  testedCount,
  onSetSlot,
  onBrew,
}) => {
  // Sort inventory for display: Common -> Rare -> Epic
  const tierOrder: Record<string, number> = { common: 0, rare: 1, epic: 2 };
  const sortedInventory = [...inventory].sort((a, b) => {
    const tierA = tierOrder[INGREDIENT_TIER[a[0]] || 'common'] ?? 0;
    const tierB = tierOrder[INGREDIENT_TIER[b[0]] || 'common'] ?? 0;
    if (tierA !== tierB) return tierA - tierB;
    return a[0].localeCompare(b[0]);
  });

  const filledSlots = craftSlots.filter((s) => s !== '').length;
  const canBrew = filledSlots >= 2;

  return (
    <div className="craft-panel">
      <h2>Cauldron</h2>
      <div className="craft-slots">
        {craftSlots.map((slot, idx) => (
          <div key={idx} className="craft-slot">
            <select value={slot} onChange={(e) => onSetSlot(idx, e.target.value)}>
              <option value="">
                {idx < 2 ? `Slot ${idx + 1} *` : `Slot ${idx + 1} (opt)`}
              </option>
              {inventory.map(([ing, count]) => (
                <option key={ing} value={ing}>
                  {ing} ({count})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button className="craft-btn" disabled={!canBrew} onClick={onBrew}>
        ⚗️ Brew
      </button>

      <div className={`craft-result ${craftResult ? craftResult.type : 'empty'}`}>
        {craftResult ? craftResult.text : 'Select ingredients and brew...'}
      </div>

      <div className="inv-section">
        <h3>Inventory</h3>
        <div className="inv-grid">
          {sortedInventory.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#3a3555', fontStyle: 'italic', padding: '4px' }}>
              No ingredients yet. Explore!
            </div>
          ) : (
            sortedInventory.map(([name, count]) => (
              <div key={name} className={`inv-item tier-${INGREDIENT_TIER[name] || 'common'}`}>
                <span className="name">{name}</span>
                <span className="count">x{count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '8px', fontSize: '11px', color: '#3a3555', borderTop: '1px solid #1e1a30', paddingTop: '8px' }}>
        Tested: {testedCount} combos
        <br />
        Recipes: 2-4 ingredients
      </div>
    </div>
  );
};
