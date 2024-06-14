import { Observable, filter } from "rxjs"

export const isValidConfig = <T extends { container?: HTMLElement }>(
  stream: Observable<T>,
) =>
  stream.pipe(
    filter(
      (config): config is T & { container: HTMLElement } => !!config.container,
    ),
  )
