import { Observable, filter } from "rxjs"
import { isPointerOffEvent } from "../utils/events"

export const isValidConfig = <T extends { container?: HTMLElement }>(
  stream: Observable<T>,
) =>
  stream.pipe(
    filter(
      (config): config is T & { container: HTMLElement } => !!config.container,
    ),
  )

export const filterPointerOff = (stream: Observable<PointerEvent>) =>
  stream.pipe(filter(isPointerOffEvent))
