import type { GameState } from '../game/state';

interface Props {
  state: GameState;
}

export function EventLog({ state }: Props) {
  // Collect recent events from all heroes (exploring or just returned)
  const allEvents = state.heroes
    .flatMap(h =>
      h.eventLog.slice(-5).map(e => ({ ...e, heroName: h.name })),
    )
    .sort((a, b) => b.depth - a.depth)
    .slice(0, 10);

  if (allEvents.length === 0) return null;

  return (
    <section className="panel event-log-panel">
      <h2 className="panel-title">Event Log</h2>
      <div className="event-log-list">
        {allEvents.map((event, i) => (
          <div key={i} className={`event-entry event-${event.kind}`}>
            <span className="event-hero">{event.heroName}</span>
            <span className="event-message">{event.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
