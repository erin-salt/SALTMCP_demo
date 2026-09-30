import type { HostTrip } from '../domain/types'

// WAYFARER-owned data. In a real integration this lives in the host product.
export const WAYFARER_TRIP: HostTrip = {
  destination: 'Boston',
  dates: 'Fri 16 – Mon 19 Oct',
  partySize: 2,
  stay: { hotel: 'Fairmont Copley Plaza', area: 'Back Bay' },
  days: [
    {
      id: 'fri', weekday: 'Fri', day: '16', month: 'Oct', isoDate: '2026-10-16', openMeals: [],
      items: [
        { time: '6:40 PM', title: 'Land at Logan', detail: 'BOS · Terminal B', kind: 'travel' },
        { time: '8:00 PM', title: 'Check in', detail: 'Fairmont Copley Plaza', kind: 'stay' },
      ],
    },
    {
      id: 'sat', weekday: 'Sat', day: '17', month: 'Oct', isoDate: '2026-10-17',
      openMeals: [{ id: 'sat-dinner', label: 'Dinner', period: 'dinner', around: '7:30 PM' }],
      items: [
        { time: '9:00 AM', title: 'Freedom Trail walking tour', kind: 'activity' },
        { time: '4:00 PM', title: 'Museum of Fine Arts', kind: 'activity' },
        { time: '9:15 PM', title: 'Jazz set', detail: 'Tickets in Documents', kind: 'event' },
      ],
    },
    {
      id: 'sun', weekday: 'Sun', day: '18', month: 'Oct', isoDate: '2026-10-18',
      openMeals: [{ id: 'sun-lunch', label: 'Lunch', period: 'lunch', around: '1:00 PM' }],
      items: [
        { time: '10:00 AM', title: 'Duck boat tour', kind: 'activity' },
        { time: '7:00 PM', title: 'Theatre', detail: 'Tickets in Documents', kind: 'event' },
      ],
    },
    {
      id: 'mon', weekday: 'Mon', day: '19', month: 'Oct', isoDate: '2026-10-19', openMeals: [],
      items: [
        { time: '11:00 AM', title: 'Check out', kind: 'stay' },
        { time: '2:15 PM', title: 'Depart Logan', detail: 'BOS · Terminal B', kind: 'travel' },
      ],
    },
  ],
  todos: [
    { id: 'flights', label: 'Flights', done: true },
    { id: 'hotel', label: 'Hotel', done: true },
    { id: 'transfer', label: 'Airport transfer', done: false },
    { id: 'deposit', label: 'Walking tour deposit', done: false },
  ],
  saved: [
    { id: 'krasi', name: 'Krasi', source: 'tiktok' },
    { id: 'la-padrona', name: 'La Padrona', source: 'trip-chat' },
    { id: 'saltie-girl', name: 'Saltie Girl', source: 'you' },
    { id: 'zuma-boston', name: 'Zuma Boston', source: 'friend' },
    { id: 'back-bay-social', name: 'Back Bay Social', source: 'tiktok' },
    { id: 'stephanies', name: "Stephanie's on Newbury", source: 'browsing' },
    { id: 'cafe-landwer', name: 'Cafe Landwer', source: 'trip-chat' },
    { id: 'abe-louies', name: "Abe & Louie's", source: 'friend' },
    { id: 'lpm', name: 'LPM Restaurant & Bar', source: 'you' },
    { id: 'lucca', name: 'Lucca Back Bay', source: 'tiktok' },
  ],
}

export const SOURCE_LABEL: Record<HostTrip['saved'][number]['source'], string> = {
  tiktok: 'TikTok',
  you: 'Saved by you',
  friend: 'From a friend',
  'trip-chat': 'Trip chat',
  browsing: 'Browsing',
}
