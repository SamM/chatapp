var auth = {
      "secret": "456",
      "token": "123"
  },
  socket = null,
  receive = {},
  send = {},
	chat = {},
	server = {};

	// Server
	
	server.connected = false;
	server.reconnecting = false;
	
	// Chat
	
	chat.typing_timeout = null;
	chat.unread_messages_here = false;
	chat.unread_messages_there = false;
	chat.chatting = false;
	chat.conversation_token = null;

	chat.add_notice = function(text, className){
	  className = className || "";
	  var notice = $('<div class="notice '+className+'">'+text+'</div>');
	  $("#messages").append(notice);
	  chat.scroll_messages();
	  return notice;
	}
	chat.add_message = function(username, text, className){
	  className = className || "";
	  var message = $('<div class="message '+className+'"><span class="username">'+username+':</span>'+text+'</div>');
	  $("#messages").append(message);
	  chat.scroll_messages();
	  return message;
	}

	chat.start_typing = function(){
	  if(chat.typing_timeout){
	    clearTimeout(chat.typing_timeout);
		chat.typing_timeout = null;
	  }else{
	    send.start_typing();
	  }
	  chat.typing_timeout = setTimeout(chat.stop_typing, 1000);
	  $("#message_input").css("border-color", "red");
	}

	chat.stop_typing = function(){
	  clearTimeout(chat.typing_timeout);
		chat.typing_timeout = null;
	  send.stop_typing();
	  $("#message_input").css("border-color", "#777777");
	}

	chat.user_activity = function(){
	  if(chat.unread_messages_here){
	    send.read_message();
	    chat.unread_messages_here = false;
	  }
	  chat.scroll_messages();
	}

	chat.scroll_messages = function(){
	  $("#scroll").scrollTop($("#scroll")[0].scrollHeight);
	}
	
	chat.openChat = function(config){
		chat.build();
		chat.chatting = true;
		// TODO: Load previous conversation messages
		chat.add_notice("You are now chatting with <strong>"+config.name+"</strong>!", "positive");
		chat.conversation_token = config.conversation_token;
		chat.chatter_name = config.name;
		chat.chatter_token = config.chatter_token;
	}
	
	chat.closeChat = function(){
		chat.chatting = false;
	}
	
	chat.build = function(){
		var content = $("#content")
			.html('<div id="display"></div>')
			.append(
				$('<div id="chat"></div>')
					.append(
						$('<div id="scroll"></div>')
							.append($('<div id="messages"></div>'))
					)
					.append(
						$('<form id="input"></form>')
							.append(
								$('<textarea id="message_input"></textarea>')
									.keypress(chat.inputKeyPress)
									.focus(chat.user_activity)
								    .blur(chat.user_activity)
							)
							.append($('<input id="send" type="submit" value="Send">'))
							.submit(chat.inputSubmit)
					)
			);
	}
	
	chat.inputSubmit = function(){
	    var message = $("#message_input").val();
	    if(message.length){
	      send.new_message(message);
	    }
	    $("#message_input").val("").focus();
	    return false;
	  }

	chat.inputKeyPress = function(ev){
	    chat.user_activity();
	    if(ev.charCode == 13){ // Enter
	      if(!ev.shiftKey){ // Shift >> New Line
	        chat.stop_typing();
	        $("#input").submit();
	        ev.preventDefault();
	      }
	    }else{
	      chat.start_typing();
	    }
	  };
	
	chat.window_focus = function(){
		if(chat.chatting){
			chat.user_activity();
		}
	}

  // Receive events

  receive.ready = function (data) {
      send.auth();
    };

  receive.auth_success = function(data){
    //alert("Connected to server");
    };

  receive.auth_error = function(error){
    alert("Error connecting to server: "+error);
  };

  receive.call_request = function(data){
	var token = data.conversation_token,
		dialog = $("#call_dialog"),
		profile = $('<div class="call_profile"></div>'),
		accept = $('<input type="button" value="Accept" id="accept_call">')
			.click(function(){
				send.accept_call(token);
				$("#modal").hide();
			}),
		decline = $('<input type="button" value="Decline" id="decline_call">')
			.click(function(){
				send.decline_call(token);
				$("#modal").hide();
			});
	
	dialog.html("<h2>Incoming Call</h2>");
	dialog.append(profile);
	dialog.append($('<div class="call_buttons"></div>').append(accept).append(decline));
	
	$("#modal").show();
  };

  receive.call_connected = function(data){
	chat.openChat(data);
  };

  receive.call_declined = function(data){
	alert("The call from "+data.name+" has already been accepted by somebody else.")
  };

  receive.self_message = function(data){
    chat.add_message("You", data.message, "self");
  };

  receive.chatter_message = function(data){
	chat.add_message(chat.chatter_name, data.message, "other");
  };

  receive.messages_seen = function(data){
	console.log("Messages seen by chatter");
  };

  receive.typing = function(data){
	console.log("Chatter has "+(data.typing?"started":"stopped")+" typing");
  };

  // Send events

	send.auth = function(){
		socket.emit('auth', auth);
	};

  send.accept_call = function(token){
    socket.emit("accept_call", token);
  };

  send.decline_call = function(token){
    socket.emit("decline_call", token);
  };

  send.read_message = function(){
    socket.emit("read_message", {
		conversation_token: chat.conversation_token
	});
  };

  send.start_typing = function(){
    socket.emit("typing", {
		conversation_token: chat.conversation_token,
		typing: true
	});
  };

  send.stop_typing = function(){
    socket.emit("typing", {
		conversation_token: chat.conversation_token,
		typing: false
	});
  };

  send.new_message = function(message){
    socket.emit("new_message", { "message": message, conversation_token: chat.conversation_token});
  };

  function setup(){
    socket = io.connect('http://localhost/operator');
    for(var i in receive){
      socket.on(i, receive[i]);
    }
	$(window).focus(chat.window_focus);
  }

  $(document).ready(setup);