const crypto = require('crypto');

function assignVariant(experimentId, key) {
  const digest = crypto
    .createHash('sha256')
    .update(`${experimentId}:${key}`)
    .digest();
  return (digest[0] % 2 === 0) ? 'control' : 'treatment';
}

module.exports = { assignVariant };
