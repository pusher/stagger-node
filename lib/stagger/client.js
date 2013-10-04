var StaggerProtocol = require('./protocol');
var StaggerAggregator = require('./aggregator');

function StaggerClient(zmq, registrationAddress) {
  this.zmq = zmq;
  registrationAddress = registrationAddress || "tcp://127.0.0.1:5867";

  this.callbacks = [];
  this.countCallbacks = {};
  this.valueCallbacks = {};
  this.deltaCallbacks = {};

  this.register(registrationAddress);
}

var prototype = StaggerClient.prototype;

prototype.registerCount = function(name, callback) {
  if (this.countCallbacks[name]) {
    throw "Count callback " + name + " has been registered already";
  }
  this.countCallbacks[name] = callback;
};

prototype.registerValue = function(name, callback) {
  if (this.valueCallbacks[name]) {
    throw "Value callback " + name + " has been registered already";
  }
  this.valueCallbacks[name] = callback;
};

prototype.registerDelta = function(name, callback) {
  if (this.deltaCallbacks[name]) {
    throw "Delta callback " + name + " has been registered already";
  }
  this.deltaCallbacks[name] = callback;
};

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
  this.zmqClient = new StaggerProtocol(this.zmq, registrationAddress);

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
  eachPair(this.countCallbacks, function(name, callback) {
    var count = callback();
    if (count) {
      this.incr(name, count);
    }
  }.bind(this));
  eachPair(this.valueCallbacks, function(name, callback) {
    var result = callback();
    if (result) {
      this.value(name, result[0], result[1]);
    }
  }.bind(this));
  eachPair(this.deltaCallbacks, function(name, callback) {
    var delta = callback();
    if (delta) {
      this.delta(name, delta);
    }
  }.bind(this));
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

var eachPair = function(object, callback) {
  for (var key in object) {
    if (object.hasOwnProperty(key)) {
      callback(key, object[key]);
    }
  }
};

module.exports = StaggerClient;
