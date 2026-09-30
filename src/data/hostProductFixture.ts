import type { SavedRestaurant, TripDay } from '../domain/demoTypes'

export const HOST_PRODUCT_DATA = {
  trip: { title: 'Boston weekend', dates: 'Oct 16–19, 2026', travellers: 2, hotel: 'Fairmont Copley Plaza', neighbourhood: 'Back Bay' },
  days: [
    { day: 'Saturday', date: 'Oct 17', activities: [{ time: '9:00 AM', title: 'Freedom Trail' }, { time: '4:00 PM', title: 'Museum' }], openMeal: { id: 'saturday-dinner', label: 'Dinner', targetTime: '7:30 PM' }, mealPosition: 2 },
    { day: 'Sunday', date: 'Oct 18', activities: [{ time: '10:00 AM', title: 'Duck Boats' }, { time: '7:00 PM', title: 'Show' }], openMeal: { id: 'sunday-lunch', label: 'Lunch', targetTime: '1:00 PM' }, mealPosition: 1 },
  ] satisfies TripDay[],
  savedRestaurants: [
    ['krasi', 'Krasi', 'Saved from TikTok'], ['la-padrona', 'La Padrona', 'Recommended by AI'], ['saltie-girl', 'Saltie Girl', 'Saved by you'], ['zuma-boston', 'Zuma Boston', 'Recommended by a friend'], ['back-bay-social', 'Back Bay Social', 'Saved from TikTok'], ["stephanies", "Stephanie's On Newbury", 'Saved while browsing'], ['cafe-landwer', 'Cafe Landwer', 'Recommended by AI'], ['abe-louies', "Abe & Louie's", 'Recommended by a friend'], ['lpm', 'LPM Restaurant & Bar Boston', 'Saved by you'], ['lucca', 'Lucca Back Bay', 'Saved from TikTok'],
  ].map(([id, name, provenance]) => ({ id, name, provenance, neighbourhood: 'Back Bay' })) as SavedRestaurant[],
} as const
