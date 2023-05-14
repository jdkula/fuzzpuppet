/** @type {import('./model').WebsiteModel} */
const model = {
  start: "A",
  pages: {
    A: {
      elements: [
        {
          tag: "input",
          type: "number",
          value: undefined,
        },
        {
          tag: "button",
          onClick: () => {
            if (model.pages["A"].elements[0].value > 200) {
              throw new Error("RIP");
            }
          },
        },
      ],
    },
  },
};

model;