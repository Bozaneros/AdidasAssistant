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
const getAskForModel= require('../intents/askformodel');
//const getNotUnderstood = require('../intents/notUnderstood');

const recastClient = new recast.Client(config.recast_dev);

const INTENTS = {
    greetings: getGreetings,
    askformodel: getAskForModel
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

                if(event.postback){
                    console.log(event);
                    managePostBack(event);
                } else if (event.message) {
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

    sendLoading(senderID);

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

            if (messageAttachments) {
                processAttachment(senderID, messageAttachments, userName);
            } else if(isUrl(messageText)){
                processUrl(senderID, messageText, userName);
            } else if (messageText) {

                recastClient.textRequest(messageText)
                    .then(res => {
                        const intent = res.intent();
                        if (intent != null) {
                            switch (intent.slug) {
                                case 'greetings':
                                    console.log("Sí es un saludo");
                                    sendTextMessage(senderID, INTENTS[intent.slug]());
                                    break;
                                case 'askformodel':
                                    console.log('Está pidiendo info de un modelo');
                                    sendCardMessage(senderID);
                                    break;
                                case 'help':
                                    console.log("Está pidiendo ayuda");
                                    showHelpOptions(senderID);
                                    break;
                                default:
                                    console.log("No es un saludo");
                                    sendTextMessage(senderID, "gilipollas");
                                    break;
                            }
                        } else {
                            console.log("No es un saludo");
                            sendTextMessage(senderID, "gilipollas");
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                        sendTextMessage(senderID, 'I need some sleep right now... Talk to me later!');
                    });
            }
        } else {
            console.error("Unable to find user");
        }
    });
}

function processAttachment(senderID, messageAttachments, userName){
    console.log(messageAttachments);

    // Iterate over each entry - there may be multiple if batched
    var threshold = 0.1;
    messageAttachments.forEach(function(attachment) {
        var imageUrl = attachment.url || attachment.payload.url;
        switch (attachment.type) {
            case "fallback":
                imageUrl = attachment.url;
                imageUrl = imageUrl.replace("https://l.facebook.com/l.php?u=", "");
                imageUrl = decodeURIComponent(imageUrl);
            case "image":
                var exec = require('child_process').exec;

                var cmd = 'python ../main.py ' + "\"" + imageUrl + "\"";
                var newCapture = new capture();
                exec(cmd, function (error, stdout, stderr) {
                    console.log("Error" + error);
                    console.log("Stdout: " + stdout);
                    var firstLine = stdout.split('\n')[0];
                    console.log("First Line: " + firstLine);
                    var arr = firstLine.split(" ");
                    console.log("Arr: " + arr);
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
                    newCapture.name = userName;
                    newCapture.score = parseFloat(arr[3].replace(')', ''));
                    newCapture.save(function (err, data) {
                        if (err) {
                            console.log(err);
                        }
                        console.log(newCapture);
                        shoe.findOne({'code': newCapture.code}, function (err, data) {
                            if (err) {
                                //Error servidor
                                response = {"error": true, "message": "Fetching error"};
                                res.status(500).json(response);
                            } else {
                                if(newCapture.score < threshold){

                                } else {
                                    var randBegin = randomBegin[Math.floor(Math.random() * randomBegin.length)];
                                    var response = randBegin + "\"" + data.name + "\"" + ". " + data.description
                                        + ". You have them for " + data.price + "$ at adidas.com";
                                    sendTextMessage(senderID, response);
                                }
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

function processUrl(senderID, messageAttachments, userName){
    console.log(messageAttachments);
    var exec = require('child_process').exec;

    var cmd = 'python ../main.py ' + "\"" + messageAttachments + "\"";
    var newCapture = new capture();
    exec(cmd, function (error, stdout, stderr) {
        console.log("Error" + error);
        console.log("Stdout: " + stdout);
        var firstLine = stdout.split('\n')[0];
        console.log("First Line: " + firstLine);
        var arr = firstLine.split(" ");
        console.log("Arr: " + arr);
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
            case "invalid":
                newCapture.code = "invalid";
                break;
            default:
                break;
        }
        if (newCapture.code == "invalid") {
            sendTextMessage(senderID, "I don't know about this...");
        } else {
            newCapture.id = senderID;
            newCapture.name = userName;
            newCapture.score = parseFloat(arr[3].replace(')', ''));
            newCapture.save(function (err, data) {
                if (err) {
                    console.log(err);
                }
                console.log(newCapture);
                shoe.findOne({'code': newCapture.code}, function (err, data) {
                    if (err) {
                        //Error servidor
                        response = {"error": true, "message": "Fetching error"};
                        res.status(500).json(response);
                    } else {
                        var randBegin = randomBegin[Math.floor(Math.random() * randomBegin.length)];
                        var response = randBegin + "\"" + data.name + "\"" + ". " + data.description
                            + ". You have them for " + data.price + "$ at adidas.com";
                        sendTextMessage(senderID, response);
                    }
                })
            });
            console.log(stdout);
        }
    });
}

function sendGenericMessage(recipientId, messageText) {
    // To be expanded in later sections
}

function managePostBack(event){
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfPostback = event.timestamp;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    var payload = event.postback.payload;

    switch(JSON.parse(payload).payloadName){
        case "show_info":
            console.log("Mostrando info producto");
            //TODO: enviar mensaje con el cuerpo del producto

            break;
        case "recognize":
            console.log("Quiere reconocer imagen");
            sendTextMessage(senderID, "Insert a photo or a link photo containing Adidas trainers to recognize which model are they");
            break;
        case "history":
            console.log("Quiere mostrar el historial");
            //TODO historial
            sendHistory(senderID);
            break;
        case "shops":
            console.log("Quiere ver las tiendas");
            sendTextMessage(senderID, "Send your location, so I can find the closest Adidas shops for you");
            break;
    }

    console.log("Received postback for user %d and page %d with payload '%s' " +
        "at %d", senderID, recipientID, payload, timeOfPostback);

    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    sendTextMessage(senderID, JSON.parse(event.postback.payload).body.text);
}

function showHelpOptions(recipientId){
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "This are the options you can do:",
                        subtitle: "",
                        buttons: [{
                            type: "postback",
                            title: "Recognize trainers",
                            payload: '{ "payloadName": "recognize", "body": {}}'

                        }, {
                            type: "postback",
                            title: "Show my history",
                            payload: '{ "payloadName": "history", "body": {}}'
                        }, {
                            type: "postback",
                            title: "Show closest shop",
                            payload: '{ "payloadName": "shops", "body": {}}'
                        }],
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

function sendCardMessage(recipientId/*, trainer*/){
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: "ZAPATILLA X_PLR",
                        item_url: "http://www.adidas.es/zapatilla-x_plr/BB1100.html?pr=home_rr&slot=2",
                        image_url: "http://www.adidas.es/dis/dw/image/v2/aagl_prd/on/demandware.static/-/Sites-adidas-products/default/dw4863d725/zoom/BB1100_01_standard.jpg?sw=500&sfrm=jpg",
                        buttons: [{
                            type: "web_url",
                            url: "http://www.adidas.es/zapatilla-x_plr/BB1100.html?pr=home_rr&slot=2",
                            title: "Go to shop"
                        }, {
                            type: "postback",
                            title: "Show more info",
                            payload: '{ "payloadName": "show_info", "body": { "name": "Zapatilla x_plr", "text": "jajajaja xddd" }}'
                        }],
                    }]
                }
            }
        }/*
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [{
                        title: trainer.name,
                        item_url: trainer.itemUrl,
                        image_url: trainer.imageUrl,
                        buttons: [{
                            type: "web_url",
                            url: trainer.itemUrl,
                            title: "Go to shop"
                        }, {
                            type: "postback",
                            title: "Show more info",
                            payload: "Show more info",
                        }],
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://messengerdemo.parseapp.com/img/touch.png",
                        buttons: [{
                            type: "web_url",
                            url: trainer.itemUrl,
                            title: "Open Web URL"
                        }, {
                            type: "postback",
                            title: "Call Postback",
                            payload: "Payload for second bubble",
                        }]
                    }]
                }
            }
        }*/
    };

    callSendAPI(messageData);
}

function sendTextMessage(recipientId, messageText) {
    console.log(messageText);
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

function sendLoading(senderID){
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: config.page_token },
        method: 'POST',
        json: {"recipient": {"id": senderID},
            "sender_action":"typing_on"}
    });
}

function isUrl(url){
    var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
    var regex = new RegExp(expression);
    if (url.match(regex)) {
        return true;
    } else {
        return false;
    }
}

function sendHistory(senderID){

}

module.exports = router;
