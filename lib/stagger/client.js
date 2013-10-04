var StaggerProtocol = require('./protocol');
var StaggerAggregator = require('./aggregator');

function StaggerClient(registrationAddress) {
  this.callbacks = [];
  this.countCallbacks = {};
  this.valueCallbacks = {};
  this.deltaCallbacks = {};

  this.register(registrationAddress);
}

var prototype = StaggerClient.prototype;

prototype.incr = function(name, countOrCallback) {
  countOrCallback = countOrCallback || 1;
  if (this.connected) {
    this.aggregator.incr(name, countOrCallback);
  }
};

prototype.value = function(name, valueOrCallback, weight) {
  weight = weight || 1;
  if (this.connected) {
    if (typeof valueOrCallback === "function") {
      var result = valueOrCallback();
      this.aggregator.value(name, result[0], result[1]);
    } else {
      this.aggregator.value(name, valueOrCallback, weight);
    }
  }
};

prototype.delta = function(name, valueOrCallback) {
  if (this.connected) {
    if (typeof valueOrCallback === "function") {
      this.aggregator.delta(name, valueOrCallback());
    } else {
      this.aggregator.delta(name, valueOrCallback);
    }
  }
};

// private

prototype.register = function(registrationAddress) {
  this.zmqClient = new StaggerProtocol(registrationAddress);

  this.zmqClient.on("command", this.command.bind(this));
  this.zmqClient.on("connected", function() {
    this.connected = true;
  }.bind(this));
  this.zmqClient.on("disconnected", function() {
    this.connected = false;
    // Reset data when disconnected so that old (potentially ancient) data
    // isn't sent on reconnect, which would be confusing default behaviour
    // TODO: Maybe make this behaviour configurable?
    this.resetAll();
  }.bind(this));

  this.aggregator = new StaggerAggregator(this.zmqClient);
  this.zmqClient.register();
};

prototype.resetAll = function() {
  this.aggregator.resetAll();
};

prototype.runAndReport = function(timestamp) {
  this.aggregator.report(timestamp, { complete: true });
};

prototype.command = function(method, params) {
  switch(method) {
    case "report_all":
      var timestamp = params.Timestamp;
      this.runAndReport(timestamp);
      break;
    default:
      console.log("Unknown command", method);
      break;
  }
};

module.exports = StaggerClient;
