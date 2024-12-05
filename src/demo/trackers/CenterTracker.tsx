import { useEffect, useState } from "react"
import { AppRecognizable } from "../useRecognizable"
import { Box } from "@chakra-ui/react"

/**
 * Track center of pointer events by moving a box.
 *
 * This is an example of how to detect center in events.
 * Every recognizer events have a `center` property which define
 * the center between all fingers.
 *
 * In this case we listen for whatever events is detected and update
 * the center.
 */
export const CenterTracker = ({
  recognizable,
}: {
  recognizable: AppRecognizable
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const sub = recognizable.events$.subscribe((event) => {
      setPosition(event.center)
    })

    return () => {
      sub.unsubscribe()
    }
  }, [recognizable])

  return (
    <Box
      position="absolute"
      bgColor="white"
      pointerEvents="none"
      width={4}
      height={4}
      borderRadius="50%"
      left={`${position.x}px`}
      top={`${position.y}px`}
      transform="translate(-50%, -50%)"
    />
  )
}
