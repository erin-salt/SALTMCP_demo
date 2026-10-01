import { describe, expect, it } from 'vitest'
import { HOST_TRIP } from '../data/hostProductFixture'
import { checkAvailability, searchVenues } from '../salt/simulatedSalt'
import { checkableVenueIds, planMeal, to24h, toMinutes } from './planMeal'

const venues = Object.fromEntries(HOST_TRIP.saved.map((p) => [p.id, searchVenues(p.name)]))
const ask = (date: string, time: string, party = 2) => checkAvailability({ venue_ids: checkableVenueIds(HOST_TRIP.saved, venues), date, time, party_size: party }, new Date('2026-10-01T23:30:00Z'))

describe('simulated SALT contract', () => {
  it('links every save to a SALT venue SALT can check live, except the closed one', () => {
    expect(Object.values(venues).every(Boolean)).toBe(true)
    const operating = Object.values(venues).filter((v) => v!.status === 'OPERATING')
    expect(operating).toHaveLength(9)
    expect(operating.every((v) => v!.live_availability)).toBe(true)
    expect(venues.lucca).toMatchObject({ status: 'CLOSED_PERMANENTLY', live_availability: false })
  })

  it('only asks about live venues, and answers in the five contract states', () => {
    const response = ask('2026-10-17', '19:30')
    expect(response.answers.map((a) => [a.name, a.availability])).toEqual([
      ['Krasi', 'AVAILABLE'], ['Piattini', 'ALTERNATIVE_TIMES'], ["Abe & Louie's", 'ALTERNATIVE_TIMES'], ['Saltie Girl', 'NONE_REPORTED'],
      ['Zuma Boston', 'ALTERNATIVE_TIMES'], ['The Banks Seafood and Steak', 'AVAILABLE'], ['Asta', 'ALTERNATIVE_TIMES'],
      ['La Padrona Boston', 'ALTERNATIVE_TIMES'], ["Stephanie's On Newbury", 'AVAILABLE'],
    ])
    expect(response.answers.map((a) => a.venue_id)).not.toContain('ven_9d16b22dc9bc5670')
    expect(response.answers.every((a) => a.checked_at === '2026-10-01T23:30:00.000Z')).toBe(true)
    expect(response).toMatchObject({ date: '2026-10-17', time: '19:30', party_size: 2, time_zone: 'America/New_York' })
  })

  it('answers for the requested party and time', () => {
    const times = (time: string, party: number) => Object.fromEntries(ask('2026-10-17', time, party).answers.map((a) => [a.name, a.times]))
    expect(times('19:30', 4)).toMatchObject({ Krasi: ['8:45 PM'], "Abe & Louie's": ['7:15 PM', '8:30 PM'] })
    expect(ask('2026-10-17', '19:30', 6).answers.find((a) => a.name === 'Zuma Boston')?.availability).toBe('UNKNOWN')
  })
})

describe('planMeal (host derivation)', () => {
  it('keeps every save, in saved order, with what SALT said about it', () => {
    const plan = planMeal(HOST_TRIP.saved, venues, ask('2026-10-17', '19:30'))
    expect(plan.rows.map((r) => [r.place.id, r.state.kind])).toEqual([
      ['krasi', 'times'], ['piattini', 'times'], ['abe-louies', 'times'], ['lucca', 'closed'], ['saltie-girl', 'none-reported'],
      ['zuma-boston', 'times'], ['the-banks', 'times'], ['asta', 'times'], ['la-padrona', 'times'], ['stephanies', 'times'],
    ])
  })

  it('converts between host and contract time formats', () => {
    expect(to24h('7:30 PM')).toBe('19:30')
    expect(toMinutes('19:30')).toBe(toMinutes('7:30 PM'))
  })
})
