import { describe, it, expect, beforeEach } from "vitest"
import { buffer, first, lastValueFrom, NEVER, Subject, tap, timer } from "rxjs"
import { SwipeRecognizer } from "./SwipeRecognizer"

const waitFor = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time))

describe("SwipeRecognizer", () => {
  let container = document.createElement("div")

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
  })

  function createPointerEvent({
    type,
    x,
    y,
    identifier,
  }: {
    type: string
    x: number
    y: number
    identifier: number
  }) {
    const event = new PointerEvent(type, {
      clientX: x,
      clientY: y,
      pointerId: identifier,
      pointerType: "touch",
      bubbles: true,
    })

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    event.x = x
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    event.y = y

    return event
  }

  function sendPointerEvent({
    type,
    x,
    y,
    container,
    identifier,
  }: {
    container: HTMLElement
    type: string
    x: number
    y: number
    identifier: number
  }) {
    const event = createPointerEvent({
      type,
      x,
      y,
      identifier,
    })

    sendPointerEventFromEvent({ event, container })
  }

  function sendPointerEventFromEvent({
    event,
    container,
  }: {
    event: PointerEvent
    container: HTMLElement
  }) {
    container.dispatchEvent(event)
  }

  // ~0.8 velocityX
  const createVelocityOfOnePanMoving = async () => {
    await waitFor(1)

    sendPointerEvent({
      container,
      identifier: 1,
      type: "pointerdown",
      x: 0,
      y: 0,
    })

    await waitFor(10)

    sendPointerEvent({
      container,
      identifier: 1,
      type: "pointermove",
      x: 10,
      y: 0,
    })

    await waitFor(10)

    sendPointerEvent({
      container,
      identifier: 1,
      type: "pointerup",
      x: 20,
      y: 0,
    })
  }

  it("should detect a swipe if above threshold", async () => {
    const waitLongEnough$ = timer(100)
    const recognizer = new SwipeRecognizer({
      container,
      options: {
        escapeVelocity: 0.4,
      },
    })

    const values = await lastValueFrom(
      recognizer.events$.pipe(
        tap({
          subscribe: async () => {
            await createVelocityOfOnePanMoving()
          },
        }),
        buffer(waitLongEnough$),
        first(),
      ),
    )

    expect(values).toMatchObject([{ type: "swipe" }])
  })

  it("should not detect a swipe if below threshold", async () => {
    const waitLongEnough$ = timer(100)
    const recognizer = new SwipeRecognizer({
      container,
      options: {
        escapeVelocity: 10,
      },
    })

    const values = await lastValueFrom(
      recognizer.events$.pipe(
        tap({
          subscribe: async () => {
            await createVelocityOfOnePanMoving()
          },
        }),
        buffer(waitLongEnough$),
        first(),
      ),
    )

    expect(values).toMatchObject([])
  })

  it("should not start detecting a swipe when failWith is active", async () => {
    const finishSubject = new Subject<void>()
    const startFailSubject = new Subject<void>()

    const recognizer = new SwipeRecognizer({
      container,
      failWith: [
        {
          start$: startFailSubject,
          end$: NEVER,
        },
      ],
    })

    const values = await lastValueFrom(
      recognizer.events$.pipe(
        tap({
          subscribe: async () => {
            // shoudl work
            await createVelocityOfOnePanMoving()

            startFailSubject.next()

            // should not
            await createVelocityOfOnePanMoving()

            finishSubject.next()
          },
        }),
        buffer(finishSubject),
        first(),
      ),
    )

    expect(values.length).toBe(1)
    expect(values).toMatchObject([{ type: "swipe" }])
  })

  it("should cancel an in-progress swipe when failWith becomes active", async () => {
    const finishSubject = new Subject<void>()
    const failWithStart$ = new Subject<void>()
    const recognizer = new SwipeRecognizer({
      container,
      failWith: [
        {
          start$: failWithStart$,
          end$: NEVER,
        },
      ],
      options: {
        escapeVelocity: 0.1,
      },
    })

    const values = await lastValueFrom(
      recognizer.events$.pipe(
        tap({
          subscribe: async () => {
            // Start the swipe gesture
            await waitFor(1)
            sendPointerEvent({
              container,
              identifier: 1,
              type: "pointerdown",
              x: 0,
              y: 0,
            })

            await waitFor(10)

            sendPointerEvent({
              container,
              identifier: 1,
              type: "pointermove",
              x: 10,
              y: 0,
            })

            // Trigger failWith mid-swipe
            failWithStart$.next()

            await waitFor(10)

            // Complete the swipe motion, but it should be cancelled
            sendPointerEvent({
              container,
              identifier: 1,
              type: "pointerup",
              x: 20,
              y: 0,
            })

            await waitFor(10)

            finishSubject.next()
          },
        }),
        buffer(finishSubject),
        first(),
      ),
    )

    expect(values).toMatchObject([])
  })
})
