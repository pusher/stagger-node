var zmq = require('zmq');

var StaggerClient = require('./stagger/client');

var Stagger = {};

Stagger.getZMQ = function() {
  return zmq;
};

Stagger.getDefault = function() {
  if (!this.default) {
    this.default = new StaggerClient(Stagger.getZMQ());
  }
  return this.default;
};

module.exports = Stagger;
