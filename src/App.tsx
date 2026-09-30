import { useEffect, useRef, useState } from 'react'
import { WAYFARER_TRIP } from './data/hostProductFixture'
import { planMeal } from './domain/planMeal'
import type { MealId, MealSelection, OpenMeal, TripDay, VenueId } from './domain/types'
import { SIMULATED_EXCHANGE_MS, simulateSaltCheck } from './salt/simulatedSalt'
import { DemoShell } from './features/shell/DemoShell'
import type { Exchange } from './features/shell/SaltRail'
import { WayfarerApp } from './features/wayfarer/WayfarerApp'
import './styles.css'

export default function App() {
  const trip = WAYFARER_TRIP
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [selections, setSelections] = useState<Partial<Record<MealId, MealSelection>>>({})
  const [removed, setRemoved] = useState<VenueId[]>([])
  const [resetKey, setResetKey] = useState(0)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const saved = trip.saved.filter((place) => !removed.includes(place.id))

  // WAYFARER builds the request from its own context; SALT answers; WAYFARER
  // then derives what to show. The three steps are kept separate on purpose.
  const checkMeal = (day: TripDay, meal: OpenMeal) => {
    if (exchanges.some((exchange) => exchange.mealId === meal.id)) return
    const request = { venueIds: saved.map((place) => place.id), partySize: trip.partySize, date: day.isoDate, period: meal.period, preferredTime: meal.around }
    const label = `${day.weekday} ${day.day} ${day.month} · ${meal.label}`
    setExchanges((current) => [{ mealId: meal.id, label, request }, ...current])
    timers.current.push(window.setTimeout(() => {
      const response = simulateSaltCheck(request)
      const plan = planMeal(saved, response, day, meal)
      setExchanges((current) => current.map((exchange) => exchange.mealId === meal.id ? { ...exchange, response, plan } : exchange))
    }, SIMULATED_EXCHANGE_MS))
  }

  const reset = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setExchanges([])
    setSelections({})
    setRemoved([])
    setResetKey((key) => key + 1)
  }

  const closedVenues = new Set(exchanges.flatMap((exchange) => exchange.response?.results.filter((result) => result.kind === 'closed-permanently').map((result) => result.venueId) ?? []))

  return <DemoShell exchanges={exchanges} onReset={reset}>
    <WayfarerApp
      key={resetKey}
      trip={trip}
      saved={saved}
      exchanges={exchanges}
      selections={selections}
      closedVenues={closedVenues}
      onCheck={checkMeal}
      onSelect={(meal, selection) => setSelections((current) => ({ ...current, [meal]: selection }))}
      onRemoveSave={(id) => setRemoved((current) => [...current, id])}
    />
  </DemoShell>
}
