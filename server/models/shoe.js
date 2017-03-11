/**
 * Created by piraces on 11/03/2017.
 */
var mongoose = require('mongoose');

var mongoSchema = mongoose.Schema;

var shoeSchema = new mongoSchema({
    "code": String,
    "name": String,
    "price": double,
    "description": String
});

module.exports = mongoose.model('shoe', shoeSchema);