var events = require("events");
var msgpack = require('msgpack-lite');
var util = require("util");

var constants = require('./constants');

// Streaming data parser; (un)successful parses are signalled by emitting events
function Parser() {
  events.EventEmitter.call(this);
  // Accumulate raw data from the wire in this buffer
  this.rawData = new Buffer(0);
}

util.inherits(Parser, events.EventEmitter);
var prototype = Parser.prototype;

prototype.feedData = function(buffer) {
  this.rawData = Buffer.concat([this.rawData, buffer]);

  if (this.rawData.length >= 8) {
    var msgLength = 8 + this.rawData.readUInt32BE(4);

    if (this.rawData.length >= msgLength) {
      var toParse = new Buffer(msgLength);
      this.rawData.copy(toParse);

      this.rawData = this.rawData.slice(msgLength, this.rawData.length);

      try {
        var parsed = this.parse(toParse);
        this.emit("parsed", parsed.method, parsed.data);
      } catch (e) {
        this.emit("failed", e);
      }
    }
  }
};

prototype.reset = function() {
  this.rawData = new Buffer(0);
};

// private

prototype.parse = function(buffer) {
  if (buffer.readUInt16BE(0) !== constants.magicBytes) {
    throw "Expected first two bytes to be: " + constants.magicBytes;
  }
  if (buffer.readUInt8(2) !== constants.version) {
    throw "Expected 3rd byte to be the protocol version: " + constants.version;
  }
  var method = buffer.readUInt8(3);
  if (!constants.commands.binary2string[method]) {
    throw "Read unrecognised command: " + method;
  }
  var methodStr = constants.commands.binary2string[method];
  var dataLength = buffer.readUInt32BE(4);

  var unpacked = null;
  if (dataLength > 0) {
    var data = buffer.slice(8, dataLength + 8);
    unpacked = msgpack.decode(data);
  }
  if (unpacked === undefined) {
    throw "Failed to unpack as messagepack data: " + data;
  }
  return { "method": methodStr, "data": unpacked };
};

module.exports = Parser;
