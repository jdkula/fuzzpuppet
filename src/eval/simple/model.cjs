class Model {
  constructor() {
    this._num = 0;
    this._errored = false;
  }

  setNumber(n) {
    this._num = n
  }

  click() {
    if (this._num >= 200) {
      this._errored = true;
    }
  }

  errored() {
    return this._errored;
  }
}

module.exports = { Model };