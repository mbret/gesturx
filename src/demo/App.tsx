import { useEffect, useState } from "react"
import { Box, Stack } from "@chakra-ui/react"
import { DebugBox } from "./debug/DebugBox"
import { useRecognizable } from "./gestures/useRecognizable"
import { useTap } from "./gestures/useTap"
import { useHold } from "./gestures/useHold"
import { useTrackCenter } from "./gestures/useTrackCenter"
import { useRotate } from "./gestures/useRotate"
import { usePinch } from "./gestures/usePinch"
import { HoldDebug } from "./debug/HoldDebug"
import { useSwipe } from "./gestures/useSwipe"
import { useSwipeDebugToast } from "./debug/useSwipeDebugToast"
import { useTrackFingers } from "./gestures/useTrackFingers"

function App() {
  const swipeDebugToast = useSwipeDebugToast()
  const [container, setContainer] = useState<HTMLElement | undefined>()
  const { recognizable } = useRecognizable(container)
  const { tapDebug } = useTap(recognizable)
  const { isHolding } = useHold(recognizable)
  const { boxAngle, rotateDebug } = useRotate(recognizable)
  const { boxScale, pinchDebug } = usePinch(recognizable)
  const { centerTrackingBox } = useTrackCenter(recognizable)
  useSwipe({
    recognizable,
    onSwipe: swipeDebugToast,
  })
  const { fingers } = useTrackFingers(recognizable)

  useEffect(() => {
    /**
     * Moving a box on x,y axis.
     * We track the deltaX/Y values.
     */
    let latestBoxPosition = { x: 0, y: 0 }
    const sub3 = recognizable.events$.subscribe((event) => {
      if (
        event.type === "panMove" ||
        event.type === "panEnd" ||
        event.type === "panStart"
      ) {
        const boxElement = document.getElementById(`boxContainer`)

        if (boxElement) {
          const domRect = boxElement.getBoundingClientRect()

          if (event.type === "panStart") {
            latestBoxPosition.x = domRect.left
            latestBoxPosition.y = domRect.top
          }

          boxElement.style.left = `${latestBoxPosition.x + event.deltaX}px`
          boxElement.style.top = `${latestBoxPosition.y + event.deltaY}px`
        }
      }
    })

    return () => {
      sub3.unsubscribe()
    }
  }, [recognizable])

  return (
    <>
      <Stack position="absolute" right={0} top={0} pr={2} pt={2} zIndex={1}>
        <DebugBox>fingers: {fingers}</DebugBox>
        {tapDebug}
        <HoldDebug isHolding={isHolding} />
        {rotateDebug}
        {pinchDebug}
      </Stack>
      <Box
        id="container"
        ref={(element) => {
          if (element) {
            setContainer(element)
          }
        }}
      >
        <Box id="boxContainer">
          <div
            id="box"
            style={{
              transform: `rotate(${boxAngle}deg) scale(${boxScale})`,
            }}
          ></div>
        </Box>
        {centerTrackingBox}
      </Box>
    </>
  )
}

export default App
