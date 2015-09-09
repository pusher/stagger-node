var StaggerClient = require('./stagger/client');

var Stagger = {};

var defaultLogger = {
  "debug": console.log,
  "info": console.log,
  "warn": console.error,
  "error": console.error
};

Stagger.getDefault = function() {
  if (!this.default) {
    this.default = new StaggerClient({
        "pid": process.pid.toString(),
        "cmd": process.argv[0]
      },
      null,
      defaultLogger
    );
  }
  return this.default;
};

module.exports = Stagger;
