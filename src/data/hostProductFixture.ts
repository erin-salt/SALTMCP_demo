import type { HostTrip, SaveSource } from '../domain/types'

// Host-owned data for a fictional travel app. In a real integration this lives
// in the customer's product. Weather, walking times and map positions are
// illustrative host content, not SALT output.
export const HOST_TRIP: HostTrip = {
  title: 'Boston weekend',
  destination: 'Boston',
  dates: 'Fri 16 – Mon 19 Oct',
  partySize: 2,
  travellers: [{ initials: 'JM', name: 'You' }, { initials: 'AK', name: 'Alex' }],
  stay: { hotel: 'Fairmont Copley Plaza', area: 'Back Bay', at: { x: 55, y: 64 } },
  days: [
    {
      id: 'fri', weekday: 'Fri', day: '16', month: 'Oct', isoDate: '2026-10-16', weather: { temp: '15°', sky: 'cloud' }, openMeals: [],
      items: [
        { time: '6:40 PM', title: 'Land at Logan', detail: 'BOS · Terminal B', kind: 'travel', confirmed: true },
        { time: '8:00 PM', title: 'Check in', detail: 'Fairmont Copley Plaza', kind: 'stay', confirmed: true },
      ],
    },
    {
      id: 'sat', weekday: 'Sat', day: '17', month: 'Oct', isoDate: '2026-10-17', weather: { temp: '17°', sky: 'sun' },
      openMeals: [{ id: 'sat-dinner', label: 'Dinner', period: 'dinner', around: '7:30 PM', timeChoices: ['7:00 PM', '7:30 PM', '8:00 PM'] }],
      items: [
        { time: '9:00 AM', title: 'Freedom Trail walking tour', detail: 'Meet at Boston Common', kind: 'activity', confirmed: true, at: { x: 90, y: 38 } },
        { time: '4:00 PM', title: 'Museum of Fine Arts', detail: '2 tickets', kind: 'activity', confirmed: true, at: { x: 12, y: 90 } },
        { time: '9:15 PM', title: 'Jazz set', detail: 'Tickets in Documents', kind: 'event', confirmed: true, at: { x: 38, y: 84 } },
      ],
    },
    {
      id: 'sun', weekday: 'Sun', day: '18', month: 'Oct', isoDate: '2026-10-18', weather: { temp: '14°', sky: 'rain' },
      openMeals: [{ id: 'sun-lunch', label: 'Lunch', period: 'lunch', around: '1:00 PM', timeChoices: ['12:30 PM', '1:00 PM', '1:30 PM'] }],
      items: [
        { time: '10:00 AM', title: 'Duck boat tour', detail: 'Departs Prudential Center', kind: 'activity', confirmed: true, at: { x: 40, y: 70 } },
        { time: '7:00 PM', title: 'Theatre', detail: 'Tickets in Documents', kind: 'event', confirmed: true, at: { x: 84, y: 76 } },
      ],
    },
    {
      id: 'mon', weekday: 'Mon', day: '19', month: 'Oct', isoDate: '2026-10-19', weather: { temp: '13°', sky: 'cloud' }, openMeals: [],
      items: [
        { time: '11:00 AM', title: 'Check out', kind: 'stay', confirmed: true },
        { time: '2:15 PM', title: 'Depart Logan', detail: 'BOS · Terminal B', kind: 'travel', confirmed: true },
      ],
    },
  ],
  // Order is the order the user saved them in.
  saved: [
    { id: 'krasi', name: 'Krasi', source: 'tiktok', walkMin: 9, at: { x: 44, y: 44 } },
    { id: 'abe-louies', name: "Abe & Louie's", source: 'friend', walkMin: 6, at: { x: 34, y: 52 } },
    { id: 'zuma-boston', name: 'Zuma Boston', source: 'friend', walkMin: 4, at: { x: 60, y: 58 } },
    { id: 'lucca', name: 'Lucca Back Bay', source: 'tiktok', walkMin: 7, at: { x: 36, y: 60 } },
    { id: 'saltie-girl', name: 'Saltie Girl', source: 'you', walkMin: 6, at: { x: 52, y: 40 } },
    { id: 'la-padrona', name: 'La Padrona', source: 'trip-chat', walkMin: 14, at: { x: 78, y: 86 } },
    { id: 'back-bay-social', name: 'Back Bay Social', source: 'tiktok', walkMin: 5, at: { x: 46, y: 54 } },
    { id: 'stephanies', name: "Stephanie's on Newbury", source: 'browsing', walkMin: 5, at: { x: 58, y: 46 } },
    { id: 'cafe-landwer', name: 'Cafe Landwer', source: 'trip-chat', walkMin: 8, at: { x: 26, y: 58 } },
    { id: 'lpm', name: 'LPM Restaurant & Bar', source: 'you', walkMin: 11, at: { x: 70, y: 74 } },
  ],
}

export const SOURCE_LABEL: Record<SaveSource, string> = {
  tiktok: 'TikTok',
  you: 'Saved by you',
  friend: 'From Alex',
  'trip-chat': 'Trip chat',
  browsing: 'Browsing',
}
