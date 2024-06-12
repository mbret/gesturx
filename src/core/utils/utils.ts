import {
  NEVER,
  Observable,
  filter,
  merge,
} from "rxjs"
import { calculateCentroid } from "./geometry"

export function isDefined<T>(
  arg: T | null | undefined,
): arg is T extends null | undefined ? never : T {
  return arg !== null && arg !== undefined
}

export const hasAtLeastOneItem = <T>(events: T[]): events is [T, ...T[]] =>
  events.length > 0

export const filterNotEmpty = <T>(
  stream: Observable<T[]>,
): Observable<[T, ...T[]]> => stream.pipe(filter(hasAtLeastOneItem))

export function isWithinPosThreshold(
  startEvent: PointerEvent,
  endEvent: PointerEvent,
  posThreshold: number,
) {
  const start = calculateCentroid([startEvent])
  const end = calculateCentroid([endEvent])

  // Determines if the movement qualifies as a drag
  return (
    Math.abs(end.x - start.x) >= posThreshold ||
    Math.abs(end.y - start.y) >= posThreshold
  )
}

export const fromFailWith = (failWith?: { start$: Observable<unknown> }[]) =>
  !failWith?.length
    ? NEVER
    : merge(...(failWith?.map(({ start$ }) => start$) ?? []))

/**
 * Avoid division by zero
 * Calculate velocity in pixels per second
 */
export const calculateVelocity = (
  delay: number,
  deltaX: number,
  deltaY: number,
) => {
  const velocityX = delay > 0 ? deltaX / delay : 0
  const velocityY = delay > 0 ? deltaY / delay : 0

  return {
    velocityX,
    velocityY,
  }
}
