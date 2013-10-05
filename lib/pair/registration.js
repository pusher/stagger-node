var Client = require('./client');

function PairRegistration(zmq, registrationAddress, timeout) {
  this.zmq = zmq;
  this.registrationAddress = registrationAddress;
  this.timeout = timeout || 60000;

  this.registration = this.zmq.socket("push");
  this.registration.setsockopt("linger", 0);
  this.registration.connect(this.registrationAddress);
}

var prototype = PairRegistration.prototype;

prototype.registerClient = function(metadata, callback) {
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
  var registrationSocket = this.zmq.socket("pull");
  registrationSocket.bind(this.registrationAddress);

  registrationSocket.on("message", function(clientAddress) {
    var pairSocket = this.zmq.socket("pair");
    pairSocket.setsockopt("linger", 0);
    pairSocket.connect(clientAddress);

    callback(new Client(clientAddress, pairSocket, this.timeout));
  }.bind(this));
};

module.exports = PairRegistration;
