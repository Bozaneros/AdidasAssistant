/**
 * Created by Jaime on 11/03/2017.
 */

const TOKEN = "373837870:AAFk_2f8j7WQz7JWjyX2mefK8ZnQ1wf0X60";
const URL = "https://api.telegram.org/bot" + TOKEN + "/";
var req = require('request');
const config = require('../config/config');
var querystring = require('querystring');
var recast = require('recastai');

const getGreetings = require('../intents/greetings');
const getAskForModel= require('../intents/askformodel');

const recastClient = new recast.Client(config.recast_dev);

const INTENTS = {
    greetings: getGreetings,
    askformodel: getAskForModel
};

function get_json_from_url(url, callback){
  // Obtain json with all the messages our bot received
  req({url : url, json: true}, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      return callback(body);
    }
  });
};

function get_updates(offset = null, callback){
  url = URL + "getUpdates?timeout=100"
  if(offset){
    url = url + "&offset=" + offset;
  }
  get_json_from_url(url, function(response){
    return callback(response);
  });
}

function get_last_update_id(updates){
  var returned = null;
  if(updates.length > 0){
    returned = updates[0].update_id
  }
  for(var index in updates){
    if(updates[index].update_id > returned){
      returned = updates[index].update_id;
    }
  }
  return returned;
}


function get_last_chat_id_and_text(updates){
  var num_updates = updates.length;
  var last_update = num_updates - 1;
  var element = updates[last_update];
  var text = element.message.text;
  var chat_id = element.message.chat.id;
  var returned = {text : text, chat_id : chat_id}
  return returned;
}

function send_message(text, chat_id){
  url = URL + "sendMessage?" + querystring.stringify({text:text}) + "&chat_id=" + chat_id;
  get_json_from_url(url, function(response){});
}

function answer_messages(updates){
  for(var index in updates){
    console.log(updates[index]);
    console.log(updates[index].message.photo);
    var chat = updates[index].message.chat.id;
    if(updates[index].message.text != null){
      (function(chat) {
        recastClient.textRequest(updates[index].message.text)
                        .then(res => {
                            const intent = res.intent();
                            if (intent != null) {
                                switch (intent.slug) {
                                    case 'greetings':
                                        console.log("Sí es un saludo");
                                        send_message(INTENTS[intent.slug](), chat);
                                        break;
                                    case 'image':
                                        send_message("Insert a photo (always compressed!) or a photo in an url containing Adidas trainers to recognize which model are they", chat);
                                        break;
                                    case 'askformodel':
                                        console.log('Está pidiendo info de un modelo');
                                        //sendCardMessage(senderID);
                                        break;
                                    case 'help':
                                        console.log("Está pidiendo ayuda");
                                        //showHelpOptions(senderID);
                                        break;
                                    default:
                                        console.log("No es un saludo");
                                        send_message("I'm sorry, I didn't understand what you said. Maybe you are speaking in another language? I only know English :(", chat);
                                        break;
                                }
                            } else {
                                console.log("No es un saludo");
                                send_message("What? I don't get it...", chat);
                            }
                        })
                        .catch((err) => {
                            console.log(err);
                            send_message('I need some sleep right now... Talk to me later!', chat);
                        });
      })(chat);
    } else if(updates[index].message.document != null && updates[index].message.document.mime_type.split('/')[0] == 'image'){
      console.log("nos ha enviado una imagen lol");
    } else if(updates[index].message.photo != null){
      console.log("nos ha enviado una imagen comprimida lol");
    }
  }
}

function mainWork(last_update_id){
  get_updates(last_update_id, function(updates){
    if(updates.result.length > 0){
      last_update_id = get_last_update_id(updates.result) + 1;
      answer_messages(updates.result);
    }
    setTimeout(mainWork.bind(null, last_update_id),500);
  });
}

function main(){
  console.log("Telegram bot started!");
  last_update_id = null;
  setTimeout(mainWork.bind(null, last_update_id),500);
}

main();
