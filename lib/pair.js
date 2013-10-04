var zmq = require("zmq");

var PairRegistration = require("./pair/registration");

Pair = {};

Pair.registrationAddress = "tcp://127.0.0.1:5867";
Pair.timeout = 1000;

Pair.getDefault = function() {
  if (!this.default) {
    this.default = new PairRegistration(
      zmq,
      this.registrationAddress,
      this.timeout
    );
  }
  return this.default;
};

module.exports = Pair;
