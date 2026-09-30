import { describe, expect, it } from 'vitest'
import { HOST_PRODUCT_DATA } from '../data/hostProductFixture'
import { SIMULATED_SALT_DATA } from '../data/saltDemoFixture'
import { deriveTripFeasibility } from './deriveTripFeasibility'

describe('deriveTripFeasibility', () => {
  const result = deriveTripFeasibility([...HOST_PRODUCT_DATA.savedRestaurants], SIMULATED_SALT_DATA, [...HOST_PRODUCT_DATA.days])
  it('keeps alternative times and excludes closed venues from options', () => {
    expect(result.optionsByMeal['saturday-dinner'].find((option) => option.restaurant.id === 'la-padrona')?.time).toBe('8:45 PM')
    expect(Object.values(result.optionsByMeal).flat().some((option) => option.restaurant.id === 'lucca')).toBe(false)
  })
  it('derives the trip-level insight outside the fixture', () => {
    expect(result.matchingInsight).toEqual({ restaurantId: 'zuma-boston', message: 'One available time matches your trip', detail: 'Saturday · 8:15 PM' })
  })
})
