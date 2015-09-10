var StaggerClient = require('./stagger/client');

var Stagger = {};

Stagger.getDefault = function() {
  if (!this.default) {
    this.default = new StaggerClient({
        "pid": process.pid.toString(),
        "cmd": process.argv[0]
      },
      null,
      console
    );
  }
  return this.default;
};

module.exports = Stagger;
