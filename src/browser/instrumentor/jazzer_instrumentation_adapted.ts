/**
 * The code below was inspired by and/or created with heavy reference
 * to Jazzer.js' source code, and adapted to the browser by me.
 */
import type * as types from "@babel/types";
import type { Visitor } from "@babel/core";

export function fakePC(): types.NumericLiteral {
  return {
    type: "NumericLiteral",
    value: window.__compare_counter--,
  };
}

export function addCounterToStmt(stmt: types.Statement): types.Statement {
  const counterStmt = makeCounterIncStmt();
  if (stmt.type === "BlockStatement") {
    const br = stmt;
    br.body.unshift(counterStmt);
    return br;
  } else {
    return {
      type: "BlockStatement",
      body: [counterStmt, stmt],
      directives: [],
    };
  }
}

export function makeCounterIncStmt(): types.ExpressionStatement {
  return {
    type: "ExpressionStatement",
    expression: makeCounterIncExpr(),
  };
}

export function makeCounterIncExpr(): types.CallExpression {
  const id = window.__counter++;
  return {
    type: "CallExpression",
    callee: {
      type: "Identifier",
      name: "Fuzzer.coverageTracker.incrementCounter",
    },
    arguments: [
      {
        type: "NumericLiteral",
        value: id,
      },
    ],
  };
}

export function isStringLiteral(exp: any): exp is types.StringLiteral {
  return exp.type === "StringLiteral";
}
export function isNumericLiteral(exp: any): exp is types.NumericLiteral {
  return exp.type === "NumericLiteral";
}

export function isStringCompare(exp: types.BinaryExpression) {
  // One operand has to be a string literal but not both
  if (
    (!isStringLiteral(exp.left) && !isStringLiteral(exp.right)) ||
    (isStringLiteral(exp.left) && isStringLiteral(exp.right))
  ) {
    return false;
  }

  // Only support equals and not equals operators, the other ones can
  // not be forwarded to libFuzzer
  return ["==", "===", "!=", "!=="].includes(exp.operator);
}

export function isNumberCompare(exp: types.BinaryExpression) {
  // One operand has to be a string literal but not both
  if (
    (!isNumericLiteral(exp.left) && !isNumericLiteral(exp.right)) ||
    (isNumericLiteral(exp.left) && isNumericLiteral(exp.right))
  ) {
    return false;
  }
  return ["==", "===", "!=", "!==", ">", ">=", "<", "<="].includes(
    exp.operator
  );
}

export const jazzerVisitors = {
  Function(path) {
    if (path.node.body.type === "BlockStatement" && !path.shouldSkip) {
      const bodyStmt = path.node.body;
      if (bodyStmt) {
        bodyStmt.body.unshift(makeCounterIncStmt());
      }
    }
  },
  IfStatement(path) {
    path.node.consequent = addCounterToStmt(path.node.consequent);
    if (path.node.alternate) {
      path.node.alternate = addCounterToStmt(path.node.alternate);
    }
    path.insertAfter(makeCounterIncStmt());
  },
  SwitchStatement(path) {
    path.node.cases.forEach((caseStmt) =>
      caseStmt.consequent.unshift(makeCounterIncStmt())
    );
    path.insertAfter(makeCounterIncStmt());

    if (path.node.discriminant.type !== "Identifier") {
      return;
    }
    const id = path.node.discriminant;
    for (const i in path.node.cases) {
      const test = path.node.cases[i].test;
      if (test) {
        path.node.cases[i].test = {
          type: "CallExpression",
          callee: {
            type: "Identifier",
            name: "Fuzzer.tracer.traceAndReturn",
          },
          arguments: [id, test, fakePC()],
        };
      }
    }
  },
  Loop(path) {
    path.node.body = addCounterToStmt(path.node.body);
    path.insertAfter(makeCounterIncStmt());
  },
  TryStatement(path) {
    const catchStmt = path.node.handler;
    if (catchStmt) {
      catchStmt.body.body.unshift(makeCounterIncStmt());
    }
    path.insertAfter(makeCounterIncStmt());
  },
  LogicalExpression(path) {
    if (path.node.left.type === "LogicalExpression") {
      path.node.left = {
        type: "SequenceExpression",
        expressions: [makeCounterIncExpr(), path.node.left],
      };
    }
    if (path.node.right.type !== "LogicalExpression") {
      path.node.right = {
        type: "SequenceExpression",
        expressions: [makeCounterIncExpr(), path.node.right],
      };
    }
  },
  ConditionalExpression(path) {
    path.node.consequent = {
      type: "SequenceExpression",
      expressions: [makeCounterIncExpr(), path.node.consequent],
    };
    path.node.alternate = {
      type: "SequenceExpression",
      expressions: [makeCounterIncExpr(), path.node.alternate],
    };
    if (path.parent.type === "BlockStatement") {
      path.insertAfter(makeCounterIncStmt());
    }
  },
} satisfies Visitor;

export function hookFromBinaryExpression(
  node: types.BinaryExpression
): types.CallExpression | null {
  if (node.left.type === "PrivateName") {
    return null;
  }
  let hookFunctionName;
  if (isStringCompare(node)) {
    hookFunctionName = "Fuzzer.tracer.traceStrCmp";
  } else if (isNumberCompare(node)) {
    hookFunctionName = "Fuzzer.tracer.traceNumberCmp";
  } else {
    return null;
  }

  return {
    type: "CallExpression",
    callee: {
      type: "Identifier",
      name: hookFunctionName,
    },
    arguments: [
      node.left,
      node.right,
      { type: "StringLiteral", value: node.operator },
      fakePC(),
    ],
  };
}
