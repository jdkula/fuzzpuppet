import puppeteer from "puppeteer";
import { FuzzedDataProvider } from "@jazzer.js/core";
import type * as _ from '../extension';

const ready = (async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  return page;
})();

function makeError(errorLike: any) {
  const error = new Error(errorLike.message ?? "");
  error.stack = errorLike.stack ?? undefined;
  return error;
}

export async function fuzz(input: Buffer) {
  const data = new FuzzedDataProvider(input);
  const page = await ready;
  const res = await page.goto(process.env.TARGET ?? "http://localhost:8080/");

  if (!res?.ok) {
    throw new Error("Nav failed");
  }

  const _ = await Promise.all([
    await page.$$("input"),
    await page.$$("button"),
  ]);
  const interactors = [..._[0], ..._[1]];

  while (data.remainingBytes > 0) {
    const chosen =
      interactors[data.consumeIntegralInRange(0, interactors.length - 1)];

    const tag = ((
      await (await chosen.getProperty("tagName")).jsonValue()
    ) as string).toLowerCase();
    const type = await (await chosen.getProperty("type")).jsonValue();

    if (tag === "input") {
      if (type === "text") {
        const str = data.consumeString(16, "utf-8");
        await chosen.type(str);
        console.log("text input:", str);
      } else if (type === "number") {
        const num = data.consumeIntegral(3, true).toString();
        await chosen.type(num);
        console.log("number input:", num);
      }
    } else if (tag === "button") {
      await chosen.click();
      console.log("button click");
    }

    const [errs, raw_counters, traces] = await page.evaluate(() => {
      const out = [[...window.__errs], [...window.__mp], [...window.__traces]] as const;
      window.__errs = [];
      window.__mp.clear();
      window.__traces = [];
      return out;
    });

    for (const { fn, args } of traces) {
      switch (fn) {
        case "traceAndReturn":
          (Fuzzer.tracer.traceAndReturn as any)(...args)
          break;
        case "traceNumberCmp":
          (Fuzzer.tracer.traceNumberCmp as any)(...args)
          break;
        case "traceStrCmp":
          (Fuzzer.tracer.traceStrCmp as any)(...args)
          break;
      }
    }

    for (const [k, v] of raw_counters) {
      for (let i = 0; i < v; i++) {
        Fuzzer.coverageTracker.incrementCounter(k);
      }
    }

    if (errs.length > 0) {
      throw makeError(errs[0]);
    }
  }

  console.log("---");
}