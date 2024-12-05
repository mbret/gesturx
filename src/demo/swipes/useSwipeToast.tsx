import { Stack, Text } from "@chakra-ui/react"
import { useCallback } from "react"
import { SwipeEvent } from "../../core/swipe/SwipeRecognizerInterface"
import { IoArrowForward } from "react-icons/io5"
import { toaster } from "../chakra/ui/toaster"

export const useSwipeToast = () => {
  return useCallback((e: SwipeEvent) => {
    toaster.create({
      title: "Swipe",
      duration: 2000,
      description: (
        <Stack>
          <Text display="flex" gap={4}>
            Direction:{" "}
            <IoArrowForward size="20" transform={`rotate(${e.angle.toFixed(0)})`} />{" "}
          </Text>
          <Text display="flex" gap={4}>
            Velocity: X: <b>{e.velocityX.toFixed(2)}</b> / Y:{" "}
            <b>{e.velocityY.toFixed(2)} </b>
          </Text>
        </Stack>
      ),
    })
  }, [])
}
