var jwt = require('jsonwebtoken');
var _ = require('lodash');
var config  = require('../config/config');

/**
 * Creates a token
 */
function createToken(user) {
  return jwt.sign(_.omit(user, 'password'), config.secret, { expiresIn: 3600 });
}


/**
 * Checks the token
 */
function checkToken(req, res, callback) {

  // check header or url parameters or post parameters for token
  let token = req.body.token ||
    req.query.token ||
    req.headers['authorization'];

  if (token) {
    // if there is no token
    // return an error

    // verifies secret and checks exp
    jwt.verify(token, config.secret, function(err, decoded) {
      if (err) {
        callback(false, "Failed to authenticate token");
      } else {
        // if everything is good, save to request for use in other routes
        callback(false, decoded);
      }
    });
  } else {
    callback(true, "No token provided");
  }
}

module.exports.createToken = createToken;
module.exports.checkToken = checkToken;
