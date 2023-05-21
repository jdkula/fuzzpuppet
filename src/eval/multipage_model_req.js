/** @type {import('./model').WebsiteModel} */
const model = {
  start: "A",
  pages: {
    A: {
      elements: [{
        tag: "a",
        destination: "B"
      }, {
        tag: "a",
        destination: "#"
      }, {
        tag: "a",
        destination: "#2"
      }]
    },
    B: {
      elements: [
        {
          tag: "input",
          type: "number",
          value: '',
        },
        {
          tag: "button",
          onClick: () => {
            if (model.pages["B"].elements[0].value > 200) {
              throw new Error("RIP");
            }
          },
        },
      ],
    },
  },
};

module.exports = model;