/**
 * Created by alejandro on 3/03/17.
 */

const express = require('express');
const router = express.Router();
const token = require('../core/token');

var post = require('../models/post');
var capture = require('../models/capture');
var shoe = require('../models/shoe');

var randomBegin = ["It appears to be ", "Oh! These are ", "I'm so confident these are ", "Ok, I have found that these are ",
    "Wait a moment! These are the new "];

var randomEnd = [""];

/* GET api listing. */
router.get('/', (req, res) => {
    var exec = require('child_process').exec;
    var cmd = 'python ../main.py ' + url;
    var newCapture = new capture();
    exec(cmd, function(error, stdout, stderr) {
        console.log(error);
        var firstLine = stdout.split('\n')[0];
        var arr = firstLine.split(" ");
        switch(arr[0]) {
            case bb1302:
                newCapture.code = "bb1302";
                break;
            case zxflux:
                newCapture.code = "zxflux";
                break;
            case c77124:
                newCapture.code = "c77124";
                break;
            case ba8278:
                newCapture.code = "ba8278";
                break;
            case bb0008:
                newCapture.code = "bb0008";
                break;
            case bb5477:
                newCapture.code = "bb5477";
                break;
            case boost:
                newCapture.code = "boost";
                break;
            case adidas:
                newCapture.code = "adidas";
                break;
            default:
                break;
        }
        newCapture.score = parseFloat(arr[3].replace(')',''));
        newUser.save(function(err, data){
            if(err){
                console.log(err);
            }
            shoe.findOne({code:newCapture.code}, function(err, data){
                if(err){
                    //Error servidor
                    response = {"error": true, "message": "Fetching error"};
                    res.status(500).json(response);
                } else {
                    var randBegin = randomBegin[Math.floor(Math.random() * randomBegin.length)];
                    response = randBegin + "\"" + data.name + "\"" + ". " + data.description
                        + ". You have them for " + data.price + "€ at adidas.com";
                }
            })
        });
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
