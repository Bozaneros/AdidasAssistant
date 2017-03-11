/**
 * Created by alejandro on 5/03/17.
 */

const express = require('express');
const router = express.Router();
const config = require('../config/config');
const recast = require('recastai');
const request = require('request');
const util = require('util');

const getGreetings = require('../intents/greetings');
//const getNotUnderstood = require('../intents/notUnderstood');

const recastClient = new recast.Client(config.recast_dev);

const INTENTS = {
    greetings: getGreetings
};

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
    sendTextMessage(senderID, "Attachments eh");
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
