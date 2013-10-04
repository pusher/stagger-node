function Delta() {
  this.value = null;
}

var prototype = Delta.prototype;

prototype.delta = function(value) {
  var delta = value - this.value;
  if (this.value && delta >= 0) {
    this.value = value;
    return delta;
  } else {
    this.value = value;
    return null;
  }
};

module.exports = Delta;
