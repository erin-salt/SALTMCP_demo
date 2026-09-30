import { useState, type Ref } from 'react'
import { nextEventNote } from '../../domain/planMeal'
import type { ExcludedResult, MealPlan, MealSelection, OpenMeal, TripDay } from '../../domain/types'
import type { Exchange } from '../shell/SaltRail'
import type { Handoff } from './HandoffSheet'
import { Icon } from './icons'

interface Props {
  ref: Ref<HTMLLIElement>
  day: TripDay
  meal: OpenMeal
  partySize: number
  savedCount: number
  exchange?: Exchange
  selection?: MealSelection
  onCheck: () => void
  onSelect: (selection?: MealSelection) => void
  onReserve: (handoff: Handoff) => void
}

const reason = (result: ExcludedResult) => {
  switch (result.kind) {
    case 'provider-no-tables': return `Provider showed no tables ${result.window}`
    case 'unknown': return 'Couldn’t confirm times'
    case 'not-covered': return 'Times not checked'
    case 'not-matched': return 'Couldn’t match venue'
    case 'closed-permanently': return 'Closed permanently'
  }
}

export function MealSlot({ ref, day, meal, partySize, savedCount, exchange, selection, onCheck, onSelect, onReserve }: Props) {
  const [changing, setChanging] = useState(false)
  const plan = exchange?.plan
  const chosen = selection && plan?.options.find((option) => option.place.id === selection.venueId)
  const state = chosen ? 'planned' : !exchange ? 'open' : !plan ? 'checking' : 'options'
  const note = selection && nextEventNote(day, selection.time)
  const choose = (next?: MealSelection) => { onSelect(next); setChanging(false) }

  return <li ref={ref} className={`item meal-slot is-${state}`} aria-label={`${day.weekday} ${meal.label.toLowerCase()}`}>
    <time className={selection ? '' : 'is-target'}>{selection?.time ?? meal.around}</time>
    <Icon name="meal" />
    <div className="slot-body">
      {chosen && selection
        ? <>
          <p className="item-title">{chosen.place.name}</p>
          <p className="item-detail">{meal.label} · {partySize} people <span className="not-booked">Not booked</span></p>
          {note && <p className="event-note">{note.minutes} min before {note.title}</p>}
          <div className="slot-actions">
            <button className="wf-button" onClick={() => onReserve({ name: chosen.place.name, time: selection.time, day: `${day.weekday} ${day.day} ${day.month}` })}>Reserve <Icon name="external" /></button>
            <button className="wf-link" aria-expanded={changing} onClick={() => setChanging(!changing)}>{changing ? 'Keep' : 'Change'}</button>
            <button className="wf-link" onClick={() => choose(undefined)}>Remove</button>
          </div>
        </>
        : <>
          <p className="item-title">{meal.label}{state !== 'open' && <span className="slot-meta"> · {partySize} people</span>}</p>
          {state === 'open' && <>
            <p className="item-detail">Nothing planned</p>
            <div className="slot-actions"><button className="wf-button" onClick={onCheck}>Choose from saved</button></div>
          </>}
          {state === 'checking' && <p className="slot-checking" role="status"><span className="salt-spinner" aria-hidden="true" />Checking {savedCount} saved places for {partySize}</p>}
        </>}
      {plan && (!chosen || changing) && <Options plan={plan} day={day} meal={meal} partySize={partySize} selection={selection} onChoose={choose} />}
    </div>
  </li>
}

function Options({ plan, day, meal, partySize, selection, onChoose }: { plan: MealPlan; day: TripDay; meal: OpenMeal; partySize: number; selection?: MealSelection; onChoose: (selection: MealSelection) => void }) {
  const [showOthers, setShowOthers] = useState(false)
  const othersId = `others-${meal.id}`
  return <div className="slot-options">
    {plan.options.length === 0
      ? <p className="item-detail">No times observed for {partySize} at your saves</p>
      : <ul className="options" aria-label={`${day.weekday} ${meal.label.toLowerCase()} options`}>
        {plan.options.map((option, index) => {
          const notes = option.times.filter((time) => time.nearEvent)
          return <li className="option" key={option.place.id} style={{ animationDelay: `${index * 70}ms` }}>
            <span className="option-name">{option.place.name}</span>
            <span className="option-times">{option.times.map(({ time, nearEvent }) => {
              const active = selection?.venueId === option.place.id && selection.time === time
              return <button key={time} className={`time-chip${nearEvent ? ' has-note' : ''}`} aria-pressed={active} aria-label={`${option.place.name} at ${time}`} onClick={() => onChoose({ venueId: option.place.id, time })}>{time}</button>
            })}</span>
            {notes.map(({ time, nearEvent }) => <span className="event-note" key={time}>{time} is {nearEvent!.minutes} min before {nearEvent!.title}</span>)}
          </li>
        })}
      </ul>}
    {plan.others.length > 0 && <div className="others">
      <button className="others-toggle" aria-expanded={showOthers} aria-controls={othersId} onClick={() => setShowOthers(!showOthers)}>
        {plan.others.length} other saves <span>no times observed</span>
      </button>
      <ul id={othersId} aria-label="Other saves" hidden={!showOthers}>
        {plan.others.map(({ place, result }) => <li key={place.id} className={`is-${result.kind}`}><span>{place.name}</span><span>{reason(result)}</span></li>)}
      </ul>
    </div>}
  </div>
}
