import { useEffect } from "react"
import { Stack, Text, useToast } from "@chakra-ui/react"
import { TapRecognizer } from "../../core"
import { AppRecognizable } from "../useRecognizable"

export const useTap = ({
  maxTaps,
  recognizable,
}: {
  recognizable: AppRecognizable
  maxTaps: number
}) => {
  const toast = useToast()
  const tapRecognizer = recognizable.recognizers.find(
    (recognizer) => recognizer instanceof TapRecognizer,
  )

  useEffect(() => {
    const clickSub = recognizable.events$.subscribe((e) => {
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

    return () => {
      clickSub.unsubscribe()
    }
  }, [recognizable, toast])

  useEffect(() => {
    tapRecognizer?.update({ maxTaps })
  }, [maxTaps, tapRecognizer])
}
