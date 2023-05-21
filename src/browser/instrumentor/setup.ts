import { instrument } from "./instrumentor";


window.__errs = [];
window.addEventListener("error", (ev) => {
  window.__errs.push(
    JSON.parse(JSON.stringify(ev.error, Object.getOwnPropertyNames(ev.error)))
  );
});

window.__traces = [];
window.Fuzzer = {
  tracer: {
    traceAndReturn: (id, test, pc) => {
      window.__traces.push({
        fn: "traceAndReturn",
        args: [id, test, pc],
      });
    },
    traceStrCmp: (a, b, op, pc) => {
      window.__traces.push({ fn: "traceStrCmp", args: [a, b, op, pc] });
    },
    traceNumberCmp: (a, b, op, pc) => {
      console.log("TRACING NUMBER CMP", JSON.stringify([a, b, op, pc]));
      window.__traces.push({
        fn: "traceNumberCmp",
        args: [a, b, op, pc],
      });
    },
  },
  coverageTracker: {
    incrementCounter: (x) => {
      window.__traces.push({
        fn: "incrementCounter",
        args: [x],
      });
    },
  },
};

const queue: Array<{ src?: string; text?: string }> = [];
let running = false;

async function runQueue() {
  if (queue.length === 0) return;

  running = true;
  try {
    while (queue.length > 0) {
      const { src, text } = queue.splice(0, 1)[0];
      if (text) {
        const transformed = await instrument(text);
        // console.log("Got", transformed);
        eval(transformed);
      } else if (src) {
        const text = await fetch(src).then((resp) => resp.text());
        const transformed = instrument(text);
        // console.log("Got", transformed);
        eval(transformed);
      }
    }
  } finally {
    running = false;
  }
}

const obs = new MutationObserver((mut, obs) => {
  const scripts = document.querySelectorAll("script");
  scripts.forEach((scr) => {
    if (scr.dataset.safe === "") return;
    if (scr.dataset.instrumented === "") return;

    queue.push({ src: scr.src, text: scr.innerText });
    if (!running) {
      runQueue();
    }

    scr.src = "";
    scr.innerText = "";
    scr.dataset.instrumented = "";
  });
});

obs.observe(document.getRootNode(), { childList: true, subtree: true });
