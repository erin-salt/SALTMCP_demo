import type { LiveVenue } from '../../salt/assistantClient'

// Demo only: what happens when a travel app's own AI suggests three places
// and one of them has closed. The suggestions are Trip Planner's (scripted);
// the check is SALT's real record for each venue. A fixed rotation, so every
// run of the demo tells the same, verified story.
export interface ScenarioDef { id: string; title: string; ask: string; places: [string, string, string]; closed: string }
export interface Scenario { def: ScenarioDef; venues: LiveVenue[]; closedId: string }

export const SCENARIOS: ScenarioDef[] = [
  { id: 'copley', title: 'Saturday dinner near Copley', ask: 'Suggest somewhere for Saturday dinner near Copley Square', places: ["Abe & Louie's", 'The Capital Grille', "Del Frisco's Double Eagle Steakhouse"], closed: "Del Frisco's Double Eagle Steakhouse" },
  { id: 'seafood', title: 'A seafood night', ask: 'Where should we go for seafood one night?', places: ['Atlantic Fish Company', 'Legal Sea Foods - Copley Place', "Eddie V's Prime Seafood"], closed: "Eddie V's Prime Seafood" },
  { id: 'saves', title: 'Italian from your saves', ask: 'Pick an Italian place for us, ideally one I saved', places: ['Piattini', 'Sorellina', 'Lucca Back Bay'], closed: 'Lucca Back Bay' },
  { id: 'newbury', title: 'Lunch on Newbury Street', ask: 'Ideas for lunch on Newbury Street?', places: ["Stephanie's On Newbury", 'The Capital Burger', 'Double Zero'], closed: 'Double Zero' },
]

// The scenario with SALT's records for its three venues, or undefined if
// SALT's directory doesn't have them all (or no longer says the closed one is closed).
export function resolveScenario(def: ScenarioDef, venues: LiveVenue[]): Scenario | undefined {
  const found = def.places.map((name) => venues.find((v) => v.name === name))
  if (found.some((v) => !v)) return undefined
  const closed = found.find((v) => v!.name === def.closed)!
  if (!closed.status.startsWith('CLOSED')) return undefined
  // Shuffle the closed one into the middle so it isn't always last.
  const list = found as LiveVenue[]
  return { def, venues: [list[0], list[2], list[1]], closedId: closed.venue_id }
}
