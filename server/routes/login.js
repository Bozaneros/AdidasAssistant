/**
 * Created by alejandro on 5/03/17.
 */

const express = require('express');
const router = express.Router();

var user = require('../models/user');

/* GET api listing. */
router.get('/login', (req, res) => {
    var exec = require('child_process').exec;
    var cmd = 'python ../Main.py http://i.imgur.com/JaDWD4t.jpg';

    exec(cmd, function(error, stdout, stderr) {
        console.log(error);
        console.log(stdout);
        console.log(stderr);
    });

});

module.exports = router;
