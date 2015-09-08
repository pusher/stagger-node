var Delta = require('../delta');
var Distribution = require('../distribution');

function StaggerAggregator(tcpClient) {
  this.tcpClient = tcpClient;
  this.resetAll();
}

var prototype = StaggerAggregator.prototype;

prototype.resetAll = function() {
  this.deltas = {};
  this.resetData();
};

prototype.resetData = function() {
  this.counters = {};
  this.values = {};
};

prototype.incr = function(name, countOrCallback) {
  var count;
  if (typeof countOrCallback === "function") {
    count = countOrCallback();
  } else {
    count = countOrCallback;
  }

  if (count && count > 0) {
    this.counters[name] = this.counters[name] || 0;
    this.counters[name] += count;
  }
};

prototype.value = function(name, valueOrCallback, weight) {
  var value;
  if (typeof valueOrCallback === "function") {
    var result = valueOrCallback();
    value = result[0];
    weight = result[1];
  } else {
    value = valueOrCallback;
    weight = weight || 1;
  }

  if (value) {
    this.values[name] = this.values[name] || new Distribution();
    this.values[name].add(value, weight);
  }
};

prototype.delta = function(name, valueOrCallback) {
  var value;
  if (typeof valueOrCallback === "function") {
    value = valueOrCallback();
  } else {
    value = valueOrCallback;
  }

  this.deltas[name] = this.deltas[name] || new Delta();
  this.incr(name, this.deltas[name].delta(value));
};

prototype.deltaValue = function(name, value, weight) {
  this.deltas[name] = this.deltas[name] || new Delta();
  this.value(name, this.deltas[name].delta(value), weight || 1);
};

prototype.report = function(timestamp, options) {
  var method = options.complete ? "stats_complete" : "stats_partial";
  var body = {
    Timestamp: timestamp,
    Counts: objectMap(this.counters, function(name, count) {
      return { Name: name, Count: count };
    }),
    Dists: objectMap(this.values, function(name, distribution) {
      return { Name: name, Dist: distribution.toArray() };
    }),
  };

  this.tcpClient.send(method, body);
  this.resetData();
};

var objectMap = function(object, callback) {
  var result = [];
  for (var key in object) {
    if (object.hasOwnProperty(key)) {
      result.push(callback(key, object[key]));
    }
  }
  return result;
};

module.exports = StaggerAggregator;
