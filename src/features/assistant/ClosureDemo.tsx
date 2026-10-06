import type { Scenario } from './scenarios'

// Demo only, in the SALT panel and kept apart from its call log: a scripted
// suggestion of three places, filtered by SALT's real venue records before the
// traveller sees anything. No model call, and no SALT call when it runs: each
// status is the record already fetched with search_venues. The chat only ever
// shows the two that passed.
export function ClosureDemo({ run, busy, fetchedAt, onRun }: { run?: { scenario: Scenario; id: string }; busy: boolean; fetchedAt?: string; onRun: () => void }) {
  return <section className="rail-demo" aria-label="Closed venues demo">
    <p className="rail-demo-tag">Optional scenario · scripted</p>
    <p className="rail-demo-text">The AI suggests a restaurant that’s permanently closed. Watch SALT catch it before the traveller sees it.</p>
    <button className="rail-demo-run" disabled={busy} onClick={onRun}>{run ? 'Run another' : 'Run scenario'}</button>
    {run && <ol key={run.id} className="rail-demo-steps">
      <li style={{ animationDelay: '0ms' }}><span>scripted ask</span>{run.scenario.def.title}</li>
      {run.scenario.venues.map((v, i) => {
        const gone = v.venue_id === run.scenario.closedId
        return <li key={v.venue_id} className={gone ? 'is-gone' : 'is-ok'} style={{ animationDelay: `${450 + i * 450}ms` }}>
          <span>{gone ? '✕ filtered' : '✓ passes'}</span>{v.name}<code>{v.status}</code>
        </li>
      })}
      <li className="is-result" style={{ animationDelay: '1900ms' }}><span>to traveller</span>2 of 3 suggestions</li>
      {fetchedAt && <li className="is-source" style={{ animationDelay: '1900ms' }}><span>source</span>status from search_venues, fetched {new Date(fetchedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</li>}
    </ol>}
  </section>
}
