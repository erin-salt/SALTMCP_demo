// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { SIMULATED_EXCHANGE_MS } from './salt/simulatedSalt'

beforeEach(() => { vi.useFakeTimers(); Element.prototype.scrollIntoView = vi.fn() })
afterEach(() => { cleanup(); vi.useRealTimers() })

const slot = (name: string) => screen.getByRole('listitem', { name })
const rail = () => screen.getByRole('complementary', { name: /SALT/ })
const savedList = () => screen.getByRole('region', { name: /Saved in Boston/ })
const check = (name: string) => {
  fireEvent.click(within(slot(name)).getByRole('button', { name: 'Choose from saved' }))
  act(() => { vi.advanceTimersByTime(SIMULATED_EXCHANGE_MS) })
}

describe('SALT inside Wayfarer', () => {
  it('frames Wayfarer as the host and keeps SALT idle until the host asks', () => {
    render(<App />)
    expect(screen.getByText('Travel planning')).toBeTruthy()
    expect(screen.getByText('Simulated')).toBeTruthy()
    expect(within(rail()).getByText('No requests yet')).toBeTruthy()
    expect(within(savedList()).getByText('Lucca Back Bay')).toBeTruthy()
    expect(within(savedList()).queryByText('Closed permanently')).toBeNull()
  })

  it('checks one meal, shows what crossed the boundary, and derives host notes', () => {
    render(<App />)
    fireEvent.click(within(slot('Sat dinner')).getByRole('button', { name: 'Choose from saved' }))
    expect(within(slot('Sat dinner')).getByRole('status').textContent).toContain('Checking 10 saved places for 2')
    expect(within(rail()).getByText('Checking venues')).toBeTruthy()
    act(() => { vi.advanceTimersByTime(SIMULATED_EXCHANGE_MS) })

    const options = within(slot('Sat dinner')).getByRole('list', { name: 'Sat dinner options' })
    expect(within(options).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Krasi at 7:30 PM', 'Krasi at 8:00 PM', "Abe & Louie's at 7:15 PM", 'Zuma Boston at 8:15 PM', 'Zuma Boston at 8:45 PM'])
    expect(options.textContent).toContain('8:45 PM is 30 min before Jazz set')
    expect(slot('Sat dinner').textContent).not.toMatch(/no availability/i)
    expect(options.textContent).not.toMatch(/TikTok|friend|Trip chat/)

    expect(rail().textContent).toContain('3 times observed for 2')
    expect(rail().textContent).toContain('1 closed permanently')
    expect(rail().textContent).toContain('6 no times observed')
    expect(rail().textContent).toContain('2 provider showed no tables')
    expect(rail().textContent).toContain('Orders by closeness to 7:30 PM')

    expect(within(slot('Sat dinner')).queryByRole('list', { name: 'Other saves' })).toBeNull()
    fireEvent.click(within(slot('Sat dinner')).getByRole('button', { name: /7 other saves/ }))
    const others = within(slot('Sat dinner')).getByRole('list', { name: 'Other saves' })
    expect(within(others).getAllByRole('listitem')).toHaveLength(7)
    expect(others.textContent).toContain('Provider showed no tables 6:30–8:30 PM')
    expect(others.textContent).toContain('Closed permanently')
    expect(within(slot('Sun lunch')).getByRole('button', { name: 'Choose from saved' })).toBeTruthy()
  })

  it('adds a choice without implying a booking, and hands off to a provider', () => {
    render(<App />)
    check('Sat dinner')
    fireEvent.click(screen.getByRole('button', { name: 'Krasi at 7:30 PM' }))
    expect(within(slot('Sat dinner')).getByText('Not booked')).toBeTruthy()
    expect(within(savedList()).getByText('Sat dinner · 7:30 PM')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Sat dinner\s*Krasi · reserve/ })).toBeTruthy()

    fireEvent.click(within(slot('Sat dinner')).getByRole('button', { name: /Reserve/ }))
    const sheet = screen.getByRole('dialog', { name: 'Reserve Krasi' })
    expect(sheet.textContent).toContain('Until then, nothing is booked')
    expect((within(sheet).getByRole('button', { name: /Continue to provider/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Back to trip' }))

    fireEvent.click(within(slot('Sat dinner')).getByRole('button', { name: 'Change' }))
    fireEvent.click(screen.getByRole('button', { name: 'Zuma Boston at 8:45 PM' }))
    expect(slot('Sat dinner').textContent).toContain('30 min before Jazz set')
    fireEvent.click(within(slot('Sat dinner')).getByRole('button', { name: 'Remove' }))
    expect(within(slot('Sat dinner')).getByRole('list', { name: 'Sat dinner options' })).toBeTruthy()
  })

  it('quietly flags a closed save, lets the user remove it, and resets cleanly', () => {
    render(<App />)
    check('Sat dinner')
    const lucca = within(savedList()).getByText('Lucca Back Bay').closest('li')!
    expect(within(lucca).getByText('Closed permanently')).toBeTruthy()
    fireEvent.click(within(lucca).getByRole('button', { name: 'Remove Lucca Back Bay from saved' }))
    expect(within(savedList()).queryByText('Lucca Back Bay')).toBeNull()

    check('Sun lunch')
    expect(within(rail()).getByRole('article', { name: 'Sun 18 Oct · Lunch' }).textContent).toContain('9 saved venues')

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(within(rail()).getByText('No requests yet')).toBeTruthy()
    expect(within(savedList()).getByText('Lucca Back Bay')).toBeTruthy()
  })
})
