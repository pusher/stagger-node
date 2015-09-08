// Binary format of the Stagger TCP mode protocol

// Define these twice in each direction instead of incurring a dependency on a bimap library
var commands = {
  "binary2string": {
    0x28: 'pair:ping',
    0x29: 'pair:pong',
    0x30: 'report_all',
    0x41: 'register_process',
    0x42: 'stats_partial',
    0x43: 'stats_complete'
  },
  "string2binary": {
    "pair:ping": 0x28,
    "pair:pong": 0x29,
    "report_all": 0x30,
    "register_process": 0x41,
    "stats_partial": 0x42,
    "stats_complete": 0x43
  }
};

module.exports = {
  "magicBytes": 0x8384,
  "version": 0x00,
  "commands": commands
};
