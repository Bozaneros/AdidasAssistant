/**
 * Created by Alejandro on 12/03/2017.
 */
var mongoose = require('mongoose');

var mongoSchema = mongoose.Schema;

var contextSchema = new mongoSchema({
    "user": String,
    "lastEntity": String,
    "lastMessage": String
});

module.exports = mongoose.model('context', contextSchema, 'context');