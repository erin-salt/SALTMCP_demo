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
    render(<App />)
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
    expect(rail().textContent).not.toContain('AVAILABLE')
    fireEvent.click(within(rail()).getByRole('button', { name: 'Show MCP calls' }))
    expect(rail().textContent).toMatch(/AVAILABLE3.*ALTERNATIVE_TIMES5.*NONE_REPORTED1/)
    expect(rail().textContent).toContain('search_venues')
  })

  it('highlights what SALT contributes, and can be switched off', () => {
    render(<App />)
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
    render(<App />)
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
    render(<App />)
    intro()
    expect(document.body.textContent).not.toMatch(/Google|OpenTable|Resy|provider showed/i)
    expect(screen.getByText(/Real contract/, { selector: '.shell-sample' })).toBeTruthy()
  })
})

describe('using Trip Planner with SALT', () => {
  it('re-asks SALT when party size changes, and clears a choice made for the old question', () => {
    render(<App />)
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
    render(<App />)
    intro()
    expect(mealCard().textContent).toContain('Checked just now')
    act(() => { vi.advanceTimersByTime(3.5 * 60000) })
    const refresh = within(mealCard()).getByRole('button', { name: /Checked 3 min ago.*Refresh/ })
    fireEvent.click(refresh)
    answer()
    expect(mealCard().textContent).toContain('Checked just now')
  })

  it('adds a choice without implying a booking, and hands off with the time it was checked', () => {
    render(<App />)
    intro()
    fireEvent.click(screen.getByRole('button', { name: "Abe & Louie's at 8:45 PM" }))
    expect(within(mealCard()).getByText('Not booked')).toBeTruthy()
    expect(mealCard().textContent).not.toContain('Jazz set')
    fireEvent.click(within(mealCard()).getByRole('button', { name: /Reserve/ }))
    const sheet = screen.getByRole('dialog', { name: "Reserve Abe & Louie's" })
    expect(sheet.textContent).toMatch(/offered when checked at .*Until then, nothing is booked/)
    expect((within(sheet).getByRole('button', { name: /Continue to provider/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('flags the closed save and lets the user remove it', () => {
    render(<App />)
    intro()
    fireEvent.click(screen.getByRole('button', { name: 'Lucca Back Bay' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove from saved' }))
    expect(screen.queryByRole('button', { name: 'Lucca Back Bay' })).toBeNull()
  })

  it('asks SALT when a new day is opened, and resets to the opening', () => {
    render(<App />)
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
    render(<App />)
    intro()
    expect(mealCard().textContent).toContain('From your 10 saved places')
    const saves = screen.getByRole('region', { name: /Your saved places/ })
    expect(saves.textContent).toContain('Saved from TikTok')
    expect(saves.textContent).toContain('Recommended by Alex')
    expect(saves.textContent).toContain('The user’s saves · not from SALT')
  })

  it('summarises what SALT changed, from the demo’s own data', () => {
    render(<App />)
    expect(screen.getByText(/saved places to check by hand/).textContent).toContain('10')
    intro()
    expect(document.querySelector('.impact')!.textContent).toBe('1 request·8 with tables·1 closed caught')
  })

  it('explains SALT to product teams without claiming discovery or booking', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'For product teams' }))
    const panel = screen.getByRole('dialog', { name: /saved places into plans/ })
    expect(panel.textContent).toContain('check_availability')
    expect(panel.textContent).toContain('doesn’t recommend restaurants or take bookings')
    fireEvent.keyDown(panel, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the same saves in an AI assistant, with and without SALT', () => {
    render(<App />)
    intro()
    fireEvent.click(screen.getByRole('tab', { name: 'AI assistant' }))
    fireEvent.click(screen.getByRole('button', { name: /Can we get dinner/ }))
    expect(screen.getByText('Checking your saved places')).toBeTruthy()
    answer()
    expect(screen.getByText(/8 of your saved places have tables Saturday around 7:30 PM for 2/)).toBeTruthy()
    expect(screen.getByText('has closed permanently')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Show all 8' }))
    fireEvent.click(screen.getByRole('button', { name: 'Piattini at 7:45 PM' }))
    expect(screen.getByText(/It isn’t booked yet/)).toBeTruthy()

    fireEvent.click(withoutSalt())
    expect(screen.getByText(/I can’t check whether restaurants are still open or have tables/)).toBeTruthy()
    expect(rail().textContent).toContain('Not connected')
  })

  it('asks SALT for pending assistant questions when SALT is switched on', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'AI assistant' }))
    fireEvent.click(withoutSalt())
    fireEvent.click(screen.getByRole('button', { name: /What about lunch on Sunday/ }))
    expect(screen.getByText(/you’ll need to check each one/)).toBeTruthy()
    fireEvent.click(withSalt())
    answer()
    expect(screen.getByRole('button', { name: 'Saltie Girl at 1:00 PM' })).toBeTruthy()
  })
})
