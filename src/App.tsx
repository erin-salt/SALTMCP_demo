import { useEffect, useRef, useState } from 'react'
import { HOST_TRIP } from './data/hostProductFixture'
import { checkableVenueIds, planMeal, to24h } from './domain/planMeal'
import type { AvailabilityRequest, AvailabilityResponse, MealId, MealPlan, MealQuery, MealSelection, OpenMeal, PlaceId, SaltVenue, TripDay } from './domain/types'
import { AssistantApp } from './features/assistant/AssistantApp'
import type { Prompt, Turn } from './features/assistant/prompts'
import { TripPlannerApp, type MealState, type SaltMode } from './features/host/TripPlannerApp'
import { DemoShell, type Impact, type UseCase } from './features/shell/DemoShell'
import type { CheckExchange } from './features/shell/SaltRail'
import { SIMULATED_EXCHANGE_MS, checkAvailability, searchVenues } from './salt/simulatedSalt'
import './styles.css'

const trip = HOST_TRIP
// How long the opening shows Trip Planner without SALT before switching it on.
const INTRO_MS = 1600

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

const impactOf = (saves: number, plan?: MealPlan): Impact => plan
  ? { saves, withTables: plan.rows.filter((r) => r.state.kind === 'times').length, closed: plan.rows.filter((r) => r.state.kind === 'closed').length }
  : { saves }

export default function App() {
  const [useCase, setUseCase] = useState<UseCase>('planner')
  const [mode, setMode] = useState<SaltMode>('without')
  const [highlight, setHighlight] = useState(true)
  const [touched, setTouched] = useState(false)
  const [dayId, setDayId] = useState('sat')
  const [meals, setMeals] = useState<Partial<Record<MealId, MealState>>>({})
  const [turns, setTurns] = useState<Turn[]>([])
  const [exchanges, setExchanges] = useState<CheckExchange[]>([])
  const [selections, setSelections] = useState<Partial<Record<MealId, MealSelection>>>({})
  const [removed, setRemoved] = useState<PlaceId[]>([])
  const [runKey, setRunKey] = useState(0)
  const timers = useRef<number[]>([])
  const now = useNow()
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const saved = trip.saved.filter((place) => !removed.includes(place.id))

  // Availability is only ever fetched on request: the host asks, SALT answers
  // with a timestamped observation, and the host decides what to show.
  const ask = (label: string, day: TripDay, query: MealQuery, onAnswer: (response: AvailabilityResponse) => void) => {
    const request: AvailabilityRequest = { venue_ids: checkableVenueIds(saved, VENUES), date: day.isoDate, time: to24h(query.time), party_size: query.partySize }
    const id = `${label}-${Date.now()}-${Math.random()}`
    setExchanges((current) => [{ id, label, request }, ...current])
    timers.current.push(window.setTimeout(() => {
      const response = checkAvailability(request)
      setExchanges((current) => current.map((exchange) => exchange.id === id ? { ...exchange, response } : exchange))
      onAnswer(response)
    }, SIMULATED_EXCHANGE_MS))
  }

  // ─── Use case 01: trip planner app ─────────────────────────────────────────
  const check = (day: TripDay, meal: OpenMeal, query: MealQuery) => {
    setMeals((current) => ({ ...current, [meal.id]: { query, checking: true, plan: current[meal.id]?.plan } }))
    ask(`${day.weekday} ${meal.label.toLowerCase()}`, day, query, (response) => setMeals((current) => ({
      ...current,
      [meal.id]: { query, checking: false, plan: planMeal(saved, VENUES, response), checkedAt: response.answers.find((a) => a.checked_at)?.checked_at ?? new Date().toISOString() },
    })))
  }
  // With SALT on, Trip Planner asks about any open meal on the day in view that
  // it has not asked about yet.
  const askForDay = (id: string, current = meals) => {
    const day = trip.days.find((d) => d.id === id)!
    day.openMeals.filter((meal) => !current[meal.id]).forEach((meal) => check(day, meal, { partySize: trip.partySize, time: meal.around }))
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
  const openDay = (id: string) => {
    setDayId(id)
    if (mode === 'with') askForDay(id)
  }

  // ─── Use case 02: AI assistant ─────────────────────────────────────────────
  const answerTurn = (turnId: string, prompt: Prompt) => {
    const day = trip.days.find((d) => d.id === prompt.dayId)!
    setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, checking: true } : turn))
    ask(`Assistant · ${day.weekday} ${prompt.meal}`, day, { partySize: prompt.partySize, time: prompt.time }, (response) =>
      setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, checking: false, response } : turn)))
  }
  const askAssistant = (prompt: Prompt) => {
    const id = `${prompt.id}-${Date.now()}`
    setTurns((current) => [...current, { id, prompt }])
    if (mode === 'with') answerTurn(id, prompt)
  }

  // ─── Shared controls ───────────────────────────────────────────────────────
  const switchMode = (next: SaltMode) => {
    setMode(next)
    if (next !== 'with') return
    askForDay(dayId)
    turns.filter((turn) => !turn.response && !turn.checking).forEach((turn) => answerTurn(turn.id, turn.prompt))
  }

  // The opening: Trip Planner as it is today, then SALT switched on. The first
  // request is the reveal.
  useEffect(() => {
    const timer = window.setTimeout(() => { setMode('with'); askForDay('sat', {}) }, INTRO_MS)
    return () => clearTimeout(timer)
    // The opening runs once per demo run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  const reset = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setUseCase('planner')
    setMode('without')
    setHighlight(true)
    setTouched(false)
    setDayId('sat')
    setMeals({})
    setTurns([])
    setExchanges([])
    setSelections({})
    setRemoved([])
    setRunKey((key) => key + 1)
  }

  const day = trip.days.find((d) => d.id === dayId)!
  const lastAnswered = [...turns].reverse().find((turn) => turn.response)
  const impact = useCase === 'planner'
    ? impactOf(saved.length, day.openMeals[0] && !meals[day.openMeals[0].id]?.checking ? meals[day.openMeals[0].id]?.plan : undefined)
    : impactOf(saved.length, lastAnswered?.response && planMeal(saved, VENUES, lastAnswered.response))

  return <DemoShell
    useCase={useCase}
    mode={mode}
    highlight={highlight}
    prompt={!touched && mode === 'with' && useCase === 'planner' && !!meals['sat-dinner']?.plan}
    impact={impact}
    saved={trip.saved.length}
    venues={Object.values(VENUES)}
    exchanges={exchanges}
    onUseCase={(next) => { setTouched(true); setUseCase(next) }}
    onMode={(next) => { setTouched(true); switchMode(next) }}
    onHighlight={() => { setTouched(true); setHighlight(!highlight) }}
    onReset={reset}
  >
    {useCase === 'planner'
      ? <TripPlannerApp
        key={runKey}
        trip={trip}
        saved={saved}
        venues={VENUES}
        now={now}
        mode={mode}
        highlight={highlight && mode === 'with'}
        dayId={dayId}
        meals={meals}
        selections={selections}
        onDay={openDay}
        onChoose={(meal, selection) => setSelections((current) => ({ ...current, [meal]: selection }))}
        onQuery={mode === 'with' ? changeQuery : undefined}
        onRecheck={recheck}
        onRemoveSave={(id) => setRemoved((current) => [...current, id])}
      />
      : <AssistantApp
        trip={trip}
        saved={saved}
        venues={VENUES}
        mode={mode}
        highlight={highlight && mode === 'with'}
        turns={turns}
        now={now}
        onAsk={askAssistant}
        onChoose={(turnId, choice) => setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, choice } : turn))}
      />}
  </DemoShell>
}
