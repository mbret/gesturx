import { useEffect, useState } from "react"
import { PanRecognizer } from "../core/pan/PanRecognizer"
import { SwipeRecognizer } from "../core/swipe/SwipeRecognizer"
import { TapRecognizer } from "../core/tap/TapRecognizer"
import { createManager } from "../core/manager"
import { Box, Stack, Text, useToast } from "@chakra-ui/react"
import { ArrowForwardIcon } from "@chakra-ui/icons"
import { RotateRecognizer } from "../core/rotate/RotateRecognizer"
import { DebugBox } from "./DebugBox"

function App() {
  const toast = useToast()
  const [boxAngle, setBoxAngle] = useState(0)
  const [numberOfFingers, setNumberOfFingers] = useState(0)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const container = document.querySelector<HTMLDivElement>("#root")!

    const panRecognizer = new PanRecognizer()
    const swipeRecognizer = new SwipeRecognizer()
    const rotateRecognizer = new RotateRecognizer()
    const tapRecognizer = new TapRecognizer({
      maxTaps: 3,
      failWith: [panRecognizer],
    })

    const manager = createManager({
      container,
      recognizers: [
        tapRecognizer,
        panRecognizer,
        swipeRecognizer,
        rotateRecognizer,
      ],
    })

    const rotateSub = manager.events$.subscribe((e) => {
      if (e.type === "rotate") {
        setBoxAngle((state) => state + e.deltaAngle)
        setRotation(e.angle)
      }

      if (e.type === "rotateEnd") {
        setRotation(0)
      }
    })

    const swipeSub = manager.events$.subscribe((e) => {
      if (e.type === "swipe") {
        toast({
          title: "Swipe",
          description: (
            <Stack>
              <Text display="flex" gap={4}>
                Direction:{" "}
                <ArrowForwardIcon
                  boxSize={6}
                  transform={`rotate(${e.angle}deg)`}
                />{" "}
              </Text>
              <Text display="flex" gap={4}>
                Velocity: X: <b>{e.velocityX.toFixed(2)}</b> / Y:{" "}
                <b>{e.velocityY.toFixed(2)} </b>
              </Text>
            </Stack>
          ),
        })
      }
    })

    const clickSub = manager.events$.subscribe((e) => {
      if (e.type === "tap") {
        toast({
          title: "Click",
          description: (
            <Stack>
              <Text display="flex" gap={4}>
                Taps: <b>{e.taps}</b>
              </Text>
            </Stack>
          ),
        })
      }
    })

    /**
     * To track active fingers, listen for the fingers$ observable on one of
     * your pan recognizer which is configured in a way to track all fingers.
     */
    const fingerTrackingSub = panRecognizer.fingers$.subscribe((fingers) => {
      setNumberOfFingers(fingers)
    })

    /**
     * Moving a box on x,y axis.
     * We track the deltaX/Y values.
     */
    let latestBoxPosition = { x: 0, y: 0 }
    const sub3 = manager.events$.subscribe((event) => {
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

    /**
     * track center.
     * We use the center value, which indicate the true center
     * no matter how many fingers
     */
    const sub = manager.events$.subscribe((event) => {
      const boxElement = document.getElementById(`boxCenter`)

      if (boxElement) {
        boxElement.style.left = `${event.center.x - boxElement.offsetWidth / 2}px`
        boxElement.style.top = `${event.center.y - boxElement.offsetHeight / 2}px`
      }
    })

    return () => {
      sub.unsubscribe()
      swipeSub.unsubscribe()
      fingerTrackingSub.unsubscribe()
      sub3.unsubscribe()
      clickSub.unsubscribe()
      rotateSub.unsubscribe()
    }
  }, [])

  return (
    <>
      <Stack position="absolute" right={0} top={0} pr={2} pt={2}>
        <DebugBox>fingers: {numberOfFingers}</DebugBox>
        <DebugBox>
          rotation:{" "}
          <ArrowForwardIcon boxSize={6} transform={`rotate(${rotation}deg)`} />{" "}
        </DebugBox>
      </Stack>
      <Box id="boxContainer">
        <div
          id="box"
          style={{
            transform: `rotate(${boxAngle}deg)`,
          }}
        ></div>
      </Box>
      <div id="boxCenter"></div>
    </>
  )
}

export default App
