import { ArrowForwardIcon } from "@chakra-ui/icons"
import { Stack, Text, useToast } from "@chakra-ui/react"
import { useCallback } from "react"
import { SwipeEvent } from "../../core"

export const useSwipeDebugToast = () => {
  const toast = useToast()

  return useCallback((e: SwipeEvent) => {
    toast({
      title: "Swipe",
      description: (
        <Stack>
          <Text display="flex" gap={4}>
            Direction:{" "}
            <ArrowForwardIcon boxSize={6} transform={`rotate(${e.angle}deg)`} />{" "}
          </Text>
          <Text display="flex" gap={4}>
            Velocity: X: <b>{e.velocityX.toFixed(2)}</b> / Y:{" "}
            <b>{e.velocityY.toFixed(2)} </b>
          </Text>
        </Stack>
      ),
    })
  }, [toast])
}
