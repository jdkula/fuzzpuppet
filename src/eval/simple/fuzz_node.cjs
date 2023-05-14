const { FuzzedDataProvider } = require("@jazzer.js/core");

const { Model } = require("./model.cjs");

/**
 * @param {Buffer} data
 */
async function fuzz(input) {
  const model = new Model();
  const data = new FuzzedDataProvider(input);
  const _ = [
    [
      {
        type: (n) => model.setNumber(parseInt(n)),
        getProperty: (x) => ({
          jsonValue: () => (x === "tagName" ? "input" : "number"),
        }),
      },
    ],
    [
      {
        click: () => model.click(),
        getProperty: (x) => ({
          jsonValue: () => (x === "tagName" ? "button" : "xxx"),
        }),
      },
    ],
  ];
  const interactors = [..._[0], ..._[1]];

  while (data.remainingBytes > 0) {
    const chosen =
      interactors[data.consumeIntegralInRange(0, interactors.length - 1)];

    const tag = (
      await (await chosen.getProperty("tagName")).jsonValue()
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

    if (model.errored()) {
      throw new Error();
    }
  }

  console.log("---");
}

module.exports = { fuzz };