import { Page } from "puppeteer";
import { FuzzedDataProvider } from "@jazzer.js/core";
import type * as _ from "../extension";
import FuzzManager from "./FuzzManager";
import { FuzzError, getAllInteractors, isDebugMode } from "./utility";

const manager = new FuzzManager();

async function updateSafe(page: Page, manager: FuzzManager) {
  try {
    await manager.updateFuzzer(page);
  } catch (e) {
    if (e instanceof FuzzError) throw e;
  }
}

export async function fuzz(input: Buffer) {
  const data = new FuzzedDataProvider(input);
  const [page, res] = await manager.getPage();

  if (!res?.ok) {
    throw new Error("Nav failed");
  }

  while (data.remainingBytes > 0) {
    await updateSafe(page, manager);
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
        if (isDebugMode()) {
          console.log("text input:", str);
        }
      } else if (type === "number") {
        const num = data.consumeIntegral(3, true).toString();
        await chosen.type(num);
        if (isDebugMode()) {
          console.log("number input:", num);
        }
      }
    } else if (tag === "button") {
      await (chosen.evaluate as any)((el: HTMLButtonElement) => el.click());
      if (isDebugMode()) {
        console.log("button click");
      }
    } else if (tag === "a") {
      if (isDebugMode()) {
        console.log("a click ->", href);
      }
      if (href) {
        try {
          await chosen.click();
        } catch (e) {
          // continue
        }
      }
    }
  }
  await updateSafe(page, manager);
  if (isDebugMode()) {
    console.log("---");
  }
}
