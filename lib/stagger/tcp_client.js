var events = require("events");
var net = require("net");
var util = require("util");

var Parser = require('../protocol/parser');
var encode = require('../protocol/encoder');

// Manages a TCP connection to stagger, including reconnects
// (De)serialises incoming/outgoing messages
function TcpClient(tags, connectionOpts, timeout) {
  events.EventEmitter.call(this);

  this.tags = tags;
  this.connectionOpts = connectionOpts;
  this.timeout = timeout || 60000;
  this.connected = false;

  this.parser = new Parser();
  this.parser.on("parsed", function(method, body) {
    switch (method) {
      case 'pair:ping':
        this.pong();
        break;
      case 'pair:pong':
        break; // NOOP
      default:
        this.emit("message", method, body);
        break;
    }
  }.bind(this));
  this.parser.on("failed", function(e) {
    console.log("Parse error: " + e);
    this.socket.end(); // will trigger a close event, which will lead to a reconnect
    this.handleShutdown();
    this.parser.reset();
  }.bind(this));

  this.connect();
}

util.inherits(TcpClient, events.EventEmitter);
var prototype = TcpClient.prototype;

prototype.send = function(method, body) {
  if (this.connected) {
    this.socket.write(encode(method, body));
  }
};

// private

prototype.connect = function() {
  var socket = net.connect(this.connectionOpts, function() {
    // on connected
    if (!this.connected) {
      this.connected = true;
      this.emit("connected");
      this.setupActivityCheck();
    }
    this.send("register_process", { "Tags": this.tags });
  }.bind(this));

  socket.on("data", function(buffer) {
    this.parser.feedData(buffer);
    this.resetActivity();
  }.bind(this));

  socket.on("end", function() {
    console.log("Socket closed by peer");
    // socket will have been destroyed because half open connections are not allowed
  }.bind(this));

  socket.on("timeout", function() {
    console.log("Socket timeout");
    socket.end(); // will trigger a close event
  }.bind(this));

  socket.on("error", function(error) {
    console.log("Socket error: " + error);
    socket.destroy();
    // close event will be emitted
  }.bind(this));

  socket.on("close", function(isError) {
    if (isError) {
      console.log("Connection closed with error, reconnecting");
    } else {
      console.log("Connection closed, reconnecting");
    }
    this.handleShutdown();
    this.reconnect();
  }.bind(this));

  this.socket = socket;
};

prototype.reconnect = function () {
  setTimeout(
    function() {
      this.connect();
    }.bind(this),
    1000
  );
};

prototype.ping = function() {
  this.send("pair:ping", {});
};

prototype.pong = function() {
  this.send("pair:pong", {});
};

prototype.resetActivity = function() {
  this.activityAt = Date.now();
};

prototype.setupActivityCheck = function() {
  this.activityCheck = setInterval(function() {
    var now = Date.now();
    var sinceActivity = now - this.activityAt;

    if (sinceActivity > 3 * this.timeout) {
      this.socket.end();
      this.handleShutdown();
    } else {
      this.ping();
    }
  }.bind(this), this.timeout);
};

prototype.handleShutdown = function() {
  if (this.activityCheck) {
    clearInterval(this.activityCheck);
  }
  this.connected = false;
  this.emit("disconnected");
};

module.exports = TcpClient;