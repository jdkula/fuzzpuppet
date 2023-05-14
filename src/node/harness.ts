import puppeteer from "puppeteer";
import { FuzzedDataProvider } from "@jazzer.js/core";
import type * as _ from "../extension";
import * as fs from "node:fs";
import * as path from "node:path";

const transformBundle = fs.readFileSync(
  path.join(__dirname, "..", "browser", "bundle.js"),
  { encoding: "utf-8" }
);

const bundleB64 = Buffer.from(transformBundle).toString('base64');


const ready = (async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();

  page.setRequestInterception(true);
  page.on("request", async (req) => {
    if (req.url().endsWith(".html")) {
      let resp = await fetch(req.url());
      const headers: Record<string, unknown> = {};
      for (const [k, v] of resp.headers.entries()) {
        headers[k] = v;
      }
      const contentType = resp.headers.get("Content-Type") ?? undefined;
      if (!resp.ok) {
        return await req.respond({
          body: await resp.text(),
          status: resp.status,
          contentType,
          headers,
        });
      }
      let body = await resp.text();
      body = body.replace(
        "<head>",
        `<head><script type="application/javascript" data-safe>eval(atob("${bundleB64}"))</script>`
      );

      return await req.respond({
        body,
        status: resp.status,
        contentType,
        headers,
      });
    } else {
      return await req.continue();
    }
  });
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

  while (data.remainingBytes > 0 && interactors.length > 0) {
    const chosen =
      interactors[data.consumeIntegralInRange(0, interactors.length - 1)];

    const tag = (
      (await (await chosen.getProperty("tagName")).jsonValue()) as string
    ).toLowerCase();
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
      const out = [
        [...window.__errs],
        [...window.__mp],
        [...window.__traces],
      ] as const;
      window.__errs = [];
      window.__mp.clear();
      window.__traces = [];
      return out;
    });

    for (const { fn, args } of traces) {
      switch (fn) {
        case "traceAndReturn":
          (Fuzzer.tracer.traceAndReturn as any)(...args);
          break;
        case "traceNumberCmp":
          (Fuzzer.tracer.traceNumberCmp as any)(...args);
          break;
        case "traceStrCmp":
          (Fuzzer.tracer.traceStrCmp as any)(...args);
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
