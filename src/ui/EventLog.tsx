import type { GameState } from '../game/state';

interface Props {
  state: GameState;
}

export function EventLog({ state }: Props) {
  // Collect recent events from all exploring heroes
  const allEvents = state.heroes
    .flatMap(h =>
      h.eventLog.slice(-5).map(e => ({ ...e, heroName: h.name })),
    )
    .sort((a, b) => b.depth - a.depth)
    .slice(0, 8);

  if (allEvents.length === 0) return null;

  return (
    <div className="event-log">
      {allEvents.map((event, i) => (
        <div key={i} className={`event-entry event-${event.kind}`}>
          <span className="event-hero">{event.heroName}</span>
          <span className="event-message">{event.message}</span>
        </div>
      ))}
    </div>
  );
}
