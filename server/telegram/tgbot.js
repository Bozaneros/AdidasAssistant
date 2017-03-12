/**
 * Created by Jaime on 11/03/2017.
 */

const TOKEN = "373837870:AAFk_2f8j7WQz7JWjyX2mefK8ZnQ1wf0X60";
const URL = "https://api.telegram.org/bot" + TOKEN + "/";
var req = require('request');
var querystring = require('querystring');

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
    ////////// NEED TO CHANGE THIS LINE TO PROCESS MESSAGE ///////////
    var text = updates[index].message.text;
    //////////////////////////////////////////////////////////////////
    var chat = updates[index].message.chat.id;
    send_message(text, chat);
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
