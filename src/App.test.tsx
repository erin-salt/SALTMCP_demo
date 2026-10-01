// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { SIMULATED_EXCHANGE_MS } from './salt/simulatedSalt'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers() })

const layers = () => [...document.querySelectorAll<HTMLElement>('.compare-layer')]
const rail = () => screen.getByRole('complementary', { name: /SALT/ })
const mealCard = () => document.querySelector<HTMLElement>('.tl-item.is-meal')!
const answer = () => act(() => { vi.advanceTimersByTime(SIMULATED_EXCHANGE_MS) })
const explore = () => { answer(); fireEvent.click(screen.getByRole('button', { name: /Try it/ })) }
const rowNames = (root: ParentNode) => [...root.querySelectorAll('.meal-row-name')].map((el) => el.firstChild?.textContent)

describe('compare: availability is a request, not a given', () => {
  it('opens with Trip Planner asking SALT, then reveals the answer', () => {
    render(<App />)
    expect(within(rail()).getByText('waiting')).toBeTruthy()
    expect(rail().textContent).toContain('check_availability')
    expect(rail().textContent).toContain('search_venues')
    answer()
    const [before, after] = layers()
    expect(within(before).getAllByText(/Check availability/)).toHaveLength(5)
    expect(within(after).getByRole('button', { name: 'Krasi at 7:30 PM' })).toBeTruthy()
    expect(after.textContent).toContain('Checked just now')
    expect(after.textContent).toContain('Closed permanently')
    expect(after.textContent).toContain('No tables offered around then')
    expect(within(after).getAllByText(/Check availability/)).toHaveLength(1)
    expect(rowNames(after)).toEqual(rowNames(before))
    expect(rail().textContent).toMatch(/AVAILABLE1.*ALTERNATIVE_TIMES2.*NONE_REPORTED1/)
  })

  it('never names a source and frames responses as simulated', () => {
    render(<App />)
    answer()
    expect(document.body.textContent).not.toMatch(/Google|OpenTable|Resy|provider showed/i)
    expect(screen.getByText(/Real contract/, { selector: '.shell-sample' })).toBeTruthy()
  })
})

describe('explore: the host app with SALT', () => {
  it('re-asks SALT when party size changes, and clears a choice made for the old question', () => {
    render(<App />)
    explore()
    fireEvent.click(screen.getByRole('button', { name: 'Krasi at 7:30 PM' }))
    expect(document.activeElement?.textContent).toBe('Krasi')
    fireEvent.click(within(mealCard()).getByRole('button', { name: 'Change' }))
    fireEvent.change(screen.getByLabelText('Party size'), { target: { value: '4' } })
    expect(within(mealCard()).getByText('Checking tables')).toBeTruthy()
    answer()
    expect(screen.getByRole('button', { name: 'Krasi at 8:45 PM' })).toBeTruthy()
    expect(within(rail()).getAllByRole('article')[0].textContent).toContain('4')
  })

  it('shows when answers were checked, and offers to check again once they age', () => {
    render(<App />)
    explore()
    expect(mealCard().textContent).toContain('Checked just now')
    act(() => { vi.advanceTimersByTime(3.5 * 60000) })
    expect(mealCard().textContent).toContain('Checked 3 min ago')
    fireEvent.click(within(mealCard()).getByRole('button', { name: 'Check again' }))
    answer()
    expect(mealCard().textContent).toContain('Checked just now')
  })

  it('adds a choice without implying a booking, and hands off with the time it was checked', () => {
    render(<App />)
    explore()
    fireEvent.click(screen.getByRole('button', { name: "Abe & Louie's at 8:45 PM" }))
    expect(within(mealCard()).getByText('Not booked')).toBeTruthy()
    expect(mealCard().textContent).toContain('30 min before Jazz set')
    fireEvent.click(within(mealCard()).getByRole('button', { name: /Reserve/ }))
    const sheet = screen.getByRole('dialog', { name: "Reserve Abe & Louie's" })
    expect(sheet.textContent).toMatch(/offered when checked at .*Until then, nothing is booked/)
    expect((within(sheet).getByRole('button', { name: /Continue to provider/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('falls back honestly for venues SALT cannot check live', () => {
    render(<App />)
    explore()
    fireEvent.click(screen.getByRole('button', { name: 'Sorellina' }))
    expect(screen.getByRole('dialog', { name: 'Sorellina' }).textContent).toContain('can’t be checked in Trip Planner yet')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.click(within(mealCard()).getByRole('button', { name: /See all 10/ }))
    expect(rowNames(mealCard())).toHaveLength(10)
  })

  it('asks SALT when a new day is opened, and resets cleanly', () => {
    render(<App />)
    explore()
    fireEvent.click(screen.getByRole('tab', { name: /Sun/ }))
    expect(within(rail()).getByText('waiting')).toBeTruthy()
    answer()
    expect(screen.getByRole('button', { name: 'Saltie Girl at 1:00 PM' })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('tab', { name: /Sun/ }), { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: /Sat/ }).getAttribute('aria-selected')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('slider')).toBeTruthy()
    expect(within(rail()).getAllByRole('article', { name: /check_availability/ })).toHaveLength(1)
  })
})
