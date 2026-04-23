/**
 * A simple Webpack loader that returns an empty export.
 * Used to safely mock Node.js built-ins in the browser.
 */
module.exports = function() {
  return 'export default {};';
};
