/**
 * Created by alejandro on 5/03/17.
 */

const express = require('express');
const router = express.Router();
const config = require('../config/config');
const recast = require('recastai');
const request = require('request');
const util = require('util');

var capture = require('../models/capture');
var shoe = require('../models/shoe');


const getGreetings = require('../intents/greetings');
//const getNotUnderstood = require('../intents/notUnderstood');

const recastClient = new recast.Client(config.recast_dev);

const INTENTS = {
    greetings: getGreetings
};

var randomBegin = ["It appears to be ", "Oh! These are ", "I'm so confident these are ", "Ok, I have found that these are ",
    "Wait a moment! These are the new "];

var randomEnd = [""];

router.get('', function(req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === config.verify_token) {
        console.log("Validating webhook");
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
});

router.post('', function (req, res) {

    var data = req.body;

    // Make sure this is a page subscription
    if (data.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
            var pageID = entry.id;
            var timeOfEvent = entry.time;

            // Iterate over each messaging event
            entry.messaging.forEach(function(event) {

                if (event.message) {
                    receivedMessage(event);
                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know
        // you've successfully received the callback. Otherwise, the request
        // will time out and we will keep trying to resend.
        res.sendStatus(200);
    }
});

function receivedMessage(event) {

    var senderID = event.sender.id;

    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: config.page_token },
        method: 'POST',
        json: {"recipient": {"id": senderID},
            "sender_action":"typing_on"}
    }, function (error, response, body){
        console.log("AAAAAAAAAAAAAAAAAH " + error);
        console.log("BBBBBBBBBBBBBBBBEH " + response);
        console.log("CEEEEEEEEEEEEEEEEH " + body);
    });

    //TODO: Hacer algo con el nombre del usuario (y mas info)
    console.log("Llamando a fb");
    request({
        uri: 'https://graph.facebook.com/v2.6/' + senderID,
        qs: { access_token: config.page_token },
        method: 'GET'
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {

            var userName = JSON.parse(body).first_name;
            var recipientID = event.recipient.id;
            var timeOfMessage = event.timestamp;
            var message = event.message;

            console.log("Received message for user %d and page %d at %d with message:",
                senderID, recipientID, timeOfMessage);
            console.log(JSON.stringify(message));

            var messageId = message.mid;

            var messageText = message.text;
            var messageAttachments = message.attachments;

            if(messageAttachments){
                processAttachment(senderID, messageAttachments);
            } else if (messageText) {

                recastClient.textRequest(messageText)
                    .then(res => {
                        const intent = res.intent();
                        if(intent != null){
                            switch (intent.slug){
                                case 'greetings':
                                    console.log("Sí es un saludo");
                                    sendTextMessage(senderID, INTENTS[intent.slug]());
                                    break;
                                default:
                                    console.log("No es un saludo");
                                    sendTextMessage(senderID, "gilipollas");
                                    break;
                            }
                        } else{
                            console.log("No es un saludo");
                            sendTextMessage(senderID, "gilipollas");
                        }
                    })
                    .catch(() => sendTextMessage(senderID, 'I need some sleep right now... Talk to me later!'));

            }
        } else {
            console.error("Unable to find user");
        }
    });
}

function processAttachment(senderID, messageAttachments){
    console.log(messageAttachments);
    // Iterate over each entry - there may be multiple if batched
    messageAttachments.forEach(function(attachment) {

        switch (attachment.type) {
            case "image":
                var exec = require('child_process').exec;

                var cmd = 'python ../main.py ' + attachment.payload.url;
                var newCapture = new capture();
                exec(cmd, function (error, stdout, stderr) {
                    console.log(error);
                    console.log(stdout);
                    var firstLine = stdout.split('\n')[0];
                    console.log(firstLine);
                    var arr = firstLine.split(" ");
                    switch (arr[0]) {
                        case "bb1302":
                            newCapture.code = "bb1302";
                            break;
                        case "zxflux":
                            newCapture.code = "zxflux";
                            break;
                        case "c77124":
                            newCapture.code = "c77124";
                            break;
                        case "ba8278":
                            newCapture.code = "ba8278";
                            break;
                        case "bb0008":
                            newCapture.code = "bb0008";
                            break;
                        case "bb5477":
                            newCapture.code = "bb5477";
                            break;
                        case "boost":
                            newCapture.code = "boost";
                            break;
                        case "adidas":
                            newCapture.code = "adidas";
                            break;
                        default:
                            break;
                    }
                    newCapture.id = senderID;
                    newCapture.name = "";
                    newCapture.user = "";
                    newCapture.score = parseFloat(arr[3].replace(')', ''));
                    newUser.save(function (err, data) {
                        if (err) {
                            console.log(err);
                        }
                        shoe.findOne({code: newCapture.code}, function (err, data) {
                            if (err) {
                                //Error servidor
                                response = {"error": true, "message": "Fetching error"};
                                res.status(500).json(response);
                            } else {
                                var randBegin = randomBegin[Math.floor(Math.random() * randomBegin.length)];
                                response = randBegin + "\"" + data.name + "\"" + ". " + data.description
                                    + ". You have them for " + data.price + "$ at adidas.com";
                                sendTextMessage(senderID, response);
                            }
                        })
                    });
                    console.log(stdout);
                    console.log(stderr);
                });
                break;
            default:
                sendTextMessage(senderID, "I don't know about this...");
                break;
        }
    });

}

function sendGenericMessage(recipientId, messageText) {
    // To be expanded in later sections
}

function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: config.page_token },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            console.log("Successfully sent generic message with id %s to recipient %s",
                messageId, recipientId);
        } else {
            console.error("Unable to send message.");
            console.error(response);
            console.error(error);
        }
    });
}

module.exports = router;
