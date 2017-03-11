var mongoose = require('mongoose');

var mongoSchema = mongoose.Schema;

var postSchema = new mongoSchema({
  "title": String,
  "data": String
});

module.exports = mongoose.model('post', postSchema, 'post');
