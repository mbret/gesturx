import { Stack, Text } from "@chakra-ui/react"
import { ControlBox } from "../controls/ControlBox"
import { AppRecognizable } from "../useRecognizable"
import { useEffect, useState } from "react"

export const HoldControls = ({
  recognizable,
}: {
  recognizable: AppRecognizable
}) => {
  const [isHolding, setIsHolding] = useState(false)

  useEffect(() => {
    const clickSub = recognizable.events$.subscribe((e) => {
      if (e.type === "holdStart") {
        setIsHolding(true)
      }

      if (e.type === "holdEnd") {
        setIsHolding(false)
      }
    })

    return () => {
      clickSub.unsubscribe()
    }
  }, [recognizable])

  return (
    <ControlBox>
      <Stack>
        <Text>Hold: {isHolding ? "true" : "false"}</Text>
      </Stack>
    </ControlBox>
  )
}
