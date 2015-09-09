var events = require("events");
var net = require("net");
var util = require("util");

var ActivityChecker = require('./activity_checker')
var Parser = require('../protocol/parser');
var encode = require('../protocol/encoder');

// Manages a TCP connection to stagger, including reconnects
// (De)serialises incoming/outgoing messages
function TcpClient(tags, connectionOpts, timeout, logger) {
  events.EventEmitter.call(this);

  this.tags = tags;
  this.connectionOpts = connectionOpts;
  this.connected = false;

  this.logger = logger;

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
    this.logger.error("Parse error: " + e);
    this.socket.end(); // will trigger a close event, which will lead to a reconnect
    this.handleShutdown();
    this.parser.reset();
  }.bind(this));

  this.activityChecker = new ActivityChecker(timeout);
  this.activityChecker.on("timeout", function(sinceActivity) {
    this.logger.error("Time since activity on socket " + sinceActivity + " greater than limit " + timeout + ". Closing socket");
    this.socket.end();
    this.handleShutdown();
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
      this.activityChecker.start();
    }
    this.send("register_process", { "Tags": this.tags });
  }.bind(this));

  socket.on("data", function(buffer) {
    this.parser.feedData(buffer);
    this.activityChecker.activity();
  }.bind(this));

  socket.on("end", function() {
    this.logger.error("Socket closed by peer");
    // socket will have been destroyed because half open connections are not allowed
  }.bind(this));

  socket.on("timeout", function() {
    this.logger.error("Socket timeout");
    socket.end(); // will trigger a close event
  }.bind(this));

  socket.on("error", function(error) {
    this.logger.error("Socket error: " + error);
    socket.destroy();
    // close event will be emitted
  }.bind(this));

  socket.on("close", function(isError) {
    if (isError) {
      this.logger.error("Connection closed with error, reconnecting");
    } else {
      this.logger.info("Connection closed, reconnecting");
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

prototype.handleShutdown = function() {
  this.connected = false;
  this.activityChecker.stop();
  this.emit("disconnected");
};

module.exports = TcpClient;
