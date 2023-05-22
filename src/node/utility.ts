import { ElementHandle, Page } from "puppeteer";

export class FuzzError extends Error {
  __fuzz_error = true;
}

export function makeError(errorLike: any) {
  const error = new FuzzError(errorLike.message ?? "");
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

export function isDebugMode(): boolean {
  return !!process.env.JAZZER_DEBUG;
}
