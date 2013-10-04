var events = require('events');
var util = require('util');

var msgpack = require('msgpack2');

var PairRegistration = require('../pair/registration');

function StaggerProtocol(zmq, registrationAddress) {
  events.EventEmitter.call(this);

  this.zmq = zmq;
  this.registrationAddress = registrationAddress;
}

util.inherits(StaggerProtocol, events.EventEmitter);
var prototype = StaggerProtocol.prototype;

prototype.register = function(callback) {
  this.registerPair(function(error, pair) {
    if (error) {
      if (callback) {
        callback(error);
      }
      return;
    }
    this.pair = pair;
    if (callback) {
      callback(null);
    }
  }.bind(this));
};

prototype.registerPair = function(callback) {
  var registration = new PairRegistration(
    this.zmq,
    this.registrationAddress,
    13000
  );
  registration.registerClient("", function(error, client) {
    if (error) {
      callback(error);
      return;
    }

    client.on("connected", this.emit.bind(this, "connected"));
    client.on("disconnected", this.emit.bind(this, "disconnected"));
    client.on("message", this.command.bind(this));

    callback(null, client);
  }.bind(this));
};

prototype.shutdown = function() {
  this.pair.shutdown();
};

prototype.command = function(method, msgpackParams) {
  var params = {};
  if (msgpackParams.length > 0) {
    params = msgpack.unpack(msgpackParams);
  }

  this.emit("command", method, params);
};

prototype.sendMessage = function(message, body) {
  this.pair.send(message, msgpack.pack(body));
};

module.exports = StaggerProtocol;
