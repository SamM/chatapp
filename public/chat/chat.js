var auth = {
      "id": "chatter",
      "token": "123"
  },
  socket = null,
  receive = {},
  send = {},
  chat = {};

  chat.connected = false;
  chat.reconnecting = false;

  chat.add_notice = function(text, className){
    className = className || "";
    var notice = $('<div class="notice '+className+'">'+text+'</div>');
    $("#messages").append(notice);
    return notice;
  }
  chat.add_message = function(username, text, className){
    className = className || "";
    var message = $('<div class="message '+className+'"><span class="username">'+username+':</span>'+text+'</div>');
    $("#messages").append(message);
    return message;
  }

  // Receive events

  receive.ready = function (data) {
      if(chat.connected){
        chat.reconnecting = true;
      }
      socket.emit('auth', auth);
    };

  receive.auth_success = function(data){
    if(chat.reconnecting){
      chat.add_notice("You have been reconnected.");
      chat.reconnecting = false;
    }else{
      chat.add_notice("Please wait while we connect you to a representative ...");
    }
    chat.connected = true;
    };

  receive.auth_error = function(error){
    chat.add_notice("Error connecting to server: "+error);
    };

  receive.call_request = function(data){

    };

  receive.call_connected = function(data){

  };

  receive.self_message = function(data){
    chat.add_message("You", data.message, "self");
  };

  receive.other_message = function(data){

  };

  receive.message_read = function(data){

  };

  receive.typing = function(data){

  };

  // Send events

  send.read_message = function(id){
    socket.emit("read_message", id);
  };

  send.start_typing = function(){
    socket.emit("typing", true);
  };

  send.stop_typing = function(){
    socket.emit("typing", false);
  };

  send.new_message = function(message){
    socket.emit("new_message", { "message": message });
  };

  function inputSubmit(){
    var message = $("#message_input")[0].value;
    if(message.length){
      send.new_message(message);
    }
    return false;
  }

  function setup(){
    socket = io.connect('http://localhost/chatter');
    for(var i in receive){
      socket.on(i, receive[i]);
    }
    $("#input").submit(inputSubmit);
  }

  $(document).ready(setup);