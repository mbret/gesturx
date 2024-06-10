import { PanEvent } from "../recognizer/Recognizer"
import { PinchEvent } from "./PinchRecognizer"

export const mapPanEventToPinchEvent = ({
  panEvent,
  previousPinchEvent,
  pinchStartEvent,
  type,
}: {
  pinchStartEvent: PinchEvent | undefined
  previousPinchEvent: PinchEvent | undefined
  panEvent: PanEvent
  type: PinchEvent["type"]
}): PinchEvent => {
  const previousPointersAverageDistance = previousPinchEvent
    ? previousPinchEvent.pointersAverageDistance ??
      panEvent.pointersAverageDistance
    : panEvent.pointersAverageDistance

  const scale = pinchStartEvent
    ? panEvent.pointersAverageDistance / pinchStartEvent.pointersAverageDistance
    : 1

  return {
    ...previousPinchEvent,
    ...panEvent,
    type,
    scale,
    distance: pinchStartEvent
      ? panEvent.pointersAverageDistance -
        pinchStartEvent.pointersAverageDistance
      : 0,
    deltaDistance:
      panEvent.pointersAverageDistance - previousPointersAverageDistance,
    deltaDistanceScale:
      panEvent.pointersAverageDistance / previousPointersAverageDistance,
  }
}
