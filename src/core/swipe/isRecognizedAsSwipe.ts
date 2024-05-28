import { Observable, filter } from "rxjs"
import { PanEvent } from "../pan/AbstractPanRecognizer"

export const isRecognizedAsSwipe =
  (escapeVelocity: number) => (stream: Observable<PanEvent>) =>
    stream.pipe(
      filter((event) => {
        return (
          Math.abs(event.velocityX) >= escapeVelocity ||
          Math.abs(event.velocityY) >= escapeVelocity
        )
      }),
    )
