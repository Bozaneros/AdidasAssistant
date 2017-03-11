/**
 * Created by alejandro on 5/03/17.
 */
var mongoose = require('mongoose');

var mongoSchema = mongoose.Schema;

var userSchema = new mongoSchema({
  "admin": Boolean,
  "username": String,
  "password": String,
  "email": String,
  "registeredOn": Date,
  "lastLoginOn": Date
});

module.exports = mongoose.model('user', userSchema);
