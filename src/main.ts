import { createManager } from "./core/manager"
import { PanRecognizer } from "./core/pan/PanRecognizer"
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

/**
 * Moving a box on x,y axis.
 * We track the deltaX/Y values.
 */
let latestBoxPosition = { x: 0, y: 0 }
manager.events$.subscribe((event) => {

  if (
    event.type === "panMove" ||
    event.type === "panEnd" ||
    event.type === "panStart"
  ) {
    const boxElement = document.getElementById(`box`)

    if (boxElement) {
      const domRect = boxElement.getBoundingClientRect()

      if (event.type === "panStart") {
        latestBoxPosition.x = domRect.left
        latestBoxPosition.y = domRect.top
      }

      boxElement.style.left = `${latestBoxPosition.x + event.deltaX}px`
      boxElement.style.top = `${latestBoxPosition.y + event.deltaY}px`
    }
  }
})

/**
 * track center.
 * We use the center value, which indicate the true center
 * no matter how many fingers
 */
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
