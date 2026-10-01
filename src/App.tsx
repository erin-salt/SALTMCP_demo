import { useEffect, useRef, useState } from 'react'
import { HOST_TRIP } from './data/hostProductFixture'
import { checkableVenueIds, planMeal, to24h } from './domain/planMeal'
import { tripForLive } from './domain/tripDates'
import type { AvailabilityRequest, AvailabilityResponse, HostTrip, MealId, MealPlan, MealQuery, MealSelection, OpenMeal, PlaceId, SaltVenue, TripDay } from './domain/types'
import { AssistantApp } from './features/assistant/AssistantApp'
import type { Prompt, Turn } from './features/assistant/prompts'
import { TripPlannerApp, type MealState, type SaltMode } from './features/host/TripPlannerApp'
import { DemoShell, type DataSource, type Impact, type LiveStatus, type UseCase } from './features/shell/DemoShell'
import type { CheckExchange } from './features/shell/SaltRail'
import { LiveError, fetchLiveAvailability, fetchLiveVenues } from './salt/liveSalt'
import { SIMULATED_EXCHANGE_MS, checkAvailability, searchVenues } from './salt/simulatedSalt'
import './styles.css'

// How long the opening shows Trip Planner without SALT before switching it on.
const INTRO_MS = 1600

// `search_venues`: the host linked each save to a SALT venue when the user saved
// it. In simulated mode the records come from the fixture; in live mode, from SALT.
const SIMULATED_VENUES: Record<PlaceId, SaltVenue | undefined> = Object.fromEntries(HOST_TRIP.saved.map((place) => [place.id, searchVenues(place.name)]))

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

const failure = (error: unknown) => error instanceof LiveError
  ? { message: error.message, retryAfter: error.retryAfter }
  : { message: 'Couldn’t reach SALT' }

interface Salt { source: DataSource; trip: HostTrip; venues: Record<PlaceId, SaltVenue | undefined> }
const SIMULATED: Salt = { source: 'simulated', trip: HOST_TRIP, venues: SIMULATED_VENUES }

export default function App({ initialSource = 'live' }: { initialSource?: DataSource }) {
  const [useCase, setUseCase] = useState<UseCase>('planner')
  const [mode, setModeState] = useState<SaltMode>('without')
  const [highlight, setHighlight] = useState(true)
  const [touched, setTouched] = useState(false)
  const [salt, setSaltState] = useState<Salt>(() => initialSource === 'live' ? { source: 'live', trip: tripForLive(HOST_TRIP), venues: {} } : SIMULATED)
  const [liveStatus, setLiveStatus] = useState<LiveStatus>(initialSource === 'live' ? 'loading' : 'idle')
  const [liveError, setLiveError] = useState<string>()
  const [dayId, setDayId] = useState('sat')
  const [meals, setMeals] = useState<Partial<Record<MealId, MealState>>>({})
  const [turns, setTurns] = useState<Turn[]>([])
  const [exchanges, setExchanges] = useState<CheckExchange[]>([])
  const [selections, setSelections] = useState<Partial<Record<MealId, MealSelection>>>({})
  const [removed, setRemoved] = useState<PlaceId[]>([])
  const [runKey, setRunKey] = useState(0)
  const timers = useRef<number[]>([])
  // Callbacks read the current data source from here, so a request started in
  // simulated mode never lands in live state, or the other way round.
  const saltRef = useRef(salt)
  const generation = useRef(0)
  const setSalt = (next: Salt) => { saltRef.current = next; setSaltState(next) }
  // Async work (live connection, the opening) reads these rather than a stale render.
  const modeRef = useRef(mode)
  const setMode = (next: SaltMode) => { modeRef.current = next; setModeState(next) }
  const liveReady = useRef(false)
  const now = useNow()
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const { trip, venues } = salt
  const saved = trip.saved.filter((place) => !removed.includes(place.id))
  const savedNow = () => saltRef.current.trip.saved.filter((place) => !removed.includes(place.id))

  // Availability is only ever fetched on request: the host asks, SALT answers
  // with a timestamped observation, and the host decides what to show.
  const ask = (label: string, day: TripDay, query: MealQuery, onAnswer: (response: AvailabilityResponse) => void, onError: (error: { message: string; retryAfter?: number }) => void) => {
    const { source, venues: current } = saltRef.current
    const request: AvailabilityRequest = { venue_ids: checkableVenueIds(savedNow(), current), date: day.isoDate, time: to24h(query.time), party_size: query.partySize }
    const id = `${label}-${Date.now()}-${Math.random()}`
    const run = generation.current
    const stillCurrent = () => run === generation.current
    setExchanges((list) => [{ id, label, request, source }, ...list])
    const settle = (patch: Partial<CheckExchange>) => setExchanges((list) => list.map((exchange) => exchange.id === id ? { ...exchange, ...patch } : exchange))
    if (source === 'simulated') {
      timers.current.push(window.setTimeout(() => {
        const response = checkAvailability(request)
        settle({ response })
        onAnswer(response)
      }, SIMULATED_EXCHANGE_MS))
      return
    }
    fetchLiveAvailability(request).then(
      (response) => { if (stillCurrent()) { settle({ response }); onAnswer(response) } },
      (error) => { if (stillCurrent()) { const f = failure(error); settle({ error: f.message }); onError(f) } },
    )
  }

  // ─── Use case 01: trip planner app ─────────────────────────────────────────
  const check = (day: TripDay, meal: OpenMeal, query: MealQuery) => {
    setMeals((current) => ({ ...current, [meal.id]: { query, checking: true, plan: current[meal.id]?.plan } }))
    ask(`${day.weekday} ${meal.label.toLowerCase()}`, day, query,
      (response) => setMeals((current) => ({
        ...current,
        [meal.id]: { query, checking: false, plan: planMeal(savedNow(), saltRef.current.venues, response), checkedAt: response.answers.find((a) => a.checked_at)?.checked_at ?? new Date().toISOString() },
      })),
      (error) => setMeals((current) => ({ ...current, [meal.id]: { query, checking: false, plan: current[meal.id]?.plan, checkedAt: current[meal.id]?.checkedAt, error } })))
  }
  // With SALT on, Trip Planner asks about any open meal on the day in view that
  // it has not asked about yet.
  const askForDay = (id: string, current = meals) => {
    const day = saltRef.current.trip.days.find((d) => d.id === id)!
    day.openMeals.filter((meal) => !current[meal.id]).forEach((meal) => check(day, meal, { partySize: saltRef.current.trip.partySize, time: meal.around }))
  }
  const findMeal = (mealId: MealId) => {
    const day = saltRef.current.trip.days.find((d) => d.openMeals.some((m) => m.id === mealId))!
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
    const day = saltRef.current.trip.days.find((d) => d.id === prompt.dayId)!
    setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, checking: true, error: undefined } : turn))
    ask(`Assistant · ${day.weekday} ${prompt.meal}`, day, { partySize: prompt.partySize, time: prompt.time },
      (response) => setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, checking: false, response } : turn)),
      (error) => setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, checking: false, error } : turn)))
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

  // Fresh answers for whatever is on screen, after the data source changes.
  const clearSaltState = () => {
    generation.current += 1
    timers.current.forEach(clearTimeout)
    timers.current = []
    setMeals({})
    setExchanges([])
    setSelections({})
    setTurns((current) => current.map(({ id, prompt }) => ({ id, prompt })))
  }

  // Live mode: link the saves through SALT first (search_venues), then ask.
  const switchSource = (next: DataSource) => {
    if (next === saltRef.current.source && (next === 'simulated' || liveStatus === 'ready')) return
    clearSaltState()
    if (next === 'simulated') {
      setSalt(SIMULATED)
      setLiveStatus('idle')
      if (mode === 'with') { askForDay(dayId, {}); turns.forEach((turn) => answerTurn(turn.id, turn.prompt)) }
      return
    }
    connectLive(turns)
  }

  const connectLive = (pending: Turn[] = []) => {
    const liveTrip = tripForLive(HOST_TRIP)
    liveReady.current = false
    setSalt({ source: 'live', trip: liveTrip, venues: {} })
    setLiveStatus('loading')
    setLiveError(undefined)
    const run = generation.current
    fetchLiveVenues(liveTrip.saved).then((liveVenues) => {
      if (run !== generation.current) return
      setSalt({ source: 'live', trip: liveTrip, venues: liveVenues })
      liveReady.current = true
      setLiveStatus('ready')
      if (modeRef.current === 'with') { askForDay(dayId, {}); pending.forEach((turn) => answerTurn(turn.id, turn.prompt)) }
    }, (error) => {
      if (run !== generation.current) return
      setLiveStatus('error')
      setLiveError(failure(error).message)
    })
  }

  // The opening: Trip Planner as it is today, then SALT switched on. The first
  // request is the reveal. Live mode connects to SALT meanwhile; if it is not
  // ready yet, the first request goes out as soon as it is.
  useEffect(() => {
    const connect = initialSource === 'live' ? window.setTimeout(() => { clearSaltState(); connectLive() }) : undefined
    const timer = window.setTimeout(() => {
      setMode('with')
      if (saltRef.current.source === 'simulated' || liveReady.current) askForDay('sat', {})
    }, INTRO_MS)
    return () => { clearTimeout(connect); clearTimeout(timer) }
    // The opening runs once per demo run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  const reset = () => {
    clearSaltState()
    if (initialSource === 'simulated') { setSalt(SIMULATED); setLiveStatus('idle') }
    setUseCase('planner')
    setMode('without')
    setHighlight(true)
    setTouched(false)
    setDayId('sat')
    setTurns([])
    setRemoved([])
    setRunKey((key) => key + 1)
  }

  const day = trip.days.find((d) => d.id === dayId)!
  const lastAnswered = [...turns].reverse().find((turn) => turn.response)
  const impact = useCase === 'planner'
    ? impactOf(saved.length, day.openMeals[0] && !meals[day.openMeals[0].id]?.checking ? meals[day.openMeals[0].id]?.plan : undefined)
    : impactOf(saved.length, lastAnswered?.response && planMeal(saved, venues, lastAnswered.response))

  return <DemoShell
    useCase={useCase}
    mode={mode}
    source={salt.source}
    liveStatus={liveStatus}
    liveError={liveError}
    highlight={highlight}
    prompt={!touched && mode === 'with' && useCase === 'planner' && !!meals['sat-dinner']?.plan}
    impact={impact}
    saved={trip.saved.length}
    venues={Object.values(venues)}
    exchanges={exchanges}
    onUseCase={(next) => { setTouched(true); setUseCase(next) }}
    onMode={(next) => { setTouched(true); switchMode(next) }}
    onSource={(next) => { setTouched(true); switchSource(next) }}
    onHighlight={() => { setTouched(true); setHighlight(!highlight) }}
    onReset={reset}
  >
    {useCase === 'planner'
      ? <TripPlannerApp
        key={`${runKey}-${salt.source}`}
        trip={trip}
        saved={saved}
        venues={venues}
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
        venues={venues}
        mode={mode}
        highlight={highlight && mode === 'with'}
        turns={turns}
        now={now}
        onAsk={askAssistant}
        onRetry={(turn) => answerTurn(turn.id, turn.prompt)}
        onChoose={(turnId, choice) => setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, choice } : turn))}
      />}
  </DemoShell>
}
