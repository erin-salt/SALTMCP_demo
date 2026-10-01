import type { Scenario } from './scenarios'

// Demo only, in the SALT panel: the planner proposes three places and SALT
// checks each before the traveller sees anything. The closed one is filtered
// out here; the chat only ever shows the two that passed.
export function ClosureDemo({ run, busy, onRun }: { run?: { scenario: Scenario; id: string }; busy: boolean; onRun: () => void }) {
  return <section className="rail-demo" aria-label="Closed venues demo">
    <p className="rail-demo-tag">Demo · closed venues</p>
    <p className="rail-demo-text">Trip Planner’s AI wants to suggest three places. Watch SALT check them before the traveller sees anything.</p>
    <button className="rail-demo-run" disabled={busy} onClick={onRun}>{run ? 'Run another' : 'Run the demo'}</button>
    {run && <ol key={run.id} className="rail-demo-steps">
      <li style={{ animationDelay: '0ms' }}><span>planner proposes</span>{run.scenario.def.title}</li>
      {run.scenario.venues.map((v, i) => {
        const gone = v.venue_id === run.scenario.closedId
        return <li key={v.venue_id} className={gone ? 'is-gone' : 'is-ok'} style={{ animationDelay: `${450 + i * 450}ms` }}>
          <span>{gone ? '✕ filtered' : '✓ passes'}</span>{v.name}<code>{v.status}</code>
        </li>
      })}
      <li className="is-result" style={{ animationDelay: '1900ms' }}><span>to traveller</span>2 of 3 suggestions</li>
    </ol>}
  </section>
}
