import puppeteer, { ElementHandle, HTTPResponse, Page } from "puppeteer";
import { FuzzedDataProvider } from "@jazzer.js/core";
import type * as _ from "../extension";
import * as fs from "node:fs";
import * as path from "node:path";

const transformBundle = fs.readFileSync(
  path.join(__dirname, "..", "browser", "bundle.js"),
  { encoding: "utf-8" }
);

const bundleB64 = Buffer.from(transformBundle).toString("base64");

const pagesBehind = 6;
let nextPages: Array<Promise<readonly [Page, HTTPResponse | null]>> | null =
  null;

let nextId = 0;
let beginnings: Record<string, number> = {};

async function createPage(): Promise<readonly [Page, HTTPResponse | null]> {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      "--disable-web-security",
      `--user-data-dir=/tmp/browser_${Math.floor(Math.random() * (1 << 20))}`,
      "--disable-audio",
    ],
  });
  const page = await browser.newPage();

  page.setRequestInterception(true);

  page.on("request", async (req) => {
    if (req.headers()["accept"]?.includes("text/html")) {
      let resp = await fetch(req.url(), {
        headers: req.headers(),
        method: req.method(),
      });
      const headers: Record<string, unknown> = {};
      for (const [k, v] of resp.headers.entries()) {
        headers[k] = v;
      }
      headers["Access-Control-Allow-Origin"] = "*";
      headers["Access-Control-Allow-Headers"] = "*";
      headers["Access-Control-Allow-Methods"] = "*";
      headers["Access-Control-Allow-Credentials"] = "true";
      headers["Content-Security-Policy"] = "";

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
        /<head(.*?)>/,
        `<head$1>
          <script data-safe type="application/javascript">
            window.__instrument_prep = {
              nextId: ${nextId},
              beginnings: ${JSON.stringify(beginnings)}
            };
          </script>
          <script type="application/javascript" data-safe>eval(atob("${bundleB64}"))</script>`
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

  const res = await page.goto(process.env.TARGET ?? "http://localhost:8080/", {
    waitUntil: "load",
  });

  return [page, res] as const;
}

async function resetPage(
  pageProm: Promise<readonly [Page, HTTPResponse | null]>
): Promise<readonly [Page, HTTPResponse | null]> {
  const [page] = await pageProm;
  const res = await page.goto(process.env.TARGET ?? "http://localhost:8080/", {
    waitUntil: "load",
  });
  return [page, res] as const;
}

let idx = pagesBehind - 1;
async function getPage(): Promise<readonly [Page, HTTPResponse | null]> {
  if (!nextPages) {
    nextPages = [];
    for (let i = 0; i < pagesBehind; i++) {
      nextPages.push(createPage());
    }
  }

  const lastIdx = idx;
  idx--;
  if (idx < 0) idx = pagesBehind - 1;
  nextPages[lastIdx] = resetPage(nextPages[lastIdx]);
  let pageToReturn = nextPages[idx];

  return await pageToReturn;
}

function makeError(errorLike: any) {
  const error = new Error(errorLike.message ?? "");
  error.stack = errorLike.stack ?? undefined;
  (error as any).__real = true;
  return error;
}

export async function getAllInteractors(
  page: Page
): Promise<Array<ElementHandle<HTMLElement>>> {
  const _ = await Promise.all([
    page.$$("button"),
    page.$$("input"),
    page.$$("a"),
  ]);

  let interactors = [..._[0], ..._[1], ..._[2]];
  return interactors;
}

async function updateFuzzerTry(page: Page) {
  const [errs, traces, prep] = await page.evaluate(() => {
    const out = [
      [...window.__errs],
      [...window.__traces],
      window.__instrument_prep,
    ] as const;
    return out;
  });

  Fuzzer.coverageTracker.enlargeCountersBufferIfNeeded(prep.nextId);

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
      case "incrementCounter":
        (Fuzzer.coverageTracker.incrementCounter as any)(...args);
        break;
    }
  }

  beginnings = prep.beginnings;
  nextId = prep.nextId;

  if (errs.length > 0) {
    console.log(errs);
    throw makeError(errs[0]);
  }
}

async function updateFuzzer(page: Page) {
  console.log("Getting ctx");
  let tries = 0;
  while (true) {
    try {
      await page.bringToFront();
      await updateFuzzerTry(page);
      break;
    } catch (e) {
      if ((e as any).__real) throw e;

      tries += 1;
      try {
        await page.waitForNavigation({
          waitUntil: "domcontentloaded",
          timeout: 1000,
        });
      } catch (e) {
        // do nothing
      }
      if (tries === 20) {
        await page.reload({ timeout: 10000, waitUntil: "domcontentloaded" });
      }
      if (tries > 40) {
        console.log("Tries exceeded max", e);
        throw e;
      }
    }
  }
}

export async function fuzz(input: Buffer) {
  const data = new FuzzedDataProvider(input);
  const [page, res] = await getPage();

  if (!res?.ok) {
    throw new Error("Nav failed");
  }

  while (data.remainingBytes > 0) {
    try {
      await updateFuzzer(page);
    } catch (e) {
      if ((e as any).__real) throw e;
      break;
    }
    const interactors = await getAllInteractors(page);
    if (interactors.length <= 0) break;

    const chosen =
      interactors[data.consumeIntegralInRange(0, interactors.length - 1)];

    const { tag, type, href } = await (chosen.evaluate as any)(
      (element: HTMLElement) => ({
        tag: element.tagName?.toLowerCase(),
        type: (element as HTMLInputElement).type?.toLowerCase(),
        href: (element as HTMLAnchorElement).getAttribute("href"),
      })
    );

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
      await (chosen.evaluate as any)((el: HTMLButtonElement) => el.click());
      console.log("button click");
    } else if (tag === "a") {
      console.log("a click ->", href, chosen);
      if (href) {
        console.log("Waiting...");
        try {
          await chosen.click();
        } catch (e) {
          // continue
        }
      }
    }
  }
  try {
    await updateFuzzer(page);
  } catch (e) {
    if ((e as any).__real) throw e;
  }
  console.log("---");
}
