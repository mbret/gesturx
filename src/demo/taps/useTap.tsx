import { useEffect } from "react"
import { Stack, Text } from "@chakra-ui/react"
import { TapRecognizer } from "../../core"
import { AppRecognizable } from "../useRecognizable"
import { toaster } from "../chakra/ui/toaster"

export const useTap = ({
  maxTaps,
  recognizable,
}: {
  recognizable: AppRecognizable
  maxTaps: number
}) => {
  const tapRecognizer = recognizable.recognizers.find(
    (recognizer) => recognizer instanceof TapRecognizer,
  )

  useEffect(() => {
    const clickSub = recognizable.events$.subscribe((e) => {
      if (e.type === "tap") {
        toaster.create({
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
  }, [recognizable])

  useEffect(() => {
    tapRecognizer?.update({
      options: {
        maxTaps,
      },
    })
  }, [maxTaps, tapRecognizer])
}
