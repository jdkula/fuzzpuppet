import { instrumentAndRun } from "./instrumentor";

window.__errs = [];
window.addEventListener("error", (ev) => {
  window.__errs.push(JSON.parse(JSON.stringify(ev.error, Object.getOwnPropertyNames(ev.error))));
});

window.__mp = new Map();
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
      window.__traces.push({
        fn: "traceNumberCmp",
        args: [a, b, op, pc],
      });
    },
  },
  coverageTracker: {
    incrementCounter: (x) => {
      window.__mp.set(x, (window.__mp.get(x) || 0) + 1);
      console.log("COUNTER INCREMENTED:", x, "goes to", window.__mp.get(x));
    },
  },
};


const obs = new MutationObserver((mut, obs) => {
  const scripts = document.querySelectorAll("script");
  scripts.forEach((scr) => {
    if (scr.dataset.safe === "") return;
    if (scr.dataset.instrumented === "") return;

    if (scr.src) {
      instrumentAndRun(scr.src);
    } else if (scr.innerText) {
      instrumentAndRun(null, scr.innerText);
    }

    scr.src = "";
    scr.innerText = "";
    scr.dataset.instrumented = "";
  });
});

obs.observe(document.getRootNode(), { childList: true, subtree: true });
