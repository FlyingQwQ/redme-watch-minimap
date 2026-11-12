// Validate dimensions before passing downloaded rasters to the native decoder.
function validRaster(data) {
  var b
  try { b = data instanceof Uint8Array ? data : new Uint8Array(data) } catch (e) { return false }
  if (!b || b.length < 24 || b.length > 131072) return false
  var w = 0
  var h = 0
  if (b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71) {
    if (b.length < 33 || b[4] !== 13 || b[5] !== 10 || b[6] !== 26 || b[7] !== 10 ||
        b[12] !== 73 || b[13] !== 72 || b[14] !== 68 || b[15] !== 82) return false
    w = b[16] * 16777216 + b[17] * 65536 + b[18] * 256 + b[19]
    h = b[20] * 16777216 + b[21] * 65536 + b[22] * 256 + b[23]
  } else if (b[0] === 255 && b[1] === 216) {
    var i = 2
    while (i + 8 < b.length) {
      if (b[i++] !== 255) return false
      while (b[i] === 255) i += 1
      var marker = b[i++]
      if (marker === 218 || marker === 217) return false
      var length = b[i] * 256 + b[i + 1]
      if (length < 2 || i + length > b.length) return false
      if (marker >= 192 && marker <= 207 && marker !== 196 && marker !== 200 && marker !== 204) {
        h = b[i + 3] * 256 + b[i + 4]
        w = b[i + 5] * 256 + b[i + 6]
        break
      }
      i += length
    }
  }
  return w === 256 && h === 256
}
module.exports = validRaster
