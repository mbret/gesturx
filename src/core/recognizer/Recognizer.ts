import { BehaviorSubject, Observable, filter } from "rxjs"
import { RecognizerEvent } from "./RecognizerEvent"

type RecognizerConfig<Options> = {
  container?: HTMLElement
  afterEventReceived?: (event: PointerEvent) => PointerEvent
  options?: Options
}

type ValidRecognizerConfig<Options> = Required<
  Pick<RecognizerConfig<Options>, "container">
> &
  RecognizerConfig<Options>

export interface RecognizerOptions {
  failWith?: { start$: Observable<unknown> }[]
}

export abstract class Recognizer<Options, Event extends RecognizerEvent> {
  protected config$ = new BehaviorSubject<RecognizerConfig<Options>>({})

  abstract events$: Observable<Event>

  protected validConfig$ = this.config$.pipe(
    filter(
      (config): config is ValidRecognizerConfig<Options> => !!config.container,
    ),
  )

  constructor(options: Options) {
    this.update(options)
  }

  public initialize(config: RecognizerConfig<Options>) {
    const prevConfig = this.config$.getValue()

    this.config$.next({
      ...prevConfig,
      ...config,
      options: {
        ...prevConfig.options,
        ...config.options,
      } as Options,
    })
  }

  public update(options: Options) {
    const config = this.config$.getValue()

    this.config$.next({
      ...config,
      options: {
        ...config.options,
        ...options,
      },
    })
  }
}
