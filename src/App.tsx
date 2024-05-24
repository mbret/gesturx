import { useEffect, useState } from "react"
import { PanRecognizer } from "./core/pan/PanRecognizer"
import { SwipeRecognizer } from "./core/swipe/SwipeRecognizer"
import { TapRecognizer } from "./core/tap/TapRecognizer"
import { createManager } from "./core/manager"
import { Box, Stack, Text, useToast } from "@chakra-ui/react"
import { ArrowForwardIcon } from "@chakra-ui/icons"
import { RotateRecognizer } from "./core/rotate/RotateRecognizer"

function App() {
  const toast = useToast()
  const [boxAngle, setBoxAngle] = useState(0)

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
        setBoxAngle((state) => state + e.deltaPointersAngle)
      }
    })

    const swipeSub = manager.events$.subscribe((e) => {
      if (e.type === "swipe") {
        // console.warn("swipe", e)

        toast({
          title: "Swipe",
          description: (
            <Stack>
              <Text display="flex" gap={4}>
                Direction:{" "}
                <ArrowForwardIcon
                  boxSize={6}
                  transform={`rotate(${e.cumulatedAngle}deg)`}
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

    // track fingers
    const sub2 = panRecognizer.fingers$.subscribe((fingers) => {
      const element = document.getElementById(`fingers`)

      if (element) {
        element.innerText = `fingers: ${fingers}`
      }
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
      sub2.unsubscribe()
      sub3.unsubscribe()
      clickSub.unsubscribe()
      rotateSub.unsubscribe()
    }
  }, [])

  return (
    <>
      <div id="fingers">fingers: 0</div>
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
