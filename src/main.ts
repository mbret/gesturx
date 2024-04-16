import { createManager } from "./core/manager";
import { PanRecognizer } from "./core/PanRecognizer";
import { TapRecognizer } from "./core/TapRecognizer";
import "./style.css";

const container = document.querySelector<HTMLDivElement>("#app")!;

const panRecognizer = new PanRecognizer({});
const tapRecognizer = new TapRecognizer({
  maxTaps: 3,
  failWith: [panRecognizer],
});

const manager = createManager({
  container,
  recognizers: [tapRecognizer, panRecognizer],
});

manager.events$.subscribe(console.warn);

container.innerHTML = `
  <div class="container">
  </div>
`;
