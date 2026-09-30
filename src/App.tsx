import { useEffect, useRef, useState } from 'react'
import { HOST_TRIP } from './data/hostProductFixture'
import { planMeal } from './domain/planMeal'
import type { MealId, MealQuery, MealSelection, OpenMeal, SavedPlace, TripDay, VenueId } from './domain/types'
import { TripPlannerApp, type MealState } from './features/host/TripPlannerApp'
import { CompareSlider } from './features/shell/CompareSlider'
import { DemoShell } from './features/shell/DemoShell'
import type { Exchange } from './features/shell/SaltRail'
import { SIMULATED_EXCHANGE_MS, simulateSaltCheck } from './salt/simulatedSalt'
import './styles.css'

const trip = HOST_TRIP

// The host builds the request from its own context; SALT answers; the host
// then derives what to show. The three steps are kept separate on purpose.
function exchangeFor(day: TripDay, meal: OpenMeal, query: MealQuery, saved: SavedPlace[], withResponse: boolean): Exchange {
  const request = { venueIds: saved.map((place) => place.id), partySize: query.partySize, date: day.isoDate, period: meal.period, preferredTime: query.time }
  const exchange: Exchange = { id: `${meal.id}-${query.partySize}-${query.time}`, label: `${day.weekday} ${meal.label.toLowerCase()}`, request }
  if (!withResponse) return exchange
  const response = simulateSaltCheck(request)
  return { ...exchange, response, plan: planMeal(saved, response, day) }
}

// The trip opens with Saturday dinner already checked, so the comparison has an
// "after" to show on first view.
function initialState() {
  const day = trip.days.find((d) => d.id === 'sat')!
  const meal = day.openMeals[0]
  const query = { partySize: trip.partySize, time: meal.around }
  const exchange = exchangeFor(day, meal, query, trip.saved, true)
  return { exchanges: [exchange], meals: { [meal.id]: { query, checking: false, plan: exchange.plan } } as Partial<Record<MealId, MealState>> }
}

const HERO = initialState()
const HERO_CLOSED = new Set(HERO.exchanges.flatMap((exchange) => exchange.response?.results.filter((r) => r.kind === 'closed-permanently').map((r) => r.venueId) ?? []))

export default function App() {
  const [phase, setPhase] = useState<'compare' | 'explore'>('compare')
  const [dayId, setDayId] = useState('sat')
  const [{ exchanges, meals }, setSalt] = useState(initialState)
  const [selections, setSelections] = useState<Partial<Record<MealId, MealSelection>>>({})
  const [removed, setRemoved] = useState<VenueId[]>([])
  const [runKey, setRunKey] = useState(0)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const saved = trip.saved.filter((place) => !removed.includes(place.id))

  const check = (day: TripDay, meal: OpenMeal, query: MealQuery) => {
    const pending = exchangeFor(day, meal, query, saved, false)
    setSalt((current) => ({ exchanges: [pending, ...current.exchanges], meals: { ...current.meals, [meal.id]: { query, checking: true } } }))
    timers.current.push(window.setTimeout(() => {
      const done = exchangeFor(day, meal, query, saved, true)
      setSalt((current) => ({
        exchanges: current.exchanges.map((exchange) => exchange === pending ? done : exchange),
        meals: { ...current.meals, [meal.id]: { query, checking: false, plan: done.plan } },
      }))
    }, SIMULATED_EXCHANGE_MS))
  }

  const openDay = (id: string) => {
    setDayId(id)
    const day = trip.days.find((d) => d.id === id)!
    day.openMeals.filter((meal) => !meals[meal.id]).forEach((meal) => check(day, meal, { partySize: trip.partySize, time: meal.around }))
  }

  // A new party size or time is a new question for SALT. Any earlier choice was
  // made against different availability, so it is cleared rather than kept.
  const changeQuery = (mealId: MealId, query: MealQuery) => {
    const day = trip.days.find((d) => d.openMeals.some((m) => m.id === mealId))!
    setSelections((current) => ({ ...current, [mealId]: undefined }))
    check(day, day.openMeals.find((m) => m.id === mealId)!, query)
  }

  const reset = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPhase('compare')
    setDayId('sat')
    setSalt(initialState())
    setSelections({})
    setRemoved([])
    setRunKey((key) => key + 1)
  }

  // Closure is a fact about the venue, not about one query: once SALT has said
  // so, the host keeps showing it while later checks are in flight.
  const closedVenues = new Set(exchanges.flatMap((exchange) => exchange.response?.results.filter((r) => r.kind === 'closed-permanently').map((r) => r.venueId) ?? []))
  const shared = { trip, saved, dayId, meals, selections, closedVenues }
  // The comparison always tells the same story: Saturday, as the trip opens.
  const hero = { trip, saved: trip.saved, dayId: 'sat', meals: HERO.meals, selections: {}, closedVenues: HERO_CLOSED }
  return <DemoShell phase={phase} exchanges={exchanges} onExplore={() => setPhase('explore')} onCompare={() => setPhase('compare')} onReset={reset}>
    {phase === 'compare'
      ? <CompareSlider
        key={runKey}
        before={<TripPlannerApp {...hero} mode="without" interactive={false} />}
        after={<TripPlannerApp {...hero} mode="with" interactive={false} />}
        onFinish={() => setPhase('explore')}
      />
      : <TripPlannerApp {...shared} key={runKey} mode="with" interactive onDay={openDay} onChoose={(meal, selection) => setSelections((current) => ({ ...current, [meal]: selection }))} onQuery={changeQuery} onRemoveSave={(id) => setRemoved((current) => [...current, id])} />}
  </DemoShell>
}
