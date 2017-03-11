/**
 * Created by alejandro on 5/03/17.
 */

const express = require('express');
const router = express.Router();
const config = require('../config/config');
const builder = require('botbuilder');

let connector = new builder.ChatConnector({
    appId: config.bot_id,
    appPassword: config.bot_pass
});

router.post('/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
    session.send("hola");
});

module.exports = router;
