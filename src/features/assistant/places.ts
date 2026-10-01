import { ADDRESS_POINTS } from '../../data/backBayMap'

// Places that share a street address share one map marker.
export function spotsFor<T>(items: T[], addressOf: (item: T) => string | undefined) {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const address = addressOf(item)
    if (!address || !ADDRESS_POINTS[address]) continue
    groups.set(address, [...(groups.get(address) ?? []), item])
  }
  return groups
}

// "48 GLOUCESTER ST, Boston, MA 02115" -> "48 Gloucester St"
export const streetAddress = (address = '') => address.split(',')[0].toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/ Av$/, ' Ave')
