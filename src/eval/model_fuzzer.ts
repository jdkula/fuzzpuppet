//@ts-expect-error 
global.window = global;

import type { WebsiteModel } from "./model";
import { instrument } from "../browser/instrumentor/instrumentor";

import { FuzzedDataProvider } from "@jazzer.js/core";

import * as fs from "node:fs";

const model: WebsiteModel = eval(
  instrument(
    fs.readFileSync(process.env.TARGET as string, { encoding: "utf-8" })
  )
);

export async function fuzz(input: Buffer) {
  const data = new FuzzedDataProvider(input);

  let page = model.pages[model.start];
  const interactors = [
    ...page.elements.filter((el) => el.tag === "input"),
    ...page.elements.filter((el) => el.tag === "button"),
  ];

  while (data.remainingBytes > 0) {
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
        const num = data.consumeIntegral(
          3, true
        );
        chosen.value = num;
        console.log("number input:", num);
      }
    } else if (tag === "button") {
      chosen.onClick?.();
      console.log("button click");
    }
  }

  console.log("---");
}
