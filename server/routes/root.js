/**
 * Created by alejandro on 3/03/17.
 */

const express = require('express');
const router = express.Router();
const token = require('../core/token');

var post = require('../models/post');

/* GET api listing. */
router.get('/', (req, res) => {
    var exec = require('child_process').exec;
    var cmd = 'python ../Main.py http://i.imgur.com/JaDWD4t.jpg';

    exec(cmd, function(error, stdout, stderr) {
        console.log(error);
        console.log(stdout);
        console.log(stderr);
    });
});

// Get all posts
//TODO: Leer tokens
router.get('/posts', (req, res) => {

  var response = {};

  //Comprobamos que haya token
  token.checkToken(req, res, function(err, data){
    if(err){
      response = {"error": true, "message": data}
      res.status(403).json(response);
    } else{
      post.find(function (err, data) {
        if(err){
          response = {"error": true, "message": "Error fetching data"};
          res.status(500).json(response);
        } else{
          response = {"error": true, "message": data};
          res.status(200).json(response);
        }
      });
    }
  });
});

module.exports = router;
