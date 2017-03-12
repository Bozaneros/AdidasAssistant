/**
 * Created by alejandro on 5/03/17.
 */

const express = require('express');
const router = express.Router();
const config = require('../config/config');
const recast = require('recastai');
const request = require('request');
const util = require('util');

let capture = require('../models/capture');
let shoe = require('../models/shoe');
let context = require('../models/userContext');

const getGreetings = require('../intents/greetings');
const getAskForModel= require('../intents/askformodel');
//const getNotUnderstood = require('../intents/notUnderstood');

const recastClient = new recast.Client(config.recast_dev);

const INTENTS = {
    greetings: getGreetings,
    askformodel: getAskForModel
};

let randomBegin = ["It appears to be ", "Oh! These are ", "I'm so confident these are ", "Ok, I have found that these are ",
    "Wait a moment! These are the new "];

let randomEnd = [""];

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

    let data = req.body;

    // Make sure this is a page subscription
    if (data.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
            let pageID = entry.id;
            let timeOfEvent = entry.time;

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

    let senderID = event.sender.id;

    sendLoading(senderID);

    //TODO: Hacer algo con el nombre del usuario (y mas info)
    console.log("Llamando a fb");
    request({
        uri: 'https://graph.facebook.com/v2.6/' + senderID,
        qs: { access_token: config.page_token },
        method: 'GET'
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {

            let userName = JSON.parse(body).first_name;
            let recipientID = event.recipient.id;
            let timeOfMessage = event.timestamp;
            let message = event.message;

            console.log("Received message for user %d and page %d at %d with message:",
                senderID, recipientID, timeOfMessage);
            console.log(JSON.stringify(message));

            let messageId = message.mid;

            let messageText = message.text;
            let messageAttachments = message.attachments;

            if (messageAttachments) {
                processAttachment(senderID, messageAttachments, userName);
            } else if(isUrl(messageText)){
                processUrl(senderID, messageText, userName);
            } else if (messageText) {
                processText(senderID, messageText, userName);

            } else {
                console.error("Unable to find user");

            }
        }
    });
}


function processText(senderID, messageText, userName){
    recastClient.textRequest(messageText)
        .then(res => {
            const intent = res.intent();
            if (intent != null) {
                switch (intent.slug) {
                    case 'greetings':
                        console.log("Sí es un saludo");
                        sendTextMessage(senderID, INTENTS[intent.slug]());
                        break;
                    case 'image':
                        sendTextMessage(senderID, "Insert a photo or a photo in an url containing Adidas trainers to recognize which model are they");
                        break;
                    case 'history':
                        sendHistory(senderID);
                        break;
                    case 'askformodel':
                        console.log('Está pidiendo info de un modelo');
                        let entity = res.get('trainers');

                        // Tries to recover the context of the conversation
                        if (!entity) {
                            context.findOne({'user': userName}, function (err, data) {
                                if (err) {
                                    //Error servidor
                                    response = {"error": true, "message": "Fetching error"};
                                    res.status(500).json(response);
                                } else {
                                    entity = data.lastEntity;
                                }

                                sendCardMessage(senderID, entity);
                            })
                        }
                        else {

                            // Updates the last entity provided by the user
                            var query = {},
                                update = { lastEntity: entity },
                                options = { upsert: true, new: true, setDefaultsOnInsert: true };

                            context.findOneAndUpdate(query, update, options, function(err, data) {
                                if (err) return;
                                else entity = data.lastEntity;
                            });
                        }

                        break;
                    case 'help':
                        console.log("Está pidiendo ayuda");
                        showHelpOptions(senderID);
                        break;
                    default:
                        console.log("No es un saludo");
                        sendTextMessage(senderID, "I'm sorry, I didn't understand what you said. Maybe you are speaking in another language? I only know English :(");
                        break;
                }
            } else {
                console.log("No es un saludo");
                sendTextMessage(senderID, "What? I don't get it...");
            }
        })
        .catch((err) => {
            console.log(err);
            sendTextMessage(senderID, 'I need some sleep right now... Talk to me later!');
        });
}

function processAttachment(senderID, messageAttachments, userName){
    console.log(messageAttachments);

    // Iterate over each entry - there may be multiple if batched
    let threshold = 0.1;
    messageAttachments.forEach(function(attachment) {
        let imageUrl = attachment.url || attachment.payload.url;
        switch (attachment.type) {
            case "fallback":
                imageUrl = attachment.url;
                imageUrl = imageUrl.replace("https://l.facebook.com/l.php?u=", "");
                imageUrl = decodeURIComponent(imageUrl);
            case "image":
                let exec = require('child_process').exec;

                let cmd = 'python main.py ' + "\"" + imageUrl + "\"";
                let newCapture = new capture();
                exec(cmd, function (error, stdout, stderr) {
                    console.log("Error" + error);
                    console.log("Stdout: " + stdout);
                    let firstLine = stdout.split('\n')[0];
                    console.log("First Line: " + firstLine);
                    let arr = firstLine.split(" ");
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
                    newCapture.date = Date.now();
                    newCapture.save(function (err, data) {
                        if (err) {
                            console.log(err);
                        }
                        console.log(newCapture);

                        // Makes HTTP request to API (GET)
                        /*
                        request({
                            uri: "https://bozaneros.ddns.net/api/shoe/" + newCapture.code,
                            method: "GET",
                            timeout: 10000
                        }, function(error, data) {
                            if (err) {
                                //Error servidor
                                response = {"error": true, "message": "Fetching error"};
                                res.status(500).json(response);
                            } else {
                                if(newCapture.score < threshold){

                                } else {
                                    let randBegin = randomBegin[Math.floor(Math.random() * randomBegin.length)];
                                    let response = randBegin + "\"" + data.name + "\"" + ". " + data.description
                                        + ". You have them for " + data.price + "$ at adidas.com";
                                    sendTextMessage(senderID, response);
                                }
                            }
                        });
                        */

                        shoe.findOne({'code': newCapture.code}, function (err, data) {
                            if (err) {
                                //Error servidor
                                response = {"error": true, "message": "Fetching error"};
                                res.status(500).json(response);
                            } else {
                                if(newCapture.score < threshold){
                                    sendTextMessage(senderID, "Sorry... I don't know what product is...");
                                } else {
                                    sendCardMessage(senderID, data);
                                }
                            }
                        });
                    });
                    console.log(stdout);
                    console.log(stderr);
                });
                break;
            case "location":
                console.log(attachment.payload.coordinates);
                var googleMapsClient = require('@google/maps').createClient({
                    key: config.maps_api_key
                });
                googleMapsClient.places({
                    query: "adidas",
                    language: 'en',
                    location: [attachment.payload.coordinates.lat, attachment.payload.coordinates.long],
                    radius: 5000,
                    type: 'shop'
                }, function(err, response) {
                    console.log(response.json.results);
                    var locations = response.json.results;
                    var entry = locations[0];
                    var rawPlacesUrl = "https://www.google.es/maps/place/";
                    var placesUrl = rawPlacesUrl + encodeURIComponent(entry.formatted_address);
                    var textResponse = "Your nearest Adidas shop is at the following direction: \"" +
                            entry.formatted_address + "\". You can view it in Google Maps by clicking in the link: " +
                            placesUrl;
                    sendTextMessage(senderID, textResponse);
                });
                break;
            case "audio":
                let execAudio = require('child_process').exec;

                let cmdAudio = 'python speech.py ' + "\"" + attachment.payload.url + "\"";
                execAudio(cmdAudio, function (error, stdout, stderr) {
                    console.log("Error" + error);
                    console.log("Stdout: " + stdout);
                    processText(senderID, stdout);
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
    let exec = require('child_process').exec;

    let cmd = 'python main.py ' + "\"" + messageAttachments + "\"";
    let newCapture = new capture();
    exec(cmd, function (error, stdout, stderr) {
        console.log("Error" + error);
        console.log("Stdout: " + stdout);
        let firstLine = stdout.split('\n')[0];
        console.log("First Line: " + firstLine);
        let arr = firstLine.split(" ");
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

                // Makes HTTP request to API (GET)
                /*
                request({
                    uri: "https://bozaneros.ddns.net/api/shoe/" + newCapture.code,
                    method: "GET",
                    timeout: 10000
                }, function(error, data) {
                    if (err) {
                        //Error servidor
                        response = {"error": true, "message": "Fetching error"};
                        res.status(500).json(response);
                    } else {
                        let randBegin = randomBegin[Math.floor(Math.random() * randomBegin.length)];
                        let response = randBegin + "\"" + data.name + "\"" + ". " + data.description
                            + ". You have them for " + data.price + "$ at adidas.com";
                        sendTextMessage(senderID, response);
                    }
                });
                */


                shoe.findOne({'code': newCapture.code}, function (err, data) {
                    if (err) {
                        //Error servidor
                        response = {"error": true, "message": "Fetching error"};
                        res.status(500).json(response);
                    } else {

                        sendCardMessage(senderID, data);
                      /*  let randBegin = randomBegin[Math.floor(Math.random() * randomBegin.length)];
                        let response = randBegin + "\"" + data.name + "\"" + ". " + data.description
                            + ". You have them for " + data.price + "$ at adidas.com";
                        sendTextMessage(senderID, response);*/
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
    let senderID = event.sender.id;
    let recipientID = event.recipient.id;
    let timeOfPostback = event.timestamp;
    let threshold = 0.1;

    // The 'payload' param is a developer-defined field which is set in a postback
    // button for Structured Messages.
    let payload = event.postback.payload;

    switch(JSON.parse(payload).payloadName){
        case "show_info":
            console.log("Mostrando info producto");
            capture.findOne({}, {}, { sort: { 'created_at' : 1 } }, function(err, cap) {
                shoe.findOne({'code': cap.code}, function (err, data) {
                    if (err) {
                        //Error servidor
                        response = {"error": true, "message": "Fetching error"};
                        res.status(500).json(response);
                    } else {
                        if(cap.score < threshold){
                            sendTextMessage(senderID, "Sorry... I don't know what product is...");
                        } else {
                            sendCardMessage(senderID, data);
                        }
                    }
                });
            });
            break;
        case "recognize":
            console.log("Quiere reconocer imagen");
            sendTextMessage(senderID, "Insert a photo or a link photo containing Adidas trainers to recognize which model are they");
            break;
        case "history":
            console.log("Quiere mostrar el historial");
            sendHistory(senderID);
            break;
        case "shops":
            console.log("Quiere ver las tiendas");
            sendTextMessage(senderID, "Send your location, so I can find the closest Adidas shops for you");
            break;
    }



    //console.log("Received postback for user %d and page %d with payload '%s' " +
    //    "at %d", senderID, recipientID, payload, timeOfPostback);

    // When a postback is called, we'll send a message back to the sender to
    // let them know it was successful
    //sendTextMessage(senderID, JSON.parse(event.postback.payload).body.text);
}

function showHelpOptions(recipientId){
    let messageData = {
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

function sendCardMessage(recipientId, trainer){
    let messageData = {
        recipient: {
            id: recipientId
        },
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
                            payload: '{ "payloadName": "show_info", "body": { "code": "' + trainer.code + '"}}'
                        }],
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

function sendTextMessage(recipientId, messageText) {
    console.log(messageText);
    let messageData = {
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
            let recipientId = body.recipient_id;
            let messageId = body.message_id;

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
    let expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
    let regex = new RegExp(expression);
    if (url.match(regex)) {
        return true;
    } else {
        return false;
    }
}

function sendHistory(senderID){
    capture.find({id: senderID}).sort({'submittedDate': 'desc'}).exec(function(err, data){
        if(err){
            sendTextMessage(senderID, "Sorry, there has been an error processing your search history");
        } else{
            console.log(data.length);


            var max = data.length;
            if(data.length > 3){
                data = data.slice(0,3);
                max = 3;
            }


            console.log(data.length);
            var elements = [];
            var codes = [];
            var wait = 0;
            data.forEach(function(capture) {
                codes.push(capture.code);
            });

            console.log("===================================> " + capture.code);
            shoe.find({'code': {$in: codes}}, function(err, res){
                if(err){
                    console.log("ERROR");
                } else{
                    res.forEach(function(response){
                        var element = {
                            title: response.name,
                            item_url: response.itemUrl,
                            image_url: response.imageUrl,
                            buttons: [{
                                type: "web_url",
                                url: response.itemUrl,
                                title: "Go to shop"
                            }, {
                                type: "postback",
                                title: "Show more info",
                                payload: '{ "payloadName": "show_info", "body": { "code": "' + response.code + '"}}'
                            }],
                        };
                        elements.push(element);
                    });
                    console.log("==================================================");
                    console.log(elements);
                    console.log("==================================================");
                    let messageData = {
                        recipient: {
                            id: senderID
                        },
                        message: {
                            attachment: {
                                type: "template",
                                payload: {
                                    template_type: "generic",
                                    elements: elements
                                }
                            }
                        }
                    };
                    callSendAPI(messageData);

                }
            });
        }
    });
}

module.exports = router;
