import { createManager } from "./core/manager"
import { PanRecognizer } from "./core/PanRecognizer"
import { SwipeRecognizer } from "./core/SwipeRecognizer"
import { TapRecognizer } from "./core/TapRecognizer"
import "./style.css"

const container = document.querySelector<HTMLDivElement>("#app")!

const panRecognizer = new PanRecognizer()
const swipeRecognizer = new SwipeRecognizer(panRecognizer)
const tapRecognizer = new TapRecognizer({
  maxTaps: 3,
  failWith: [panRecognizer],
})

const manager = createManager({
  container,
  recognizers: [tapRecognizer, panRecognizer, swipeRecognizer],
})

manager.events$.subscribe((e) => console.warn(e.type, e))

container.innerHTML = `
  <div class="container">
  </div>
`
