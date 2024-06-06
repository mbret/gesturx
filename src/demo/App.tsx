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
import { useTrackFingers } from "./gestures/useTrackFingers"
import { useBoxPan } from "./gestures/useBoxPan"
import { Pan } from "./Pan"

function App() {
  const { recognizable, containerRef } = useRecognizable()
  /**
   * Detect user taps
   */
  const { tapDebug } = useTap(recognizable)
  /**
   * Detect when user is holding the pan
   */
  const { isHolding } = useHold(recognizable)
  /**
   * Track fingers center
   */
  const { centerTrackingBox } = useTrackCenter(recognizable)
  /**
   * Detect swipes
   */
  useSwipe({
    recognizable,
  })
  /**
   * Track number of fingers active
   */
  const { fingers } = useTrackFingers(recognizable)
  /**
   * Move the box with fingers
   */
  const { position } = useBoxPan(recognizable)
  /**
   * Zoom in/out the box
   */
  const { boxScale, pinchDebug } = usePinch(recognizable)
  /**
   * Rotate the box
   */
  const { boxAngle, rotateDebug } = useRotate(recognizable)

  return (
    <>
      <Stack position="absolute" right={0} top={0} pr={2} pt={2} zIndex={1}>
        <DebugBox>fingers: {fingers}</DebugBox>
        {tapDebug}
        <HoldDebug isHolding={isHolding} />
        {rotateDebug}
        {pinchDebug}
      </Stack>
      <Pan containerRef={containerRef}>
        <Box id="boxContainer" left={`${position.x}px`} top={`${position.y}px`}>
          <div
            id="box"
            style={{
              transform: `rotate(${boxAngle}deg) scale(${boxScale})`,
            }}
          ></div>
        </Box>
        {centerTrackingBox}
      </Pan>
    </>
  )
}

export default App
