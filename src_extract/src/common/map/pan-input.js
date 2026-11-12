// Closure state is intentionally outside Vela's observable gesture object.
function create() {
  var x = 0
  var y = 0
  return {
    set: function (nextX, nextY) { x = nextX; y = nextY },
    getX: function () { return x },
    getY: function () { return y },
    read: function () { return { x: x, y: y } },
    reset: function () { x = 0; y = 0 }
  }
}
module.exports = { create: create }
