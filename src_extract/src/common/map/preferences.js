var Providers = require('./providers')
var KEY = 'map-preferences-v1'
function normalize(value) {
  var input = value || {}
  return {
    sourceId: Providers.get(input.sourceId).id,
    previousSourceId: input.previousSourceId ? Providers.get(input.previousSourceId).id : '',
    hideBottomHint: input.hideBottomHint === true,
    showLoadingIndicators: input.showLoadingIndicators !== false
  }
}
function load(storage, callback) {
  var done = false
  function finish(data) {
    if (done) return
    done = true
    var value = {}
    try { value = JSON.parse(data || '{}') } catch (ignored) {}
    callback(normalize(value))
  }
  try { storage.get({ key: KEY, success: finish, fail: function () { finish('') } }) }
  catch (error) { finish('') }
}
function save(storage, value, success, fail) {
  try { storage.set({ key: KEY, value: JSON.stringify(normalize(value)), success: success, fail: fail }) }
  catch (error) { if (fail) fail(String(error)) }
}
module.exports = { normalize: normalize, load: load, save: save }
