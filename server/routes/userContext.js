/**
 * Created by Alejandro on 12/03/2017.
 */
const express = require('express');
const router = express.Router();
var _ = require('lodash');
var config  = require('../config/config');

var context = require('../models/userContext');

router.post('/context', (req, res) => {
    var response = {};

    var newContext = new context();
    newContext.user = req.body.user;
    newContext.lastEntity = req.body.lastEntity;
    newContext.lastMessage = req.body.lastMessage;

    context.findOne({user: newContext.user}, function(err, data){
        if(err){
            response = {"error": true, "message": "Fetching error"};
            res.status(500).json(response);
        } else if(data != undefined){
            response = {"error": true, "message": "El producto ya existe en la base de datos"};
            res.status(303).json(response);
        } else{
            newContext.save(function(err, data){
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

router.get('/context/:id', (req,res) => {

    var response = {};
    var id = req.params.id;
    context.findOne({user: id}, function(err, data){
        if(err){
            response = {"error": true, "message": data};
            res.status(403).json(response);
        } else{
            response = {"error": false, "message": data};
            res.status(200).json(response);
        }
    });
});

router.delete('/context/:id', (req, res) => {

    var response = {};
    var id = req.params.id;
    context.delete({user: id}, function(err, data){
        if(err){
            response = {"error": true, "message": "No se pudo eliminar"};
            res.status(403).json(response);
        } else{
            response = {"error": false, "message": "Se borró el elemento"};
            res.status(200).json(response);
        }
    });

});
