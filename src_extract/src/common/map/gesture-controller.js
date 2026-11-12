function getTouch(event, identifier) {
  var touches = event && event.touches ? event.touches : []
  for (var i = 0; i < touches.length; i += 1) {
    if (identifier === undefined || touches[i].identifier === identifier) return touches[i]
  }
  return null
}

function getPoint(touch, viewport) {
  if (!touch) return null
  var rect = viewport || { left: 0, top: 0 }
  return {
    x: Number(touch.clientX) - (Number(rect.left) || 0),
    y: Number(touch.clientY) - (Number(rect.top) || 0),
    identifier: touch.identifier
  }
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function distance(a, b) {
  var dx = a.x - b.x
  var dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function pinchScale(startDistance, currentDistance) {
  if (!(startDistance > 0) || !(currentDistance > 0)) return 1
  return Math.max(0.6, Math.min(1.7, currentDistance / startDistance))
}

function centerAfterPinch(anchorWorld, startCentroid, currentCentroid, scale, oldZoom, newZoom, viewportWidth, viewportHeight) {
  var safeScale = Math.max(0.0001, Number(scale) || 1)
  var zoomFactor = Math.pow(2, newZoom - oldZoom)
  var worldAtCurrentCentroid = {
    x: (anchorWorld.x + currentCentroid.x - startCentroid.x) / safeScale * zoomFactor,
    y: (anchorWorld.y + currentCentroid.y - startCentroid.y) / safeScale * zoomFactor
  }
  return {
    x: worldAtCurrentCentroid.x - (currentCentroid.x - viewportWidth / 2),
    y: worldAtCurrentCentroid.y - (currentCentroid.y - viewportHeight / 2)
  }
}

module.exports = {
  getTouch: getTouch,
  getPoint: getPoint,
  midpoint: midpoint,
  distance: distance,
  pinchScale: pinchScale,
  centerAfterPinch: centerAfterPinch
}
