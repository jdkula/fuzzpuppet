//@ts-expect-error
global.window = global;

import type { WebsiteModel } from "./model";
import { instrument } from "../browser/instrumentor/instrumentor";

import { FuzzedDataProvider } from "@jazzer.js/core";

import * as fs from "node:fs";
import * as path from "node:path";

const TARGET = fs.readFileSync(process.env.TARGET as string, {
  encoding: "utf-8",
});
const TARGET_INSTRUMENTED = instrument(TARGET);

Fuzzer.coverageTracker.enlargeCountersBufferIfNeeded(window.__instrument_prep.nextId);

console.log(TARGET_INSTRUMENTED);

const origNumberCmp = Fuzzer.tracer.traceNumberCmp.bind(Fuzzer.tracer);
Fuzzer.tracer.traceNumberCmp = (a, b, op, id) => {
  origNumberCmp(a, b, op, id);
  return false;
};

const model: WebsiteModel = eval(TARGET);

function toFileSet(model: WebsiteModel): Record<string, string> {
  const files: Record<string, string> = {};

  for (const [file, { elements }] of Object.entries(model.pages)) {
    let counter = 0;
    let body = "";
    let script = `
      const model = {pages: {"${file}": {elements: []}}, start: "${model.start}"};
    `;
    for (const element of elements) {
      switch (element.tag) {
        case "input": {
          if (element.type === "number") {
            const id = counter++;
            body += `
              <input type="number" id="${id}" ${
              element.min !== undefined ? `min="${element.min}"` : ""
            } ${element.max !== undefined ? `max="${element.max}"` : ""} ${
              element.value !== undefined ? `value="${element.value}"` : ""
            }>
            `;
            script += `
              const el${id} = document.getElementById("${id}");
              model.pages["${file}"].elements.push(new class _NOINSTRUMENT_${id} {get value() {return el${id}.value;}});
            `;
            if (element.onChange) {
              script += `
                el${id}.addEventListener("change", ${element.onChange.toString()});
              `;
            }
          } else {
            const id = counter++;
            body += `
              <input type="text" id="${id}" ${
              element.value !== undefined ? `value="${element.value}"` : ""
            }>
            `;
            script += `
              const el${id} = document.getElementById("${id}");
              model.pages["${file}"].elements.push(new class _NOINSTRUMENT_${id} {get value() {return parseInt(el${id}.value);}});
            `;
            if (element.onChange) {
              script += `
                el${id}.addEventListener("change", ${element.onChange.toString()});
              `;
            }
          }
          break;
        }
        case "button": {
          const id = counter++;
          body += `
            <button id="${id}">button${id}</button>
          `;
          script += `
            const el${id} = document.getElementById("${id}");
          `;
          if (element.onClick) {
            script += `
              el${id}.addEventListener("click", ${element.onClick.toString()});
            `;
          }
          break;
        }
        case "a": {
          const id = counter++;
          body += `
            <a id="${id}" ${
            element.destination
              ? `href="${
                  element.destination?.startsWith("#")
                    ? element.destination
                    : element.destination + ".html"
                }"`
              : ""
          }>link${id}</a>
          `;
          break;
        }
      }

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${file}</title>
      </head>
      <body>
        ${body}
        <script type="application/javascript">
          ${script}
        </script>
      </body>
      </html>
      `;

      files[file] = html;
    }
  }

  return files;
}

for (const [file, html] of Object.entries(toFileSet(model))) {
  fs.writeFileSync(path.join(__dirname, file + ".html"), html, {
    encoding: "utf-8",
  });
}

function getModelInstrumented(): WebsiteModel {
  return eval(TARGET_INSTRUMENTED);
}

export async function fuzz(input: Buffer) {
  const data = new FuzzedDataProvider(input);

  const modelInstrumented = getModelInstrumented();

  let page = modelInstrumented.pages[modelInstrumented.start];

  while (data.remainingBytes > 0) {
    let interactors = [
      ...page.elements.filter((el) => el.tag === "button"),
      ...page.elements.filter((el) => el.tag === "input"),
      ...page.elements.filter((el) => el.tag === "a"),
    ];
    if (interactors.length <= 0) break;

    const chosen =
      interactors[data.consumeIntegralInRange(0, interactors.length - 1)];

    const tag = chosen.tag;

    if (tag === "input") {
      const type = chosen.type;
      if (type === "text") {
        const str = data.consumeString(16, "utf-8");
        chosen.value = str;
        console.log("text input:", str);
      } else if (type === "number") {
        const num = data.consumeIntegral(3, true).toString();
        chosen.value = num;
        console.log("number input:", num);
      }
    } else if (tag === "button") {
      chosen.onClick?.();
      console.log("button click");
    } else if (tag === "a") {
      if (!chosen.destination.startsWith("#")) {
        page = modelInstrumented.pages[chosen.destination];
        interactors = [
          ...page.elements.filter((el) => el.tag === "button"),
          ...page.elements.filter((el) => el.tag === "input"),
          ...page.elements.filter((el) => el.tag === "a"),
        ];
      }
      console.log("a tag -> " + chosen.destination);
    }
  }
  console.log("---");
}
