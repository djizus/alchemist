import React from 'react';
import type { Recipe } from '../game/state';

interface GrimoirePanelProps {
  recipes: Recipe[];
  discovered: number[];
  lastDiscoveredId: number | null;
}

export const GrimoirePanel: React.FC<GrimoirePanelProps> = ({
  recipes,
  discovered,
  lastDiscoveredId,
}) => {
  return (
    <div className="grimoire-panel">
      <h2>Grimoire</h2>
      <div className="grimoire-grid">
        {recipes.map((recipe) => {
          const isDiscovered = discovered.includes(recipe.id);
          const isJustFound = recipe.id === lastDiscoveredId;
          
          let className = 'grimoire-slot';
          if (isDiscovered) className += ' discovered';
          else className += ' unknown';
          
          if (isJustFound) className += ' just-found';

          return (
            <div
              key={recipe.id}
              className={className}
              title={isDiscovered ? recipe.ingredients.join(', ') : undefined}
            >
              {isDiscovered ? recipe.name : '????'}
            </div>
          );
        })}
      </div>
    </div>
  );
};
