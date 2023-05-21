//@ts-expect-error
global.window = global;

import { FuzzedDataProvider } from "@jazzer.js/core";

function getModelInstrumented() {
  const model = require(process.env.TARGET);

  for (const key of Object.keys(model.pages)) {
    const page = model.pages[key];
    for (const element of page.elements) {
      if (typeof element.value !== "undefined") {
        element.value = "";
      }
    }
  }

  return model;
}

export async function fuzz(input) {
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
  // await new Promise((resolve) => setTimeout(resolve, 750));
  console.log("---");
};
