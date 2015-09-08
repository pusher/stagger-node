
var Stagger = require('./lib/stagger');

var stagger = Stagger.getDefault();

// function is called when report is requested
stagger.registerCount('count0', function() {
  return 1;
});

var cbCount = 0;
stagger.registerCallback(function(aggregator, callback) {
  aggregator.incr("count1", cbCount);
  callback();
});

setInterval(function () {
  var r = Math.random() * 100000;
  stagger.incr("count2", r);
  stagger.incr("count3", 20);
  stagger.delta("delta1", r);
  stagger.value("dist0", r, 1);
  stagger.value("dist1", r - 100000, 1);
  cbCount += 1;
}, 1000);
