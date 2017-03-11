/**
 * Created by alejandro on 5/03/17.
 */

const express = require('express');
const router = express.Router();
const config = require('../config/config');
const builder = require('botbuilder');
const recast = require('recastai');

const getGreetings = require('../intents/greetings');

const recastClient = new recast.Client(config.recast_dev);

let connector = new builder.ChatConnector({
    appId: config.bot_id,
    appPassword: config.bot_pass
});

router.post('/messages', connector.listen());

const INTENTS = {
    greetings: getGreetings
};

var bot = new builder.UniversalBot(connector, function (session) {
    if(session.message.attachment)

    {
        /*var python = require('child_process').spawn(
            'python',
            // second argument is array of parameters, e.g.:
            ["/main.py"
                , session.message.attachment.contentUrl
            ]
        )
        var output = "";
        python.stdout.on('data', function(data){ output += data });
        python.on('close', function(code){
            if (code !== 0) {
                return res.send(500, code);
            }
            return res.send(200, output);*/
    }

    else{
        recastClient.textRequest(session.message.text)
            .then(res => {
                const intent = res.intent();
                console.log(intent);
                const entity = res.get('trainers');
                if(intent){
                    session.send(INTENTS[intent.slug](entity))
                } else{
                    console.log("askfañsjfd");
                    session.send("hey");
                }
                //session.send(`Entity: ${entity.name}`);
            })
            .catch(() => session.send('I need some sleep right now... Talk to me later!'));
    }
});

module.exports = router;
