/**
 * Created by piraces on 11/03/2017.
 */
var mongoose = require('mongoose');

var mongoSchema = mongoose.Schema;

var captureSchema = new mongoSchema({
    "id": String,
    "user": String,
    "name": String,
    "code": String,
    "score": Number
});

module.exports = mongoose.model('capture', captureSchema);