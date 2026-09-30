import type { MealId, MealPlan, SaltRequest, SaltResponse, SaltResultKind } from '../../domain/types'
import { RESULT_LABEL } from '../../salt/simulatedSalt'
import { SaltMark } from './DemoShell'

export interface Exchange { mealId: MealId; label: string; request: SaltRequest; response?: SaltResponse; plan?: MealPlan }

// The rail sits outside the host window: it shows only what crosses the
// boundary between WAYFARER and SALT, plus what WAYFARER derived afterwards.
export function SaltRail({ exchanges }: { exchanges: Exchange[] }) {
  const latest = exchanges[0]
  return <>
  <aside className="rail" id="salt-rail" aria-labelledby="rail-title">
    <header className="rail-head">
      <h2 id="rail-title"><SaltMark /></h2>
      <p>Venue feasibility</p>
    </header>
    <div className="rail-log" aria-live="polite">
      {exchanges.length === 0
        ? <div className="rail-idle"><span className="rail-pulse" aria-hidden="true" />No requests yet</div>
        : exchanges.map((exchange) => <ExchangeEntry key={exchange.mealId} exchange={exchange} />)}
    </div>
    <details className="rail-owners">
      <summary>Who owns what</summary>
      <dl>
        <dt>Wayfarer knows</dt><dd>Trip, itinerary and party size</dd><dd>Saved places and where they came from</dd>
        <dt className="is-salt">SALT returns</dt><dd>Whether each venue is still operating</dd><dd>Times observed for the party, or why none could be</dd>
        <dt>Wayfarer decides</dt><dd>Order, presentation and timing notes</dd><dd>Handoff to a reservation provider</dd>
      </dl>
    </details>
  </aside>
  {latest && <a className="rail-ticker" href="#salt-rail" aria-hidden="true" tabIndex={-1}>
    <SaltMark small />
    <span className="ticker-label">{latest.label}</span>
    {latest.response
      ? <span className="rail-strip">{latest.response.results.map((result) => <i key={result.venueId} className={tone(result.kind)} />)}</span>
      : <span className="rail-spinner" />}
  </a>}
  </>
}

const PRIMARY: SaltResultKind[] = ['times-observed', 'closed-permanently']
const tone = (kind: SaltResultKind) => PRIMARY.includes(kind) ? kind : 'other'

function ExchangeEntry({ exchange }: { exchange: Exchange }) {
  const { request, response, plan } = exchange
  const count = (kind: SaltResultKind) => response?.results.filter((result) => result.kind === kind).length ?? 0
  // Lead with the two proof moments; every other state stays available, folded.
  const secondary = (Object.keys(RESULT_LABEL) as SaltResultKind[]).filter((kind) => !PRIMARY.includes(kind) && count(kind) > 0)
  const secondaryTotal = secondary.reduce((total, kind) => total + count(kind), 0)
  const notes = plan?.options.flatMap((option) => option.times.filter((time) => time.nearEvent).map((time) => ({ place: option.place.name, ...time }))) ?? []

  return <article className="rail-entry" aria-label={exchange.label}>
    <h3>{exchange.label}</h3>
    <section className="rail-step">
      <h4><span aria-hidden="true">→</span> From Wayfarer</h4>
      <p className="rail-facts"><span>{request.venueIds.length} saved venues</span><span>{request.partySize} people</span><span>around {request.preferredTime}</span></p>
    </section>
    <section className="rail-step is-salt">
      <h4><span aria-hidden="true">←</span> SALT</h4>
      {!response
        ? <p className="rail-pending"><span className="rail-spinner" aria-hidden="true" />Checking venues</p>
        : <>
          <div className="rail-strip" aria-hidden="true">{response.results.map((result) => <i key={result.venueId} className={tone(result.kind)} />)}</div>
          <p className="rail-answer is-times"><b>{count('times-observed')}</b> times observed for {request.partySize}</p>
          {count('closed-permanently') > 0 && <p className="rail-answer is-closed"><b>{count('closed-permanently')}</b> closed permanently</p>}
          {secondaryTotal > 0 && <details className="rail-detail">
            <summary><b>{secondaryTotal}</b> no times observed</summary>
            <ul>{secondary.map((kind) => <li key={kind}><b>{count(kind)}</b> {RESULT_LABEL[kind]}</li>)}</ul>
          </details>}
        </>}
    </section>
    {plan && <section className="rail-step is-host">
      <h4><span aria-hidden="true">↳</span> Wayfarer</h4>
      <ul className="rail-derived">
        <li>Orders by closeness to {request.preferredTime}</li>
        {notes.map((note) => <li key={note.place + note.time}>Notes {note.time} is {note.nearEvent!.minutes} min before {note.nearEvent!.title}</li>)}
      </ul>
    </section>}
  </article>
}
