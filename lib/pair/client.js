var events = require("events");
var util = require("util");

function PairClient(address, pair, timeout) {
  timeout = timeout || 60;

  events.EventEmitter.call(this);

  this.address = address;
  this.pair = pair;
  this.timeout = timeout;
  this.connected = false;

  this.pair.on("message", function(methodBuffer, paramsBuffer) {
    var method = methodBuffer.toString();

    if (!this.connected) {
      this.connected = true;
      this.emit("connected");
      this.setupActivityCheck();
    }

    this.resetActivity();

    switch(method) {
      case "pair:ping":
        this.pong();
        break;
      case "pair:pong":
        break; // NOOP
      case "pair:shutdown":
        this.terminate(0);
        break;
      default:
        this.emit("message", method, paramsBuffer);
        break;
    }
  }.bind(this));
}

util.inherits(PairClient, events.EventEmitter);
var prototype = PairClient.prototype;

prototype.terminate = function(timeSinceActivity) {
  if (this.activityCheck) {
    clearInterval(this.activityCheck);
  }
  this.connected = false;
  this.emit("disconnected", timeSinceActivity);
};

prototype.send = function(method, body) {
  this.pair.send([method, body]);
};

prototype.shutdown = function() {
  this.send("pair:shutdown", "");
};

// private

prototype.ping = function() {
  this.send("pair:ping");
};

prototype.pong = function() {
  this.send("pair:pong");
};

prototype.resetActivity = function() {
  this.activityAt = Date.now();
};

prototype.setupActivityCheck = function() {
  this.activityCheck = setInterval(function() {
    var now = Date.now();
    var sinceActivity = now - this.activityAt;

    if (sinceActivity > 3 * this.timeout) {
      this.terminate(sinceActivity);
    } else {
      this.ping();
    }
  }.bind(this), this.timeout);
};

module.exports = PairClient;
