import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import reactPlugin from "eslint-plugin-react"

import { fileURLToPath } from "node:url"

import { includeIgnoreFile } from "@eslint/compat"
import path from "node:path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const gitignorePath = path.resolve(__dirname, ".gitignore")

export default [
  includeIgnoreFile(gitignorePath),
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended, // This is not a plugin object, but a shareable config object
  reactPlugin.configs.flat["jsx-runtime"], // Add this if you are using React 17+
  {
    ignores: ["src/demo/chakra/*"],
  },
]
