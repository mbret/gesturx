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

// track fingers
panRecognizer.fingers$.subscribe((fingers) => {
  const element = document.getElementById(`fingers`)

  if (element) {
    element.innerText = `fingers: ${fingers}`
  }
})

// box moving
manager.events$.subscribe((event) => {
  if (event.type === "panMove") {
    const boxElement = document.getElementById(`box`)

    if (boxElement) {
      boxElement.style.left = `${event.center.x - boxElement.offsetWidth / 2}px`
      boxElement.style.top = `${event.center.y - boxElement.offsetHeight / 2}px`
    }
  }
})

// track center
manager.events$.subscribe((event) => {
  const boxElement = document.getElementById(`boxCenter`)

  if (boxElement) {
    boxElement.style.left = `${event.center.x - boxElement.offsetWidth / 2}px`
    boxElement.style.top = `${event.center.y - boxElement.offsetHeight / 2}px`
  }
})

container.innerHTML = `
  <div id="fingers">fingers: 0</div>
  <div id="box">
  </div>
  <div id="boxCenter">
`
