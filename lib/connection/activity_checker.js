var events = require("events");
var util = require("util");

// Allows activity to be registered; if no activity occurs within the timeout,
// a "timeout" event is emitted
function ActivityChecker(timeout) {
  events.EventEmitter.call(this);

  this.timeout = timeout;
}

util.inherits(ActivityChecker, events.EventEmitter);
var prototype = ActivityChecker.prototype;

prototype.activity = function() {
  this.activityAt = Date.now();
};

prototype.start = function() {
  this.activity();

  this.activityCheck = setInterval(function() {
    var sinceActivity = Date.now() - this.activityAt;

    if (sinceActivity > this.timeout) {
      this.emit("timeout", sinceActivity);
    }
  }.bind(this), 1000);
};

prototype.stop = function() {
  if (this.activityCheck) {
    clearInterval(this.activityCheck);
  }
};

module.exports = ActivityChecker;
