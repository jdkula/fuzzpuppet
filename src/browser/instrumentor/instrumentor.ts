import * as Babel from "@babel/standalone";
import type * as types from "@babel/types";
import type { Visitor } from "@babel/core";
import type * as _ from "../../extension";

import md5 from "./md5";
import {
  hookFromBinaryExpression,
  isStringLiteral,
  jazzerVisitors,
} from "./jazzer_instrumentation_adapted";

function isEvalCall(exp: types.Expression) {
  return (
    exp.type === "CallExpression" &&
    exp.callee.type === "Identifier" &&
    exp.callee.name === "eval"
  );
}

export function instrument(codeInp: string): string {
  const hash = md5(codeInp);

  let hasHash =
    typeof window.__instrument_prep.beginnings[hash] !== "undefined";

  if (hasHash) {
    window.__counter = window.__instrument_prep.beginnings[hash];
  } else {
    window.__counter = window.__instrument_prep.nextId;
  }

  const startId = window.__counter;

  const { code } = Babel.transform(codeInp, {
    plugins: [
      () => ({
        visitor: {
          ...jazzerVisitors,
          ClassExpression(path) {
            if (path.node.id?.name?.includes("_NOINSTRUMENT_")) {
              path.skip();
            }
          },
          BinaryExpression(path) {
            const hook = hookFromBinaryExpression(path.node);
            if (hook === null) return;

            path.replaceWith({
              type: "ExpressionStatement",
              expression: {
                type: "LogicalExpression",
                operator: "||",
                left: hook,
                right: path.node,
              },
            });
            path.skip();
          },
        } satisfies Visitor,
      }),
    ],
  });

  const endId = window.__counter;

  window.__instrument_prep.beginnings[hash] = endId - startId;

  if (!hasHash) {
    window.__instrument_prep.nextId = window.__counter++;
  } else {
    window.__counter = window.__instrument_prep.nextId;
  }

  const { code: evalInstrumented } = Babel.transform(code!, {
    plugins: [
      () => ({
        visitor: {
          CallExpression(path) {
            if (
              isEvalCall(path.node) &&
              path.node.arguments[0] &&
              isStringLiteral(path.node.arguments[0])
            ) {
              const original = path.node.arguments[0].value;
              path.node.arguments[0].value = instrument(original);
            }
          },
        } satisfies Visitor,
      }),
    ],
  });

  return evalInstrumented!;
}
