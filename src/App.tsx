import { useMemo, useRef, useState } from 'react'
import { LIVE_CHAT_ENABLED } from './config'
import { HOST_PRODUCT_DATA } from './data/hostProductFixture'
import { SIMULATED_SALT_DATA } from './data/saltDemoFixture'
import { deriveTripFeasibility } from './domain/deriveTripFeasibility'
import type { MealId, RestaurantId } from './domain/demoTypes'
import { HowItWorks } from './features/howItWorks/HowItWorks'
import { Itinerary } from './features/itinerary/Itinerary'
import { SavedRestaurants } from './features/savedRestaurants/SavedRestaurants'
import './styles.css'

type Stage = 'initial' | 'checking' | 'results'
export default function App() {
  const [stage, setStage] = useState<Stage>('initial'); const [selections, setSelections] = useState<Partial<Record<MealId, RestaurantId>>>({}); const [showHow, setShowHow] = useState(false); const timer = useRef<number | undefined>(undefined)
  const feasibility = useMemo(() => deriveTripFeasibility([...HOST_PRODUCT_DATA.savedRestaurants], SIMULATED_SALT_DATA, [...HOST_PRODUCT_DATA.days]), [])
  const check = () => { setStage('checking'); timer.current = window.setTimeout(() => setStage('results'), 900) }
  const reset = () => { if (timer.current) clearTimeout(timer.current); setStage('initial'); setSelections({}); setShowHow(false) }
  const add = (meal: MealId, restaurant: RestaurantId) => setSelections((current) => current[meal] === restaurant ? { ...current, [meal]: undefined } : { ...current, [meal]: restaurant })
  return <><main><header className="topbar"><div className="brand">WAYFARER</div><div className="top-actions">{LIVE_CHAT_ENABLED && <button>Try SALT live</button>}<button className="reset" onClick={reset}>Reset demo</button></div></header>
    <section className="trip-context"><div><p className="prototype">Prototype customer experience</p><h1>{HOST_PRODUCT_DATA.trip.title}</h1><p className="trip-meta">{HOST_PRODUCT_DATA.trip.dates}<span aria-hidden="true">·</span>{HOST_PRODUCT_DATA.trip.travellers} travellers</p></div><div className="hotel"><span>Staying at</span><strong>{HOST_PRODUCT_DATA.trip.hotel}</strong><small>{HOST_PRODUCT_DATA.trip.neighbourhood}</small></div></section>
    <div className="layout"><div className="primary"><Itinerary days={[...HOST_PRODUCT_DATA.days]} feasibility={stage === 'results' ? feasibility : undefined} selections={selections} onAdd={add} />
      <section className={`check-panel ${stage}`} aria-live="polite"><div><strong>2 open meal times</strong><span>10 saved restaurants</span><p>{stage === 'checking' ? 'Checking your saved restaurants against your trip…' : stage === 'results' ? 'A few of your saved places could work for this trip.' : 'See which of your saves could work for the open meal times in this trip.'}</p></div>{stage !== 'results' && <button className="primary-button" onClick={check} disabled={stage === 'checking'}>{stage === 'checking' ? <><span className="spinner" />Checking…</> : 'Check my saved restaurants'}</button>}</section>
      {stage === 'results' && <footer className="salt-credit">Restaurant feasibility powered by SALT <button onClick={() => setShowHow(true)}>How this works</button></footer>}
    </div><SavedRestaurants restaurants={[...HOST_PRODUCT_DATA.savedRestaurants]} feasibility={stage === 'results' ? feasibility : undefined} selections={selections} onAdd={add} /></div>
  </main>{showHow && <HowItWorks onClose={() => setShowHow(false)} />}</>
}
