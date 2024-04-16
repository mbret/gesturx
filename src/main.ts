import { createManager } from "./core/manager";
import { createTapRecognizer } from "./core/tapRecognizer";
import "./style.css";

const container = document.querySelector<HTMLDivElement>("#app")!;

const tapRecognizer = createTapRecognizer({ maxTaps: 3 });

const manager = createManager({
  container,
  recognizers: [tapRecognizer],
});

manager.events$.subscribe(console.warn);

container.innerHTML = `
  <div class="container">
  </div>
`;
