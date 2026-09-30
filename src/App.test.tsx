// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { SIMULATED_EXCHANGE_MS } from './salt/simulatedSalt'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { cleanup(); vi.useRealTimers() })

const layers = () => [...document.querySelectorAll<HTMLElement>('.compare-layer')]
const rail = () => screen.getByRole('complementary', { name: /SALT/ })
const explore = () => fireEvent.click(screen.getByRole('button', { name: /Try it/ }))
const mealCard = () => document.querySelector<HTMLElement>('.tl-item.is-meal')!

describe('compare: the same trip without and with SALT', () => {
  it('opens on a split view of a clearly fictional host app', () => {
    render(<App />)
    act(() => { vi.advanceTimersByTime(500) })
    expect(screen.getByRole('slider', { name: 'Compare without and with SALT' })).toBeTruthy()
    const [before, after] = layers()
    expect(before.textContent).toContain('Fictional app')
    expect(within(before).getAllByText(/Check availability/)).toHaveLength(4)
    expect(before.textContent).not.toContain('Closed permanently')
    expect(within(after).queryByText(/Check availability/)).toBeNull()
    expect(within(after).getByRole('button', { name: 'Krasi at 7:30 PM' })).toBeTruthy()
    expect(within(after).getAllByText('Closed permanently').length).toBeGreaterThan(0)
    expect(screen.getByText('Simulated')).toBeTruthy()
  })

  it('shows the same saves, in the same order, on both sides', () => {
    render(<App />)
    const names = (layer: HTMLElement) => [...layer.querySelectorAll('.meal-row-name')].map((el) => el.firstChild?.textContent)
    const [before, after] = layers()
    expect(names(after)).toEqual(names(before))
  })

  it('moves with the keyboard', () => {
    render(<App />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(slider.getAttribute('aria-valuenow')).toBe('100')
  })
})

describe('explore: the host app with SALT', () => {
  it('adds a choice without implying a booking, and hands off to a provider', () => {
    render(<App />)
    explore()
    fireEvent.click(screen.getByRole('button', { name: 'Zuma Boston at 8:45 PM' }))
    expect(within(mealCard()).getByText('Not booked')).toBeTruthy()
    expect(mealCard().textContent).toContain('30 min before Jazz set')
    expect(screen.getByText('Sat dinner · 8:45 PM')).toBeTruthy()

    fireEvent.click(within(mealCard()).getByRole('button', { name: /Reserve/ }))
    const sheet = screen.getByRole('dialog', { name: 'Reserve Zuma Boston' })
    expect(sheet.textContent).toContain('Until then, nothing is booked')
    expect((within(sheet).getByRole('button', { name: /Continue to provider/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(within(sheet).getByRole('button', { name: 'Back to trip' }))
    fireEvent.click(within(mealCard()).getByRole('button', { name: 'Remove' }))
    expect(within(mealCard()).getByRole('list', { name: 'Dinner options' })).toBeTruthy()
  })

  it('keeps honest secondary states one click away', () => {
    render(<App />)
    explore()
    expect(within(mealCard()).queryByRole('list', { name: 'Other saves' })).toBeNull()
    fireEvent.click(within(mealCard()).getByRole('button', { name: /6 more saves/ }))
    const others = within(mealCard()).getByRole('list', { name: 'Other saves' })
    expect(others.textContent).toContain('Provider showed no tables 6:30–8:30 PM')
    expect(others.textContent).not.toMatch(/no availability/i)
  })

  it('asks SALT when a new day is opened, and logs the exchange', () => {
    render(<App />)
    explore()
    fireEvent.click(screen.getByRole('tab', { name: /Sun/ }))
    expect(within(rail()).getByText('Checking')).toBeTruthy()
    act(() => { vi.advanceTimersByTime(SIMULATED_EXCHANGE_MS) })
    expect(screen.getByRole('button', { name: 'Saltie Girl at 1:00 PM' })).toBeTruthy()
    expect(within(rail()).getByRole('article', { name: 'Sun lunch' }).textContent).toContain('3 with times · 1 closed')

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('slider')).toBeTruthy()
    expect(within(rail()).queryByRole('article', { name: 'Sun lunch' })).toBeNull()
  })
})
