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

const pagesBehind = 2;
let nextPages: Array<Promise<readonly [Page, HTTPResponse | null]>> | null =
  null;

let nextId = 0;
let beginnings: Record<string, number> = {};

async function createPage(): Promise<readonly [Page, HTTPResponse | null]> {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  page.setRequestInterception(true);

  page
    .on('console', message =>
      console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))


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
        `<head>
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

async function updateFuzzer(page: Page) {
  console.log("Getting ctx");

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
        console.log({fn, args});
        (Fuzzer.tracer.traceAndReturn as any)(...args);
        break;
      case "traceNumberCmp":
        console.log({fn, args});
        (Fuzzer.tracer.traceNumberCmp as any)(...args);
        break;
      case "traceStrCmp":
        console.log({fn, args});
        (Fuzzer.tracer.traceStrCmp as any)(...args);
        break;
      case "incrementCounter":
        console.log({fn, args});
        (Fuzzer.coverageTracker.incrementCounter as any)(...args);
        break;
    }
  }

  beginnings = prep.beginnings;
  nextId = prep.nextId;

  if (errs.length > 0) {
    throw makeError(errs[0]);
  }
}

export async function fuzz(input: Buffer) {
  const data = new FuzzedDataProvider(input);
  const [page, res] = await getPage();

  if (!res?.ok) {
    throw new Error("Nav failed");
  }

  while (data.remainingBytes > 0) {
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
      await updateFuzzer(page);
      console.log("a click ->", href, chosen);
      if (href) {
        console.log("Waiting...");
        const currLoc = page.url();
        const [response] = await Promise.all([
          page.waitForNavigation({ waitUntil: "load" }),
          chosen.click(),
        ]);
        console.log(response);
        if (page.url() !== currLoc && response && !response.ok)
          throw new Error("Got non-OK status when navigating");
      }
    }
  }
  await updateFuzzer(page);
  await resetPage(thePage);
  console.log("---");
}

// (async () => {
//   const b = await browser;
//   process.on("exit", () => {
//     b.close();
//   });
//   process.on("SIGINT", () => {
//     b.close();
//   });
//   process.on("uncaughtException", () => {
//     b.close();
//   });
// })();
