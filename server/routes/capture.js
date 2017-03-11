/**
 * Created by alejandro on 5/03/17.
 */

const express = require('express');
const router = express.Router();
var _ = require('lodash');
var config  = require('../config/config');

var capture = require('../models/capture');

router.get('/capture', (req,res) => {

  var response = {};
    capture.find(function(err, data){
    if(err){
      response = {"error": true, "message": data};
      res.status(403).json(response);
    } else{
      response = {"error": false, "message": data};
      res.status(200).json(response);
    }
  });
});

router.post('/capture', (req, res) => {
  var response = {};

  var newCapture = new capture();
    newCapture.code = req.body.code;
    newCapture.name = req.body.name;
    newCapture.price = req.body.price;
    newCapture.description = req.body.description;
    newCapture.imageUrl = req.body.imageUrl;
    newCapture.itemUrl = req.body.itemUrl;

    capture.findOne({$or:[
      {code:code}, {name:name}
      ]}, function(err, data){
      if(err){
        response = {"error": true, "message": "Fetching error"};
        res.status(500).json(response);
      } else if(data != undefined){
        response = {"error": true, "message": "El producto ya existe en la base de datos"};
        res.status(303).json(response);
      } else{
        newCapture.save(function(err, data){
            if(err){
                response = {"error": true, "message": "Error registrando producto"};
                res.status(500).json(response);
            } else{
                response = {"error": false, "message": "Producto ya registrado"};
                res.status(200).json(response);
            }
        });
      }
  });
});

router.get('/capture/:id', (req,res) => {

    var response = {};
    capture.findOne({id: id}, function(err, data){
        if(err){
            response = {"error": true, "message": data};
            res.status(403).json(response);
        } else{
            response = {"error": false, "message": data};
            res.status(200).json(response);
        }
    });
});

router.delete('/capture/:id', (req, res) => {

  var response = {};

  capture.delete({id: id}, function(err, data){
    if(err){
      response = {"error": true, "message": "No se pudo eliminar"};
      res.status(403).json(response);
    } else{
      response = {"error": false, "message": "Se borró el elemento"};
      res.status(200).json(response);
    }
  });

});

router.delete('/capture', (req, res) => {

    var response = {};

    capture.delete({}, function(err, data){
        if(err){
            response = {"error": true, "message": "No se pudo eliminar"};
            res.status(403).json(response);
        } else{
            response = {"error": false, "message": "Se borró el elemento"};
            res.status(200).json(response);
        }
    });
});

module.exports = router;
