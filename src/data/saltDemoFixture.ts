import type { SaltVenueResult } from '../domain/demoTypes'

// Deterministic prototype fixture. Lucca's status reflects the SALT canonical
// Boston snapshot used during prototype planning; none of this data is live.
export const SIMULATED_SALT_DATA: SaltVenueResult[] = [
  { restaurantId: 'krasi', operatingStatus: 'open', availability: { 'saturday-dinner': '7:30 PM' } },
  { restaurantId: 'la-padrona', operatingStatus: 'open', availability: { 'saturday-dinner': '8:45 PM' }, note: 'Alternative to the target time' },
  { restaurantId: 'saltie-girl', operatingStatus: 'open', availability: { 'sunday-lunch': '1:00 PM' } },
  { restaurantId: 'zuma-boston', operatingStatus: 'open', availability: { 'saturday-dinner': '8:15 PM' } },
  { restaurantId: 'back-bay-social', operatingStatus: 'open', availability: { 'sunday-lunch': '1:30 PM' } },
  { restaurantId: 'stephanies', operatingStatus: 'open', availability: {} },
  { restaurantId: 'cafe-landwer', operatingStatus: 'open', availability: { 'sunday-lunch': '12:45 PM' } },
  { restaurantId: 'abe-louies', operatingStatus: 'open', availability: { 'saturday-dinner': '7:45 PM' } },
  { restaurantId: 'lpm', operatingStatus: 'open', availability: {} },
  { restaurantId: 'lucca', operatingStatus: 'permanently-closed', availability: {} },
]
