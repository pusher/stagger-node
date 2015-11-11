var msgpack = require('msgpack2');

var constants = require('./constants');

function encode(method, body) {
  var buffer = new Buffer(8);
  buffer.writeUInt16BE(constants.magicBytes, 0);
  buffer.writeUInt8(constants.version, 2);
  buffer.writeUInt8(constants.commands.string2binary[method], 3);
  if (body) {
    var packedBody = msgpack.pack(body);
    buffer.writeUInt32BE(packedBody.length, 4);
    buffer = Buffer.concat([buffer, packedBody], 8 + packedBody.length);
  } else {
    buffer.writeUInt32BE(0, 4);
  }
  return buffer;
}

module.exports = encode;
