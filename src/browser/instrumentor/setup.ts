import { instrument } from "./instrumentor";
import { function_map } from "./../../function_map";

export function prepareWindow(window: Window) {
  if (!window.__instrument_prep) {
    window.__instrument_prep = {
      beginnings: {},

      nextId: 0,
    };
  }

  window.__compare_counter = Number.MAX_SAFE_INTEGER;
  window.__counter = 0;

  window.__errs = [];
  window.addEventListener("error", (ev) => {
    window.__errs.push(
      JSON.parse(JSON.stringify(ev.error, Object.getOwnPropertyNames(ev.error)))
    );
  });

  window.__traces = [];
  window.__pcs_hit = new Map();
  window.Fuzzer = {
    tracer: {
      traceAndReturn: (id, test, pc) => {
        window.__traces.push({
          fn: function_map["traceAndReturn"],
          args: [id, test, pc],
        });
      },
      traceStrCmp: (a, b, op, pc) => {
        window.__traces.push({
          fn: function_map["traceStrCmp"],
          args: [a, b, op, pc],
        });
      },
      traceNumberCmp: (a, b, op, pc) => {
        window.__traces.push({
          fn: function_map["traceNumberCmp"],
          args: [a, b, op, pc],
        });
      },
    },
    coverageTracker: {
      incrementCounter: (x) => {
        window.__pcs_hit.set(x, (window.__pcs_hit.get(x) ?? 0) + 1);
      },
    },
  };
}

export function prepareMutationObserver(debug = false) {
  const queue: Array<{ src?: string; text?: string }> = [];
  let running = false;

  async function runQueue() {
    if (queue.length === 0) return;

    running = true;
    try {
      while (queue.length > 0) {
        const { src, text } = queue.splice(0, 1)[0];
        if (text) {
          const transformed = instrument(text);
          if (debug) {
            console.log(
              "[INSTRUMENTOR] Instrumented",
              { sourceCode: text },
              "as",
              { transformed }
            );
          }
          eval(transformed);
        } else if (src) {
          const text = await fetch(src).then((resp) => resp.text());
          const transformed = instrument(text);
          if (debug) {
            console.log(
              "[INSTRUMENTOR] Instrumented",
              { sourceCode: text, from: src },
              "as",
              { transformed }
            );
          }
          eval(transformed);
        }
      }
    } finally {
      running = false;
    }
  }

  const obs = new MutationObserver(() => {
    const scripts = document.querySelectorAll("script");
    scripts.forEach((scr) => {
      if (scr.dataset.safe === "") return;
      if (scr.dataset.instrumented === "") return;

      if (debug) {
        console.log("[INSTRUMENTOR] Instrumenting", scr);
      }

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
}

if (!window.__SKIP_INSTRUMENTATION) {
  prepareWindow(window);
  prepareMutationObserver(!!window.__INSTRUMENTATION_DEBUG_MODE);
}
