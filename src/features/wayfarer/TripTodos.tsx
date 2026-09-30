import type { MealId, MealSelection, OpenMeal, Todo, TripDay, VenueId } from '../../domain/types'
import { Icon } from './icons'

interface Props {
  todos: Todo[]
  meals: { day: TripDay; meal: OpenMeal }[]
  selections: Partial<Record<MealId, MealSelection>>
  placeName: (id: VenueId) => string
  onOpenMeal: (id: MealId) => void
}

export function TripTodos({ todos, meals, selections, placeName, onOpenMeal }: Props) {
  const [done, open] = [todos.filter((todo) => todo.done), todos.filter((todo) => !todo.done)]
  return <section className="side-block todos" aria-labelledby="todos-title">
    <h2 id="todos-title">Before you go</h2>
    <ul>
      {done.map((todo) => <li key={todo.id} className="todo is-done"><span className="todo-box"><Icon name="check" /></span>{todo.label}</li>)}
      {meals.map(({ day, meal }) => {
        const selection = selections[meal.id]
        return <li key={meal.id} className={`todo${selection ? ' is-planned' : ''}`}>
          <span className="todo-box" />
          <button className="todo-link" onClick={() => onOpenMeal(meal.id)}>
            {day.weekday} {meal.label.toLowerCase()}
            <small>{selection ? `${placeName(selection.venueId)} · reserve` : 'Plan'}</small>
          </button>
        </li>
      })}
      {open.map((todo) => <li key={todo.id} className="todo is-ambient"><span className="todo-box" />{todo.label}</li>)}
    </ul>
  </section>
}
