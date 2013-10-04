var Client = require('./client');

function PairRegistration(zmq, registrationAddress, timeout) {
  timeout = timeout || 60000;

  this.zmq = zmq;
  this.registrationAddress = registrationAddress;
  this.timeout = timeout;

  this.registration = this.zmq.socket("push");
  this.registration.setsockopt("linger", 0);
  this.registration.connect(this.registrationAddress);
}

var prototype = PairRegistration.prototype;

prototype.registerClient = function(metadata, callback) {
  metadata = metadata || "";

  var pair = this.zmq.socket("pair");
  pair.setsockopt("linger", 0);
  pair.bind("tcp://127.0.0.1:*", function(error) {
    if (error) {
      callback(error);
      return;
    }

    var address = pair.getsockopt("last_endpoint");
    var client = new Client(address, pair, this.timeout);

    this.register(client, metadata);
    client.on("disconnected", function(error) {
      console.log("Disconnected, register called");
      this.register(client, metadata);
    }.bind(this));

    callback(null, client);
  }.bind(this));
};

prototype.register = function(client, metadata) {
  this.registration.send([client.address, metadata]);
};

prototype.bind = function(callback) {
  registration = this.zmq.socket("pull");
  registration.bind(this.registrationAddress);

  registration.on("message", function(message) {
    var clientAddress = message;
    // message.close

    pair = this.zmq.socket("pair");
    pair.setsockopt("linger", 0);
    pair.connect(clientAddress);

    callback(new Client(clientAddress, pair, this.timeout));
  }.bind(this));
};

module.exports = PairRegistration;
