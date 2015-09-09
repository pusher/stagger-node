var async = require('async');

var TCPClient = require('./tcp_client');
var StaggerAggregator = require('./aggregator');

function StaggerClient(tags, connectionOpts, logger) {
  this.callbacks = [];
  this.countCallbacks = {};
  this.valueCallbacks = {};
  this.deltaCallbacks = {};

  this.logger = logger;

  this.register(tags || {}, connectionOpts || { host: "127.0.0.1", port: 5865 });
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

prototype.registerCallback = function(callback) {
  this.callbacks.push([callback, new StaggerAggregator(this.tcpClient)]);
};

prototype.incr = function(name, countOrCallback) {
  if (this.connected) {
    this.aggregator.incr(name, countOrCallback || 1);
  }
};

prototype.value = function(name, valueOrCallback, weight) {
  if (this.connected) {
    this.aggregator.value(name, valueOrCallback, weight || 1);
  }
};

prototype.delta = function(name, valueOrCallback) {
  if (this.connected) {
    this.aggregator.delta(name, valueOrCallback);
  }
};

// private

prototype.register = function(tags, connectionOpts) {
  this.tcpClient = new TCPClient(tags, connectionOpts, 13000, this.logger);

  this.tcpClient.on("message", this.command.bind(this));
  this.tcpClient.on("connected", function() {
    this.connected = true;
  }.bind(this));
  this.tcpClient.on("disconnected", function() {
    this.connected = false;
    // Reset data when disconnected so that old (potentially ancient) data
    // isn't sent on reconnect, which would be confusing default behaviour
    // TODO: Maybe make this behaviour configurable?
    this.resetAll();
  }.bind(this));

  this.aggregator = new StaggerAggregator(this.tcpClient);
};

prototype.resetAll = function() {
  this.aggregator.resetAll();
};

prototype.runAndReportMain = function(timestamp, aggregatorOptions) {
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
  this.aggregator.report(timestamp, aggregatorOptions);
};

prototype.runAndReportCallbacks = function(timestamp) {
  async.eachLimit(this.callbacks, 10, function(item, next) {
    var callback = item[0];
    var aggregator = item[1];

    callback(aggregator, function() {
      aggregator.report(timestamp, {
        complete: false,
      });
      next();
    });
  }, function() {
    new StaggerAggregator(this.tcpClient).report(timestamp, {
      complete: true,
    });
  }.bind(this));
};

prototype.command = function(method, params) {
  switch(method) {
    case "report_all":
      var timestamp = params.Timestamp;
      if (this.callbacks.length > 0) {
        this.runAndReportMain(timestamp, {
          complete: false,
        });
        this.runAndReportCallbacks(timestamp, {
          complete: false,
        });
      } else {
        this.runAndReportMain(timestamp, {
          complete: true,
        });
      }
      break;
    default:
      this.logger.error("Unknown command", method);
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
