import { useEffect } from "react"
// import { ToastId, useToast } from "@chakra-ui/react"
import { AppRecognizable } from "../useRecognizable"
import { Settings } from "../App"
import { toaster } from "../chakra/ui/toaster"

export const useHold = ({
  recognizable,
}: {
  recognizable: AppRecognizable
  settings: Settings
}) => {
  // const toast = useToast()

  useEffect(() => {
    let toastId: string | undefined

    const clickSub = recognizable.events$.subscribe((e) => {
      if (e.type === "holdStart") {
        toastId = toaster.create({
          title: "Holding",
          duration: 9999999,
        })
      }

      if (e.type === "holdEnd") {
        if (toastId) {
          toaster.remove(toastId)
        }
      }
    })

    return () => {
      clickSub.unsubscribe()
    }
  }, [recognizable])
}
