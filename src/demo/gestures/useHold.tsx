import { useEffect, useState } from "react"
import {
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react"
import { DebugBox } from "../debug/DebugBox"
import { AppRecognizable } from "./useRecognizable"

const HoldDebug = ({ value }: { value: boolean }) => {
  return (
    <DebugBox>
      <Stack>
        <Text>Hold: {value ? "true" : "false"}</Text>
      </Stack>
    </DebugBox>
  )
}

export const useHold = (recognizable: AppRecognizable) => {
  const toast = useToast()
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
  }, [recognizable, toast])

  const holdDebug = (
    <HoldDebug value={isHolding} />
  )

  return { holdDebug }
}
