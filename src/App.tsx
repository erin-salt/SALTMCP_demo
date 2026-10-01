import { useEffect, useRef, useState } from 'react'
import { HOST_TRIP } from './data/hostProductFixture'
import { checkableVenueIds, planMeal, to24h } from './domain/planMeal'
import type { AvailabilityRequest, MealId, MealQuery, MealSelection, OpenMeal, PlaceId, SaltVenue, TripDay } from './domain/types'
import { TripPlannerApp, type MealState } from './features/host/TripPlannerApp'
import { CompareSlider } from './features/shell/CompareSlider'
import { DemoShell } from './features/shell/DemoShell'
import type { CheckExchange } from './features/shell/SaltRail'
import { SIMULATED_EXCHANGE_MS, checkAvailability, searchVenues } from './salt/simulatedSalt'
import './styles.css'

const trip = HOST_TRIP
const HERO_DAY = trip.days.find((d) => d.id === 'sat')!
const HERO_MEAL = HERO_DAY.openMeals[0]

// `search_venues`: the host linked each save to a SALT venue when the user saved
// it. The venue record (status, live_availability) is known from then on.
const VENUES: Record<PlaceId, SaltVenue | undefined> = Object.fromEntries(trip.saved.map((place) => [place.id, searchVenues(place.name)]))

function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

const HERO_QUERY: MealQuery = { partySize: trip.partySize, time: HERO_MEAL.around }
const requestFor = (day: TripDay, query: MealQuery, saved = trip.saved) =>
  ({ venue_ids: checkableVenueIds(saved, VENUES), date: day.isoDate, time: to24h(query.time), party_size: query.partySize })

// The opening comparison is itself a request: Trip Planner asks about Saturday
// dinner as the trip opens, and the reveal shows the answer.
const openingState = (runKey: number) => ({
  meals: { [HERO_MEAL.id]: { query: HERO_QUERY, checking: true } } as Partial<Record<MealId, MealState>>,
  exchanges: [{ id: `hero-${runKey}`, label: 'Sat dinner', request: requestFor(HERO_DAY, HERO_QUERY) }] as CheckExchange[],
})

export default function App() {
  const [phase, setPhase] = useState<'compare' | 'explore'>('compare')
  const [dayId, setDayId] = useState('sat')
  const [meals, setMeals] = useState(() => openingState(0).meals)
  const [hero, setHero] = useState<MealState | undefined>()
  const [exchanges, setExchanges] = useState(() => openingState(0).exchanges)
  const [selections, setSelections] = useState<Partial<Record<MealId, MealSelection>>>({})
  const [removed, setRemoved] = useState<PlaceId[]>([])
  const [runKey, setRunKey] = useState(0)
  const timers = useRef<number[]>([])
  const now = useNow()
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const saved = trip.saved.filter((place) => !removed.includes(place.id))

  // Availability is only ever fetched on request: the host asks, SALT answers
  // with a timestamped observation, and the host derives what to show.
  const resolve = (id: string, day: TripDay, meal: OpenMeal, query: MealQuery, request: AvailabilityRequest) => {
    const response = checkAvailability(request)
    const state: MealState = { query, checking: false, plan: planMeal(saved, VENUES, response, day), checkedAt: response.answers.find((a) => a.checked_at)?.checked_at ?? new Date().toISOString() }
    setExchanges((current) => current.map((exchange) => exchange.id === id ? { ...exchange, response } : exchange))
    setMeals((current) => ({ ...current, [meal.id]: state }))
    return state
  }

  const check = (day: TripDay, meal: OpenMeal, query: MealQuery) => {
    const request = requestFor(day, query, saved)
    const id = `${meal.id}-${Date.now()}-${Math.random()}`
    const label = `${day.weekday} ${meal.label.toLowerCase()}`
    setExchanges((current) => [{ id, label, request }, ...current])
    setMeals((current) => ({ ...current, [meal.id]: { query, checking: true, plan: current[meal.id]?.plan } }))
    timers.current.push(window.setTimeout(() => resolve(id, day, meal, query, request), SIMULATED_EXCHANGE_MS))
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setHero(resolve(`hero-${runKey}`, HERO_DAY, HERO_MEAL, HERO_QUERY, requestFor(HERO_DAY, HERO_QUERY))), SIMULATED_EXCHANGE_MS)
    return () => clearTimeout(timer)
    // The opening request runs once per demo run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  const openDay = (id: string) => {
    setDayId(id)
    const day = trip.days.find((d) => d.id === id)!
    day.openMeals.filter((meal) => !meals[meal.id]).forEach((meal) => check(day, meal, { partySize: trip.partySize, time: meal.around }))
  }

  const findMeal = (mealId: MealId) => {
    const day = trip.days.find((d) => d.openMeals.some((m) => m.id === mealId))!
    return { day, meal: day.openMeals.find((m) => m.id === mealId)! }
  }

  // A new party size or time is a new question for SALT. Any earlier choice was
  // made against different availability, so it is cleared rather than kept.
  const changeQuery = (mealId: MealId, query: MealQuery) => {
    const { day, meal } = findMeal(mealId)
    setSelections((current) => ({ ...current, [mealId]: undefined }))
    check(day, meal, query)
  }
  const recheck = (mealId: MealId) => {
    const { day, meal } = findMeal(mealId)
    check(day, meal, meals[mealId]?.query ?? { partySize: trip.partySize, time: meal.around })
  }

  const reset = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setPhase('compare')
    setDayId('sat')
    setMeals(openingState(runKey + 1).meals)
    setHero(undefined)
    setExchanges(openingState(runKey + 1).exchanges)
    setSelections({})
    setRemoved([])
    setRunKey((key) => key + 1)
  }

  // The comparison always tells the same story: Saturday dinner, as first asked.
  const heroMeals = { [HERO_MEAL.id]: hero ?? { query: HERO_QUERY, checking: true } }
  const heroView = { trip, saved: trip.saved, venues: VENUES, now, dayId: 'sat', meals: heroMeals, selections: {} }
  const liveView = { trip, saved, venues: VENUES, now, dayId, meals, selections }
  return <DemoShell phase={phase} saved={trip.saved.length} venues={Object.values(VENUES)} exchanges={exchanges} onExplore={() => setPhase('explore')} onCompare={() => setPhase('compare')} onReset={reset}>
    {phase === 'compare'
      ? <CompareSlider
        key={runKey}
        before={<TripPlannerApp {...heroView} mode="without" interactive={false} />}
        after={<TripPlannerApp {...heroView} mode="with" interactive={false} />}
        onFinish={() => setPhase('explore')}
      />
      : <TripPlannerApp {...liveView} key={runKey} mode="with" interactive onDay={openDay} onChoose={(meal, selection) => setSelections((current) => ({ ...current, [meal]: selection }))} onQuery={changeQuery} onRecheck={recheck} onRemoveSave={(id) => setRemoved((current) => [...current, id])} />}
  </DemoShell>
}
