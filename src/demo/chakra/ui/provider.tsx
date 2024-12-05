"use client"

import {
  ChakraProvider,
  createSystem,
  defaultSystem,
  defineConfig,
  mergeConfigs,
} from "@chakra-ui/react"
import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode"

const system = createSystem(
  defineConfig(
    mergeConfigs(defaultSystem._config, {
      globalCss: {
        body: {
          backgroundColor: "#242424",
        },
      },
    }),
  ),
)

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  )
}
