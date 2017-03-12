/**
 * Created by alejandro on 5/03/17.
 */

const express = require('express');
const router = express.Router();
var _ = require('lodash');
var config  = require('../config/config');

var shoe = require('../models/shoe');

router.get('/shoe', (req,res) => {

  var response = {};
  shoe.find(function(err, data){
    if(err){
      response = {"error": true, "message": data};
      res.status(403).json(response);
    } else{
      response = {"error": false, "message": data};
      res.status(200).json(response);
    }
  });
});

router.post('/shoe', (req, res) => {
  var response = {};

  var newShoe = new shoe();
  console.log(req.body.code);
  newShoe.code = req.body.code;
  newShoe.name = req.body.name;
  newShoe.price = req.body.price;
  newShoe.description = req.body.description;
  newShoe.imageUrl = req.body.imageUrl;
  newShoe.itemUrl = req.body.itemUrl;

  shoe.findOne({code: newShoe.code}, function(err, data){
      if(err){
        response = {"error": true, "message": "Fetching error"};
        res.status(500).json(response);
      } else if(data != undefined){
        response = {"error": true, "message": "El producto ya existe en la base de datos"};
        res.status(303).json(response);
      } else{
        newShoe.save(function(err, data){
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

router.get('/shoe/:code', (req,res) => {

    var response = {};
    var code = req.params.code;
    shoe.findOne({code: code}, function(err, data){
        if(err){
            response = {"error": true, "message": data};
            res.status(403).json(response);
        } else{
            response = {"error": false, "message": data};
            res.status(200).json(response);
        }
    });
});

router.delete('/shoe/:code', (req, res) => {

  var response = {};

  var code = req.params.code;
  shoe.remove({code: code}, function(err, data){
    if(err){
      response = {"error": true, "message": "No se pudo eliminar"};
      res.status(403).json(response);
    } else{
      response = {"error": false, "message": "Se borró el elemento"};
      res.status(200).json(response);
    }
  });

});

router.delete('/shoe', (req, res) => {

    var response = {};

    shoe.remove({}, function(err, data){
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
