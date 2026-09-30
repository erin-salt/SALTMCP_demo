import type { MealPlan, SaltRequest, SaltResponse, SaltResultKind } from '../../domain/types'
import { RESULT_LABEL } from '../../salt/simulatedSalt'
import { SaltMark } from './DemoShell'

export interface Exchange { id: string; label: string; request: SaltRequest; response?: SaltResponse; plan?: MealPlan }

const PRIMARY: SaltResultKind[] = ['times-observed', 'closed-permanently']
const tone = (kind: SaltResultKind) => PRIMARY.includes(kind) ? kind : 'other'

// A quiet log outside the host window: one line for what the host asked, one
// line for what SALT answered. Detail is folded away for technical viewers.
export function SaltRail({ exchanges }: { exchanges: Exchange[] }) {
  const latest = exchanges[0]
  return <>
    <aside className="rail" id="salt-rail" aria-labelledby="rail-title">
      <header className="rail-head"><h2 id="rail-title"><SaltMark /></h2></header>
      <div className="rail-log" aria-live="polite">
        {exchanges.length === 0
          ? <p className="rail-idle"><span className="rail-pulse" aria-hidden="true" />Waiting for Trip Planner</p>
          : exchanges.map((exchange) => <Entry key={exchange.id} exchange={exchange} />)}
      </div>
      <details className="rail-owners">
        <summary>Who owns what</summary>
        <dl>
          <dt>Trip Planner knows</dt><dd>Trip, itinerary and party</dd><dd>Saved places and where they came from</dd>
          <dt className="is-salt">SALT returns</dt><dd>Whether each venue is still operating</dd><dd>Times observed for the party, or why none could be</dd>
          <dt>Trip Planner decides</dt><dd>Order, presentation and timing notes</dd><dd>Handoff to a reservation provider</dd>
        </dl>
      </details>
    </aside>
    {latest && <a className="rail-ticker" href="#salt-rail" aria-hidden="true" tabIndex={-1}>
      <SaltMark small />
      <span className="ticker-label">{latest.label}</span>
      {latest.response ? <Strip response={latest.response} /> : <span className="rail-spinner" />}
    </a>}
  </>
}

function Strip({ response }: { response: SaltResponse }) {
  return <span className="rail-strip" aria-hidden="true">{response.results.map((result) => <i key={result.venueId} className={tone(result.kind)} />)}</span>
}

function Entry({ exchange: { label, request, response } }: { exchange: Exchange }) {
  const count = (kind: SaltResultKind) => response?.results.filter((result) => result.kind === kind).length ?? 0
  return <article className="rail-entry" aria-label={label}>
    <h3>{label}</h3>
    <p className="rail-line is-host"><span aria-hidden="true">→</span><span>{request.venueIds.length} saves · {request.partySize} people · {request.preferredTime}</span></p>
    {!response
      ? <p className="rail-line is-salt"><span aria-hidden="true">←</span><span className="rail-pending"><span className="rail-spinner" aria-hidden="true" />Checking</span></p>
      : <>
        <p className="rail-line is-salt"><span aria-hidden="true">←</span><Strip response={response} /></p>
        <p className="rail-line is-answer">{count('times-observed')} with times{count('closed-permanently') > 0 && ` · ${count('closed-permanently')} closed`}</p>
        <details className="rail-detail">
          <summary>Detail</summary>
          <ul>
            {(Object.keys(RESULT_LABEL) as SaltResultKind[]).filter((kind) => count(kind) > 0).map((kind) => <li key={kind}><b>{count(kind)}</b> {RESULT_LABEL[kind]}</li>)}
            <li className="is-host">Trip Planner lists saves with times in the order they were saved</li>
          </ul>
        </details>
      </>}
  </article>
}
