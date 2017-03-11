/**
 * Created by alejandro on 5/03/17.
 */

const express = require('express');
const router = express.Router();
var bcrypt = require('bcryptjs');
var _ = require('lodash');
var config  = require('../config/config');
var token = require('../core/token');

var user = require('../models/user');

/* GET api listing. */
router.post('/register', (req, res) => {
  var response = {};

  //Datos registro
  var username = req.body.username;
  var password = req.body.password;
  var email = req.body.email;

  //Comprobar que no exista email
  user.findOne({$or:[
      {username:username},
      {email:email}
    ]}, function(err, data){
      if(err){

        //Error servidor
        response = {"error": true, "message": "Fetching error"};
        res.status(500).json(response);
      } else if(data != undefined){

        //Correo o nombre de usuario en uso
        response = {"error": true, "message": "Nombre de usuario o correo electrónico en uso"};
        res.status(303).json(response);
      } else{

        //Registrar
        //Encriptar pass
        bcrypt.hash(password, 10, function(err, hash){
          var newUser = new user();
          newUser.admin = false;
          newUser.email = email;
          newUser.username = username;
          newUser.password = hash;
          newUser.registeredOn = Date.now();
          newUser.lastLoginOn = newUser.registeredOn;

          newUser.save(function(err, data){
            if(err){
              response = {"error": true, "message": "Error registrando usuario"};
              res.status(500).json(response);
            } else{
              response = {"error": false, "message": token.createToken(newUser)};
              res.status(200).json(response);
            }
          });
        });
      }
    })
});

module.exports = router;
