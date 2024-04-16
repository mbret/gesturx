import { createManager } from "./core/manager";
import { createPanRecognizer } from "./core/panRecognizer";
import { TapRecognizer } from "./core/TapRecognizer";
import "./style.css";

const container = document.querySelector<HTMLDivElement>("#app")!;

// const panRecognizer = createPanRecognizer({});
const tapRecognizer = new TapRecognizer({
  maxTaps: 3,
  // failWith: [panRecognizer],
});

const manager = createManager({
  container,
  recognizers: [tapRecognizer],
});

manager.events$.subscribe(console.warn);

container.innerHTML = `
  <div class="container">
  </div>
`;
