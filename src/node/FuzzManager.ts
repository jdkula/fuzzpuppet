import puppeteer, { Browser, HTTPRequest, HTTPResponse, Page } from "puppeteer";
import type * as _ from "../extension";
import * as fs from "node:fs";
import * as path from "node:path";
import { makeError } from "./utility";

const transformBundle = fs.readFileSync(
  path.join(__dirname, "..", "browser", "bundle.js"),
  { encoding: "utf-8" }
);

const bundleB64 = Buffer.from(transformBundle).toString("base64");

const PAGES_BEHIND = parseInt(process.env.PAGES_BEHIND ?? "6");
type PageSetupResponse = readonly [Page, HTTPResponse | null];

export default class FuzzManager {
  private nextId: number = 0;
  private nextIdx: number = 0;
  private beginnings: Record<string, number> = {};
  private nextQ: Array<Promise<PageSetupResponse>> = [];

  private setupClosure(browser: Browser) {
    process.setMaxListeners(1000)
    process.on("uncaughtException", () => {
      browser.close();
    });
    process.on("SIGINT", () => {
      browser.close();
    });
    process.on("SIGUSR1", () => {
      browser.close();
    });
    process.on("SIGUSR2", () => {
      browser.close();
    });
    process.on("SIGABRT", () => {
      browser.close();
    });
  }

  private onRequest = async (req: HTTPRequest) => {
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
            nextId: ${this.nextId},
            beginnings: ${JSON.stringify(this.beginnings)}
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
  };

  async createPage(): Promise<PageSetupResponse> {
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--disable-web-security",
        `--user-data-dir=/tmp/browser_${Math.floor(Math.random() * (1 << 20))}`,
        "--disable-audio",
      ],
    });
    this.setupClosure(browser);

    const page = await browser.newPage();
    page.setRequestInterception(true);
    page.on("request", this.onRequest);

    const res = await page.goto(
      process.env.TARGET ?? "http://localhost:8080/",
      {
        waitUntil: "load",
      }
    );

    return [page, res] as const;
  }

  async resetPage(
    pageProm: Promise<readonly [Page, HTTPResponse | null]>
  ): Promise<readonly [Page, HTTPResponse | null]> {
    const [page] = await pageProm;
    const res = await page.goto(
      process.env.TARGET ?? "http://localhost:8080/",
      {
        waitUntil: "load",
      }
    );
    return [page, res] as const;
  }

  async getPage(): Promise<readonly [Page, HTTPResponse | null]> {
    let curLen = this.nextQ.length;
    if (curLen < PAGES_BEHIND) {
      for (let i = 0; i < (PAGES_BEHIND - curLen); i++) {
        this.nextQ.push(this.createPage());
      }
    }

    const lastIdx = this.nextIdx;
    this.nextIdx--;
    if (this.nextIdx < 0) this.nextIdx = PAGES_BEHIND - 1;

    this.nextQ[lastIdx] = this.resetPage(this.nextQ[lastIdx]);
    let pageToReturn = this.nextQ[this.nextIdx];

    const pgRet = await pageToReturn;

    console.log(pgRet);
    return pgRet;
  }

  private async updateFuzzerTry(page: Page) {
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

    this.beginnings = prep.beginnings;
    this.nextId = prep.nextId;

    if (errs.length > 0) {
      console.log(errs);
      throw makeError(errs[0]);
    }
  }

  async updateFuzzer(page: Page) {
    console.log("Getting ctx");
    let tries = 0;
    while (true) {
      try {
        await page.bringToFront();
        await this.updateFuzzerTry(page);
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
}
