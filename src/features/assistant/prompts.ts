import type { AvailabilityResponse, MealSelection } from '../../domain/types'

// What the user asks the fictional assistant. Scripted, so the demo stays
// deterministic.
export interface Prompt { id: string; text: string; dayId: string; meal: 'dinner' | 'lunch'; partySize: number; time: string }
export interface Turn { id: string; prompt: Prompt; checking?: boolean; response?: AvailabilityResponse; choice?: MealSelection }

export const PROMPTS: Prompt[] = [
  { id: 'sat-2', text: 'Can we get dinner at one of my saved places on Saturday around 7:30? There are 2 of us.', dayId: 'sat', meal: 'dinner', partySize: 2, time: '7:30 PM' },
  { id: 'sun-2', text: 'What about lunch on Sunday around 1?', dayId: 'sun', meal: 'lunch', partySize: 2, time: '1:00 PM' },
  { id: 'sat-4', text: 'Saturday dinner again, but for 4 people.', dayId: 'sat', meal: 'dinner', partySize: 4, time: '7:30 PM' },
]
