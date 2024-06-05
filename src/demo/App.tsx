import { useEffect, useState } from "react"
import { PanRecognizer } from "../core/pan/PanRecognizer"
import { Box, Stack, Text, useToast } from "@chakra-ui/react"
import { ArrowForwardIcon } from "@chakra-ui/icons"
import { DebugBox } from "./debug/DebugBox"
import { useRecognizable } from "./gestures/useRecognizable"
import { useTap } from "./gestures/useTap"
import { useHold } from "./gestures/useHold"
import { useTrackCenter } from "./gestures/useTrackCenter"

function App() {
  const toast = useToast()
  const [container, setContainer] = useState<HTMLElement | undefined>()
  const { recognizable } = useRecognizable(container)
  const { tapDebug } = useTap(recognizable)
  const { holdDebug } = useHold(recognizable)
  const { centerTrackingBox } = useTrackCenter(recognizable)
  const [boxAngle, setBoxAngle] = useState(0)
  const [boxScale, setBoxScale] = useState(1)
  const [numberOfFingers, setNumberOfFingers] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(1)
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const rotateSub = recognizable.events$.subscribe((e) => {
      if (e.type === "rotate") {
        setBoxAngle((state) => state + e.deltaAngle)
        setRotation(e.angle)
      }

      if (e.type === "rotateEnd") {
        setRotation(0)
      }
    })

    const pinchSub = recognizable.events$.subscribe((e) => {
      if (e.type === "pinchMove") {
        setBoxScale((value) => value * e.deltaDistanceScale)
        setScale(e.scale)
        setDistance(e.distance)
      }

      if (e.type === "pinchEnd") {
        setScale(1)
        setDistance(0)
      }
    })

    const swipeSub = recognizable.events$.subscribe((e) => {
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

    /**
     * To track active fingers, listen for the fingers$ observable on one of
     * your pan recognizer which is configured in a way to track all fingers.
     */
    const fingerTrackingSub = recognizable.recognizers
      .find(
        (recognizer): recognizer is PanRecognizer =>
          recognizer instanceof PanRecognizer,
      )
      ?.fingers$.subscribe((fingers) => {
        setNumberOfFingers(fingers)
      })

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
      swipeSub.unsubscribe()
      fingerTrackingSub?.unsubscribe()
      sub3.unsubscribe()
      rotateSub.unsubscribe()
      pinchSub.unsubscribe()
    }
  }, [recognizable])

  return (
    <>
      <Stack position="absolute" right={0} top={0} pr={2} pt={2} zIndex={1}>
        <DebugBox>fingers: {numberOfFingers}</DebugBox>
        {tapDebug}
        {holdDebug}
        <DebugBox>
          rotation:{" "}
          <ArrowForwardIcon boxSize={6} transform={`rotate(${rotation}deg)`} />{" "}
        </DebugBox>
        <DebugBox>
          pinch:
          <Text>
            {scale.toFixed(1)}% {distance.toFixed(0)}px
          </Text>
        </DebugBox>
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
