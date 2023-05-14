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
          tag: "input",
          type: "number",
          value: undefined,
        },
        {
          tag: "input",
          type: "number",
          value: undefined,
        },
        {
          tag: "input",
          type: "number",
          value: undefined,
        },
        {
          tag: "input",
          type: "number",
          value: undefined,
        },
        {
          tag: "button",
          onClick: () => {
            const value0 = model.pages["A"].elements[0].value;
            const value1 = model.pages["A"].elements[1].value;
            const value2 = model.pages["A"].elements[2].value;
            const value3 = model.pages["A"].elements[3].value;
            const value4 = model.pages["A"].elements[4].value;

            if (value0 > 0) {
              console.log("Branch Found ->", 0);
              if (value1 > 0) {
                console.log("Branch Found ->", 1);
                if (value2 > 0) {
                  console.log("Branch Found ->", 2);
                  if (value3 > 0) {
                    console.log("Branch Found ->", 3);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 4);
                    } else {
                      console.log("Branch Found ->", 5);
                    }
                  } else {
                    console.log("Branch Found ->", 6);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 7);
                    } else {
                      console.log("Branch Found ->", 8);
                    }
                  }
                } else {
                  console.log("Branch Found ->", 9);
                  if (value3 > 0) {
                    console.log("Branch Found ->", 10);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 11);
                    } else {
                      console.log("Branch Found ->", 12);
                    }
                  } else {
                    console.log("Branch Found ->", 13);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 14);
                    } else {
                      console.log("Branch Found ->", 15);
                    }
                  }
                }
              } else {
                console.log("Branch Found ->", 16);
                if (value2 > 0) {
                  console.log("Branch Found ->", 17);
                  if (value3 > 0) {
                    console.log("Branch Found ->", 18);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 19);
                    } else {
                      console.log("Branch Found ->", 20);
                    }
                  } else {
                    console.log("Branch Found ->", 21);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 22);
                    } else {
                      console.log("Branch Found ->", 23);
                    }
                  }
                } else {
                  console.log("Branch Found ->", 24);
                  if (value3 > 0) {
                    console.log("Branch Found ->", 25);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 26);
                    } else {
                      console.log("Branch Found ->", 27);
                    }
                  } else {
                    console.log("Branch Found ->", 28);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 29);
                    } else {
                      console.log("Branch Found ->", 30);
                    }
                  }
                }
              }
            } else {
              console.log("Branch Found ->", 31);
              if (value1 > 0) {
                console.log("Branch Found ->", 32);
                if (value2 > 0) {
                  console.log("Branch Found ->", 33);
                  if (value3 > 0) {
                    console.log("Branch Found ->", 34);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 35);
                    } else {
                      console.log("Branch Found ->", 36);
                    }
                  } else {
                    console.log("Branch Found ->", 37);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 38);
                    } else {
                      console.log("Branch Found ->", 39);
                    }
                  }
                } else {
                  console.log("Branch Found ->", 40);
                  if (value3 > 0) {
                    console.log("Branch Found ->", 41);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 42);
                    } else {
                      console.log("Branch Found ->", 43);
                    }
                  } else {
                    console.log("Branch Found ->", 44);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 45);
                    } else {
                      console.log("Branch Found ->", 46);
                    }
                  }
                }
              } else {
                console.log("Branch Found ->", 47);
                if (value2 > 0) {
                  console.log("Branch Found ->", 48);
                  if (value3 > 0) {
                    console.log("Branch Found ->", 49);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 50);
                    } else {
                      console.log("Branch Found ->", 51);
                    }
                  } else {
                    console.log("Branch Found ->", 52);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 53);
                    } else {
                      console.log("Branch Found ->", 54);
                    }
                  }
                } else {
                  console.log("Branch Found ->", 55);
                  if (value3 > 0) {
                    console.log("Branch Found ->", 56);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 57);
                    } else {
                      console.log("Branch Found ->", 58);
                    }
                  } else {
                    console.log("Branch Found ->", 59);
                    if (value4 > 0) {
                      console.log("Branch Found ->", 60);
                    } else {
                      console.log("Branch Found ->", 61);
                    }
                  }
                }
              }
            }
          },
        },
      ],
    },
  },
};

model;
