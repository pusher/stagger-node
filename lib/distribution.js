function Distribution() {
  this.weight = 0;
  this.sum = 0;
  this.sumSquared = 0;
  this.min = null;
  this.max = null;
}

var prototype = Distribution.prototype;

prototype.add = function(x, weight) {
  weight = weight || 1;

  this.weight += weight;
  this.sum += x * weight;
  this.sumSquared += x*x * weight;
  if (this.min === null || x < this.min) {
    this.min = x;
  }
  if (this.max === null || x > this.max) {
    this.max = x;
  }
};

prototype.getMean = function() {
  if (this.weight > 0) {
    return this.sum / this.weight;
  } else {
    return null;
  }
};

prototype.toArray = function() {
  return [this.weight, this.min, this.max, this.sum, this.sumSquared];
};

module.exports = Distribution;
