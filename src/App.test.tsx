// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { SIMULATED_EXCHANGE_MS } from './salt/simulatedSalt'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers() })

const rail = () => screen.getByRole('complementary', { name: /SALT/ })
const mealCard = () => document.querySelector<HTMLElement>('.tl-item.is-meal')!
const answer = () => act(() => { vi.advanceTimersByTime(SIMULATED_EXCHANGE_MS) })
const intro = () => { act(() => { vi.advanceTimersByTime(1600) }); answer() }
const withSalt = () => screen.getByRole('button', { name: /With SALT/ })
const withoutSalt = () => screen.getByRole('button', { name: 'Without SALT' })

describe('the opening: Trip Planner without SALT, then with it', () => {
  it('starts without SALT, then switches it on and asks for Saturday dinner', () => {
    render(<App initialSource="simulated" />)
    expect(withoutSalt().getAttribute('aria-pressed')).toBe('true')
    expect(rail().textContent).toContain('Not connected')
    expect(within(mealCard()).getAllByText(/Check availability/).length).toBeGreaterThan(0)
    act(() => { vi.advanceTimersByTime(1600) })
    expect(withSalt().getAttribute('aria-pressed')).toBe('true')
    expect(within(rail()).getByText('waiting')).toBeTruthy()
    answer()
    expect(screen.getByRole('button', { name: 'Krasi at 7:30 PM' })).toBeTruthy()
    expect(within(mealCard()).queryByText(/Check availability/)).toBeNull()
    expect(mealCard().textContent).toContain('Closed permanently')
    expect(rail().textContent).toMatch(/AVAILABLE3.*ALTERNATIVE_TIMES5.*NONE_REPORTED1/)
    expect(rail().textContent).toContain('"America/New_York"')
  })

  it('shows the exact request and response for each call to SALT', () => {
    render(<App initialSource="simulated" />)
    intro()
    const latest = within(rail()).getByRole('article', { name: 'Sat dinner' })
    fireEvent.click(within(latest).getByRole('button', { name: 'Request' }))
    const request = JSON.parse(within(latest).getByLabelText('check_availability request').textContent!)
    expect(request).toEqual({ name: 'check_availability', arguments: { venue_ids: expect.any(Array), date: '2026-10-17', time: '19:30', party_size: 2 } })
    expect(request.arguments.venue_ids).toHaveLength(9)
    fireEvent.click(within(latest).getByRole('button', { name: 'Response' }))
    const response = JSON.parse(within(latest).getByLabelText('check_availability response').textContent!)
    expect(response.time_zone).toBe('America/New_York')
    expect(response.answers.find((a: { name: string }) => a.name === 'Krasi').times).toContain('2026-10-17T19:30:00-04:00')
  })

  it('keeps earlier calls one line each, including how the saves were linked', () => {
    render(<App initialSource="simulated" />)
    intro()
    fireEvent.click(within(rail()).getByRole('button', { name: 'Show earlier calls (1)' }))
    const linked = within(rail()).getByRole('article', { name: /Saves linked/ })
    fireEvent.click(within(linked).getByRole('button', { expanded: false }))
    expect(linked.textContent).toContain('search_venues× 10')
    expect(within(linked).getByRole('button', { name: /"Lucca Back Bay".*CLOSED_PERMANENTLY/ })).toBeTruthy()
  })

  it('highlights what SALT contributes, and can be switched off', () => {
    render(<App initialSource="simulated" />)
    intro()
    const app = document.querySelector('.tp')!
    expect(app.classList.contains('is-highlight')).toBe(true)
    expect(screen.getByText('Times from SALT')).toBeTruthy()
    expect(mealCard().querySelectorAll('[data-salt]').length).toBeGreaterThan(3)
    fireEvent.click(screen.getByRole('switch', { name: /Highlight/ }))
    expect(app.classList.contains('is-highlight')).toBe(false)
    expect(screen.queryByText('Times from SALT')).toBeNull()
  })

  it('switches back and forth at any time without losing the app state', () => {
    render(<App initialSource="simulated" />)
    intro()
    fireEvent.click(screen.getByRole('button', { name: 'Piattini at 7:45 PM' }))
    fireEvent.click(withoutSalt())
    expect(rail().textContent).toContain('Not connected')
    expect(screen.queryByRole('button', { name: /at 7:/ })).toBeNull()
    expect((screen.getByRole('switch', { name: /Highlight/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(withSalt())
    expect(within(mealCard()).getByText('Not booked')).toBeTruthy()
  })

  it('never names a source and frames responses as simulated', () => {
    render(<App initialSource="simulated" />)
    intro()
    expect(document.body.textContent).not.toMatch(/Google|OpenTable|Resy|provider showed/i)
    expect(screen.getByRole('button', { name: 'Simulated' }).getAttribute('aria-pressed')).toBe('true')
    expect(rail().textContent).toContain('Simulated responses')
  })
})

describe('using Trip Planner with SALT', () => {
  it('re-asks SALT when party size changes, and clears a choice made for the old question', () => {
    render(<App initialSource="simulated" />)
    intro()
    fireEvent.click(screen.getByRole('button', { name: 'Krasi at 7:30 PM' }))
    expect(document.activeElement?.textContent).toBe('Krasi')
    fireEvent.click(within(mealCard()).getByRole('button', { name: 'Change' }))
    fireEvent.change(screen.getByLabelText('Party size'), { target: { value: '4' } })
    expect(within(mealCard()).getByText('Checking tables')).toBeTruthy()
    answer()
    expect(screen.getByRole('button', { name: 'Krasi at 8:45 PM' })).toBeTruthy()
    expect(within(rail()).getAllByRole('article')[0].textContent).toContain('4')
  })

  it('shows when answers were checked, and offers a refresh once they age', () => {
    render(<App initialSource="simulated" />)
    intro()
    expect(mealCard().textContent).toContain('Checked just now')
    act(() => { vi.advanceTimersByTime(3.5 * 60000) })
    const refresh = within(mealCard()).getByRole('button', { name: /Checked 3 min ago.*Refresh/ })
    fireEvent.click(refresh)
    answer()
    expect(mealCard().textContent).toContain('Checked just now')
  })

  it('adds a choice without implying a booking, and hands off with the time it was checked', () => {
    render(<App initialSource="simulated" />)
    intro()
    fireEvent.click(screen.getByRole('button', { name: "Abe & Louie's at 8:45 PM" }))
    expect(within(mealCard()).getByText('Not booked')).toBeTruthy()
    expect(mealCard().textContent).not.toContain('Jazz set')
    fireEvent.click(within(mealCard()).getByRole('button', { name: /Reserve/ }))
    const sheet = screen.getByRole('dialog', { name: "Reserve Abe & Louie's" })
    expect(sheet.textContent).toContain('Book direct with the restaurant for the best experience')
    expect(sheet.textContent).not.toMatch(/nothing is booked|Demo ends/)
    const book = within(sheet).getByRole('link', { name: /Book direct with Abe & Louie's/ })
    expect(book.getAttribute('href')).toBe('https://abeandlouies.com/')
    expect(book.getAttribute('target')).toBe('_blank')
  })

  it('flags the closed save and lets the user remove it', () => {
    render(<App initialSource="simulated" />)
    intro()
    fireEvent.click(screen.getByRole('button', { name: 'Lucca Back Bay' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove from saved' }))
    expect(screen.queryByRole('button', { name: 'Lucca Back Bay' })).toBeNull()
  })

  it('asks SALT when a new day is opened, and resets to the opening', () => {
    render(<App initialSource="simulated" />)
    intro()
    fireEvent.click(screen.getByRole('tab', { name: /Sun/ }))
    expect(within(rail()).getByText('waiting')).toBeTruthy()
    answer()
    expect(screen.getByRole('button', { name: 'Saltie Girl at 1:00 PM' })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('tab', { name: /Sun/ }), { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: /Sat/ }).getAttribute('aria-selected')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(withoutSalt().getAttribute('aria-pressed')).toBe('true')
    expect(rail().textContent).toContain('Not connected')
  })
})

describe('saved intent, customer value and the assistant use case', () => {
  it('makes clear the places are the user’s own saves, not SALT’s', () => {
    render(<App initialSource="simulated" />)
    intro()
    expect(mealCard().textContent).toContain('From your 10 saved places')
    const saves = screen.getByRole('region', { name: /Your saved places/ })
    expect(saves.textContent).toContain('Saved from TikTok')
    expect(saves.textContent).toContain('Recommended by Alex')
    expect(saves.textContent).toContain('The user’s saves · not from SALT')
  })

  it('summarises what SALT changed, from the demo’s own data', () => {
    render(<App initialSource="simulated" />)
    expect(screen.getByText(/saved places to check by hand/).textContent).toContain('10')
    intro()
    expect(document.querySelector('.impact')!.textContent).toBe('1 request·8 with tables·1 closed caught')
  })

  it('explains SALT to product teams without claiming discovery or booking', () => {
    render(<App initialSource="simulated" />)
    fireEvent.click(screen.getByRole('button', { name: 'For product teams' }))
    const panel = screen.getByRole('dialog', { name: /saved places into plans/ })
    expect(panel.textContent).toContain('check_availability')
    expect(panel.textContent).toContain('doesn’t recommend restaurants or take bookings')
    fireEvent.keyDown(panel, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the same saves in an AI assistant, with and without SALT', () => {
    render(<App initialSource="simulated" />)
    intro()
    fireEvent.click(screen.getByRole('tab', { name: 'AI assistant' }))
    fireEvent.click(screen.getByRole('button', { name: /Can we get dinner/ }))
    expect(screen.getByText('Checking your saved places')).toBeTruthy()
    answer()
    expect(screen.getByText(/8 of your saved places have tables Saturday around 7:30 PM for 2/)).toBeTruthy()
    expect(screen.getByText('has closed permanently')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Show all 8' }))
    fireEvent.click(screen.getByRole('button', { name: 'Piattini at 7:45 PM' }))
    expect(screen.getByText(/Book direct with the restaurant to confirm your table/)).toBeTruthy()

    fireEvent.click(withoutSalt())
    expect(screen.getByText(/I can’t check whether restaurants are still open or have tables/)).toBeTruthy()
    expect(rail().textContent).toContain('Not connected')
  })

  it('asks SALT for pending assistant questions when SALT is switched on', () => {
    render(<App initialSource="simulated" />)
    fireEvent.click(screen.getByRole('tab', { name: 'AI assistant' }))
    fireEvent.click(withoutSalt())
    fireEvent.click(screen.getByRole('button', { name: /What about lunch on Sunday/ }))
    expect(screen.getByText(/you’ll need to check each one/)).toBeTruthy()
    fireEvent.click(withSalt())
    answer()
    expect(screen.getByRole('button', { name: 'Saltie Girl at 1:00 PM' })).toBeTruthy()
  })
})

describe('live mode', () => {
  const liveAnswer = (venue_ids: string[]) => ({
    date: '2026-10-17', time: '19:30', party_size: 2, time_zone: 'America/New_York',
    answers: venue_ids.map((venue_id) => ({ venue_id, name: venue_id, availability: 'AVAILABLE', times: ['2026-10-17T19:15:00-04:00', '2026-10-17T19:30:00-04:00', '2026-10-17T19:45:00-04:00', '2026-10-17T20:00:00-04:00'], checked_at: '2026-10-01T12:00:00Z' })),
  })
  const venue = (name: string, id: string, closed = false) => ({ save: name, venue: { venue_id: id, name, status: closed ? 'CLOSED_PERMANENTLY' : 'OPERATING', reservable: !closed, live_availability: !closed } })
  const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }) }

  it('links the saves through SALT, asks live, and shows the real answer', async () => {
    const names = ['Krasi', 'Piattini', "Abe & Louie's", 'Lucca Back Bay', 'Saltie Girl', 'Zuma Boston', 'The Banks', 'Asta', 'La Padrona', "Stephanie's on Newbury"]
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => url.endsWith('/venues')
        ? { venues: names.map((name, i) => venue(name, `ven_${i}`, name === 'Lucca Back Bay')) }
        : liveAnswer(JSON.parse(String(init!.body)).venue_ids),
    }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    expect(screen.getByRole('button', { name: 'Live' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText(/Live from SALT/)).toBeNull()
    act(() => { vi.advanceTimersByTime(0) })
    await flush(); await flush()
    act(() => { vi.advanceTimersByTime(1600) })
    await flush(); await flush()
    expect(screen.getByText(/Live from SALT’s MCP server/)).toBeTruthy()
    const body = JSON.parse(String(fetchMock.mock.calls.find(([url]) => url.endsWith('/availability'))![1]!.body))
    expect(body).toMatchObject({ date: '2026-10-17', time: '19:30', party_size: 2 })
    expect(body.venue_ids).toHaveLength(9)
    expect(screen.getByRole('button', { name: 'Krasi at 7:30 PM' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '1 more times for Krasi' })).toBeTruthy()
    expect(rail().textContent).toContain('Live responses')
    vi.unstubAllGlobals()
  })

  it('says so honestly when SALT can’t be reached, without falling back to sample data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Couldn’t reach SALT' }) })))
    render(<App />)
    act(() => { vi.advanceTimersByTime(0) })
    await flush(); await flush()
    act(() => { vi.advanceTimersByTime(1600) })
    await flush()
    expect(document.querySelector('.live-status')!.textContent).toContain('Couldn’t reach SALT')
    expect(rail().textContent).toContain('Not sent to SALT · Couldn’t reach SALT')
    expect(screen.queryByRole('button', { name: /at 7:30 PM/ })).toBeNull()
    vi.unstubAllGlobals()
  })
})

describe('saved place details respect the SALT switch', () => {
  it('shows no SALT times or closures without SALT', () => {
    render(<App initialSource="simulated" />)
    intro()
    fireEvent.click(withoutSalt())
    fireEvent.click(screen.getByRole('button', { name: 'Krasi' }))
    const sheet = screen.getByRole('dialog', { name: 'Krasi' })
    expect(within(sheet).queryAllByRole('button', { name: /at \d/ })).toHaveLength(0)
    expect(within(sheet).getByRole('link', { name: /Check availability with the restaurant/ }).getAttribute('href')).toBe('https://www.krasiboston.com/')
    fireEvent.keyDown(sheet, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Lucca Back Bay' }))
    expect(screen.getByRole('dialog', { name: 'Lucca Back Bay' }).textContent).not.toContain('Closed permanently')
  })

  it('shows SALT’s times again with SALT on', () => {
    render(<App initialSource="simulated" />)
    intro()
    fireEvent.click(screen.getByRole('button', { name: 'Krasi' }))
    expect(within(screen.getByRole('dialog', { name: 'Krasi' })).getAllByRole('button', { name: /Krasi at/ }).length).toBeGreaterThan(0)
  })
})


describe('the live assistant', () => {
  const flush = async () => { for (let i = 0; i < 4; i++) await act(async () => { await Promise.resolve(); await Promise.resolve() }) }
  const KRASI = { venue_id: 'ven_krasi', name: 'Krasi', address: '48 GLOUCESTER ST, Boston, MA 02115', status: 'OPERATING', reservable: true, live_availability: true }
  const SORELLINA = { venue_id: 'ven_sorellina', name: 'Sorellina', address: '226 NEWBURY ST, Boston, MA 02116', status: 'OPERATING', reservable: true, live_availability: false }
  const GONE = { venue_id: 'ven_gone', name: 'Gone Cafe', address: '190 NEWBURY ST, Boston, MA 02116', status: 'CLOSED_PERMANENTLY', reservable: null, live_availability: false }
  const setup = (directoryVenues?: unknown[]) => {
    const chat = vi.fn(() => ({
      text: 'Krasi has a table close to 7:30.',
      known_venue_ids: ['ven_krasi'],
      blocks: [{ type: 'availability', request: { venue_ids: ['ven_krasi'], date: '2026-10-17', time: '19:30', party_size: 2 }, response: { date: '2026-10-17', time: '19:30', party_size: 2, time_zone: 'America/New_York', answers: [{ venue_id: 'ven_krasi', name: 'Krasi', availability: 'AVAILABLE', times: ['2026-10-17T19:30:00-04:00', '2026-10-17T19:45:00-04:00'], checked_at: '2026-10-01T12:00:00Z' }] } }],
    }))
    const routes: Record<string, () => unknown> = {
      '/api/live/venues': () => ({ venues: [{ save: 'Krasi', venue: KRASI }] }),
      '/api/assistant/status': () => ({ configured: true, model: 'claude-opus-5-5', monthSpent: 0, monthlyUsd: 10, daySpent: 0, dailyUsd: 2 }),
      '/api/live/directory': () => ({ neighbourhood: 'Back Bay, Boston', total: 3, complete: true, venues: directoryVenues ?? [GONE, KRASI, SORELLINA] }),
      '/api/live/availability': () => ({ date: '2026-10-17', time: '19:30', party_size: 2, time_zone: 'America/New_York', answers: [] }),
      '/api/assistant/chat': chat,
      '/api/config': () => ({ googleMapsKey: null }),
    }
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => routes[url]() })))
    return chat
  }
  const openAssistant = async () => {
    render(<App />)
    act(() => { vi.advanceTimersByTime(0) })
    await flush()
    fireEvent.click(screen.getByRole('tab', { name: 'AI assistant' }))
    fireEvent.click(withSalt())
    await flush()
  }

  it('maps every open place SALT has, with a photo-led card for each', async () => {
    setup()
    await openAssistant()
    expect(screen.getByRole('button', { name: 'Krasi' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sorellina' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gone Cafe' })).toBeNull()
    expect(screen.getByPlaceholderText('Search 2 places in Back Bay')).toBeTruthy()
    expect(screen.queryByText(/What can SALT tell me/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Krasi' }))
    const card = within(screen.getByRole('dialog', { name: 'Place details' }))
    expect(card.getByText('48 Gloucester St')).toBeTruthy()
    expect(card.getByText('Takes reservations · Live tables')).toBeTruthy()
    expect(card.getByRole('button', { name: 'Check tables · Sat 7:30 PM · 2' })).toBeTruthy()
    expect(screen.queryByText(/Lorem ipsum/)).toBeNull()
    vi.unstubAllGlobals()
  })

  it('shows SALT filtering a closed suggestion out in the SALT panel, without calling the model', async () => {
    const chat = setup([
      { venue_id: 'ven_p', name: 'Piattini', address: '226 NEWBURY ST, Boston, MA 02116', status: 'OPERATING', reservable: true, live_availability: true },
      { venue_id: 'ven_s', name: 'Sorellina', address: '1 HUNTINGTON AV, Boston, MA 02116', status: 'OPERATING', reservable: true, live_availability: false },
      { venue_id: 'ven_l', name: 'Lucca Back Bay', address: '116 HUNTINGTON AV, Boston, MA 02116', status: 'CLOSED_PERMANENTLY', reservable: null, live_availability: false },
    ])
    await openAssistant()
    fireEvent.click(within(rail()).getByRole('button', { name: 'Run the demo' }))
    expect(within(rail()).getByText('Lucca Back Bay').closest('li')!.textContent).toContain('✕ filtered')
    act(() => { vi.advanceTimersByTime(2300) })
    expect(screen.getByText('Here are two ideas: Piattini and Sorellina.')).toBeTruthy()
    expect(screen.getByText(/SALT removed Lucca Back Bay: permanently closed/)).toBeTruthy()
    expect(chat).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('when an answer checks tables, shows only the places it checked, not the whole search', async () => {
    const chat = setup()
    chat.mockImplementation(() => ({
      text: 'Krasi has a table at 7:30.', known_venue_ids: [],
      blocks: [
        { type: 'venues', query: 'live tables', venues: [KRASI, SORELLINA] },
        { type: 'availability', request: { venue_ids: ['ven_krasi'], date: '2026-10-17', time: '19:30', party_size: 2 }, response: { date: '2026-10-17', time: '19:30', party_size: 2, time_zone: 'America/New_York', answers: [{ venue_id: 'ven_krasi', name: 'Krasi', availability: 'AVAILABLE', times: ['2026-10-17T19:30:00-04:00'], checked_at: '2026-10-01T12:00:00Z' }] } },
      ],
    }) as never)
    await openAssistant()
    fireEvent.change(screen.getByLabelText('Message Trip Assistant'), { target: { value: 'Where else on Saturday?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await flush()
    expect(screen.getByRole('button', { name: 'Krasi at 7:30 PM' })).toBeTruthy()
    expect(screen.queryByText(/2 places · live tables/)).toBeNull()
    expect(document.querySelectorAll('.vm-pill.is-hit')).toHaveLength(1)
    vi.unstubAllGlobals()
  })

  it('shows each SALT call the assistant’s tools made, with Trip Planner’s own tools labelled', async () => {
    const chat = setup()
    const call = (ids: string[], answers: unknown[]) => ({ tool: 'check_availability', arguments: { venue_ids: ids, date: '2026-10-16', time: '19:30', party_size: 2 }, result: { date: '2026-10-16', time: '19:30', party_size: 2, time_zone: 'America/New_York', answers }, at: '2026-10-01T12:00:00.000Z', ms: 640 })
    const answer = (venue_id: string, ok: boolean) => ({ venue_id, name: venue_id, availability: ok ? 'AVAILABLE' : 'NONE_REPORTED', times: ok ? ['2026-10-16T19:30:00-04:00'] : [], checked_at: '2026-10-01T12:00:00Z' })
    chat.mockImplementation(() => ({
      text: 'Three more near your hotel.', known_venue_ids: [], blocks: [],
      trace: [{ tool: 'more_tables', app: true, arguments: { date: '2026-10-16', time: '19:30', party_size: 2 }, note: 'Checked 4 places nearest the hotel; kept the 3 with tables', calls: [call(['a', 'b', 'c'], [answer('a', true), answer('b', false), answer('c', true)]), call(['d'], [answer('d', true)])] }],
    }) as never)
    await openAssistant()
    fireEvent.change(screen.getByLabelText('Message Trip Assistant'), { target: { value: 'Where else on Friday?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await flush()
    const entry = within(rail()).getByRole('article', { name: '“Where else on Friday?”' })
    expect(entry.textContent).toContain('Trip Planner toolmore_tables')
    expect(entry.textContent).toContain('kept the 3 with tables')
    expect(entry.textContent?.match(/check_availability640 ms/g)).toHaveLength(2)
    expect(entry.textContent).toMatch(/NONE_REPORTED1/)
    vi.unstubAllGlobals()
  })

  it('logs a place card’s table check in the SALT panel', async () => {
    setup()
    await openAssistant()
    fireEvent.click(screen.getByRole('button', { name: 'Krasi' }))
    fireEvent.click(screen.getByRole('button', { name: /Check tables/ }))
    await flush()
    expect(within(rail()).getByRole('article', { name: 'Krasi · place card' }).textContent).toContain('check_availability')
    vi.unstubAllGlobals()
  })

  it('without SALT, the map shows only the user’s own saves', async () => {
    setup()
    await openAssistant()
    fireEvent.click(withoutSalt())
    expect(screen.queryByRole('button', { name: 'Gone Cafe' })).toBeNull()
    expect(screen.getByText(/only knows your 10 saved places/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Krasi' })).toBeTruthy()
    vi.unstubAllGlobals()
  })

  it('sends the conversation to the server and shows SALT’s facts as cards', async () => {
    const chat = setup()
    await openAssistant()
    fireEvent.change(screen.getByLabelText('Message Trip Assistant'), { target: { value: 'Table at Krasi Saturday 7:30 for 2?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await flush()
    expect(chat).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Krasi has a table close to 7:30.')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'Krasi at 7:30 PM' }).length).toBeGreaterThan(0)
    fireEvent.click(withoutSalt())
    expect(screen.queryByText('Krasi has a table close to 7:30.')).toBeNull()
    expect(screen.queryByRole('button', { name: /Krasi at/ })).toBeNull()
    expect(screen.getByText(/This answer came from SALT/)).toBeTruthy()
    vi.unstubAllGlobals()
  })

  it('without SALT, answers from the saves alone and never calls the model', async () => {
    const chat = setup()
    await openAssistant()
    fireEvent.click(withoutSalt())
    fireEvent.change(screen.getByLabelText('Message Trip Assistant'), { target: { value: 'Table at Krasi Saturday?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    act(() => { vi.advanceTimersByTime(1000) })
    await flush()
    expect(chat).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Krasi at/ })).toBeNull()
    vi.unstubAllGlobals()
  })
})
