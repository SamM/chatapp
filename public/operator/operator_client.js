var auth = {
    "secret": "operatorSecret",
    "token": "abc",
	"time": (new Date()).getTime(),
	"location": window.location.href
},
socket = null,
receive = {},
send = {},
chat = {},
server = {},
originalTitle = "",
title_interval = null,
flash_delay = 300;

function flashTitle(msg){
	if(!title_interval){
		originalTitle = document.title;
		var blink = function(){
			document.title = document.title == msg ? '!!!':msg;
			title_interval = setTimeout(blink, flash_delay);
		}
		blink();
	}
}

function resetTitle(title){
	if(title_interval){
		clearTimeout(title_interval);
		title_interval = null;
	}
	document.title = title ? title : originalTitle;
}

// Server
server.connected = false;
server.reconnecting = false;

// Chat
chat.typing_timeout = null;
chat.chatting = false;
chat.conversations = {};
chat.convoCount = 0;

chat.add_notice = function(conversation_token, text, className) {
    className = className || "";
    var notice = $('<div class="notice ' + className + '">' + text + '</div>');
    chat.conversation(conversation_token).screen.find(".messages").append(notice);
    chat.scroll_messages(conversation_token);
    return notice;
}
chat.add_message = function(conversation_token, username, text, className) {
    className = className || "";
    var message = $('<div class="message ' + className + '"><span class="username">' + username + ':</span>' + text + '</div>');
    chat.conversation(conversation_token).screen.find(".messages").append(message);
    chat.scroll_messages(conversation_token);
    return message;
}

chat.start_typing = function() {
    if (chat.typing_timeout) {
        clearTimeout(chat.typing_timeout);
        chat.typing_timeout = null;
    } else {
        send.start_typing();
    }
    chat.typing_timeout = setTimeout(chat.stop_typing, 1000);
    chat.conversation().screen.find(".message_input").css("border-color", "red");
}

chat.stop_typing = function() {
	if(chat.typing_timeout){
    	clearTimeout(chat.typing_timeout);
    	chat.typing_timeout = null;
    	send.stop_typing();
	}
    chat.conversation().screen.find(".message_input").css("border-color", "#777777");
}

chat.user_activity = function() {
	if(title_interval){
		resetTitle();
	}
    var convo = chat.conversation();
    if (convo.unread_messages_here) {
        send.message_read(convo.token);
        convo.unread_messages_here = false;
    }
    chat.scroll_messages(convo.token);
}

chat.scroll_messages = function(token) {
    var convo = chat.conversation(token);
    var scroll = convo.screen.find(".scroll");
    scroll.scrollTop(scroll[0].scrollHeight);
}

chat.addConversationButton = function(chatter_name, conversation_token){
    var button = $("<li>"+chatter_name+"</li>").click(function(){ chat.showChat(conversation_token); });
    $("#conversations").append(button);
    return button;
};

chat.hideCurrentChat = function(){
    if(chat.current_chat)
        chat.hideChat(chat.current_chat);
};

chat.hideChat = function(conversation_token){
    $("#"+conversation_token).hide();
};

chat.showChat = function(conversation_token){
    chat.hideCurrentChat();
    $("#"+conversation_token).show();
    this.current_chat = conversation_token;
};

chat.openChat = function(config) {
    console.log(config);
    var conversation = {};
    conversation.token = config.conversation_token;
    conversation.chatter_name = config.name;
    conversation.chatter_token = config.chatter_token;
    conversation.button = chat.addConversationButton(conversation.chatter_name, conversation.token);
    conversation.unread_messages_here = false;
    conversation.unread_messages_there = false;
    conversation.typing_notice_before = "";
    conversation.typing_notice_timer = null;
    conversation.typing_notice_fading = false;
    conversation.screen = chat.build(conversation.token);
    chat.conversations[conversation.token] = conversation;
    chat.convoCount++;
    chat.chatting = true;
    // TODO: Load previous conversation messages
    chat.add_notice(conversation.token, "<strong>" + conversation.chatter_name + "</strong> has connected!", "positive connection_notice");
    chat.showChat(conversation.token);
}

chat.closeChat = function() {
    chat.convoCount--;
    if(chat.convoCount == 0){
        chat.chatting = false;
    }
}


chat.show_typing_notice = function(token){
    var convo = chat.conversation(token);
	chat.clear_typing_notice(true, convo.token);
	if(!convo.typing_notice_fading){
		convo.typing_notice_before = convo.screen.find(".typing")[0].innerHTML;
	}
	convo.screen.find(".typing").html(convo.chatter_name+" is typing ...").show();
	convo.typing_notice_timer = setTimeout(function(){chat.hide_typing_notice(convo.token);}, 15000);
}

chat.hide_typing_notice = function(token){
    var convo = chat.conversation(token);
	chat.clear_typing_notice(token);
	convo.typing_notice_fading = true;
	var msg = convo.typing_notice_before||"";
	convo.screen.find(".typing").fadeOut(400, function(){
		$(this).html(msg).show();
		convo.typing_notice_fading = false;
	});
}

chat.clear_typing_notice = function(reset, token){
    var convo = chat.conversation(token);
	if(convo.typing_notice_timer){
		clearTimeout(convo.typing_notice_timer);
		convo.typing_notice_timer = null;
		if(reset){ convo.screen.find(".typing").html(convo.typing_notice_before||"").show(); }
	}
}

function parseTime(time){
	if(!time){
		return "";
	}
	var str = "",
		ampm = "am";
	if(typeof time != "object"){
		time = new Date(time);
	}
	str = time.toTimeString().split(" ")[0].split(":");
	str.splice(2,1);
	str[0]=parseInt(str[0]);
	if(str[0]>=12){
		if(str[0]!=12){
			str[0] -= 12;
		}
		ampm = "pm";
	}else if(str[0]==0){
		str[0] = 12;
	}
	return str.join(":")+ampm;
}

function parseDate(date){
	if(!date){
		return "";
	}
	if(typeof date != "object"){
		date = new Date(date);
	}
	var str = "",
		datestr = date.toDateString(),
		timestr = parseTime(date),
		now = new Date();
	if(date.getFullYear() != now.getFullYear()){
		str = datestr+" "+timestr;
	}else if((date.getMonth() != now.getMonth()) || (now.getDate() - date.getDate() >= 7)){
		str = datestr.split(" ");
		str[3] = timestr;
		str = str.join(" ");
	}else if(date.getDate() == now.getDate()){
		str = timestr;
	}else{
		str = datestr.split(" ")[0]+" "+timestr;
	}
	return str;
}

chat.show_message_seen_notice = function(token, timestamp){
	var convo = chat.conversation(token);
    convo.screen.find(".typing").html('Seen '+parseDate(timestamp));
};

chat.hide_message_seen_notice = function(token){
    var convo = chat.conversation(token);
	convo.screen.find(".typing").fadeOut(400, function(){
		$(this).html("").show();
	});
};

chat.build = function(conversation_token) {
    var content = $("#content");
    var chat_screen = $('<div id="'+conversation_token+'" class="chat_screen"></div>')
    .append('<div class="display">asdg</div>')
    .append(
    $('<div class="chat"></div>')
    .append(
    $('<div class="scroll"></div>')
    .append($('<div class="messages"></div>'))
    )
	.append('<div class="typing"></div>')
    .append(
    $('<form class="input"></form>')
    .append($('<div class="textarea_wrapper"></div>')
		.append(
			$('<textarea class="message_input"></textarea>')
		    .keydown(chat.inputKeyPress)
		    .focus(chat.user_activity)
		    .blur(chat.user_activity)
	    )
	)
    .append($('<input class="send" type="submit" value="Send">'))
    .submit(chat.inputSubmit)
    )
    ).hide();
    content.append(chat_screen);
    return chat_screen;
}

chat.conversation = function(token){
    return chat.conversations[token?token:chat.current_chat];
}

chat.inputSubmit = function() {
    var convo = chat.conversation(),
        input = convo.screen.find(".message_input"),
        message = input.val();
    chat.stop_typing(convo.token);
    if (message.length) {
        send.new_message(convo.token, message);
    }
    input.val("").focus();
    return false;
}

chat.inputKeyPress = function(ev) {
    chat.user_activity();
    if (ev.keyCode == 13) {
        // Enter
        if (!ev.shiftKey) {
            // Shift >> New Line
            chat.conversation().screen.find('.input').submit();
            ev.preventDefault();
        }
    } else {
        chat.start_typing();
    }
};

chat.window_focus = function() {
    if (chat.chatting) {
        chat.user_activity();
    }
}

// Receive events
receive.ready = function(data) {
    send.auth();
};

receive.auth_success = function(data) {
    //alert("Connected to server");
    };

receive.auth_error = function(error) {
    alert("Error connecting to server: " + error);
};

receive.call_request = function(data) {
	socket.emit("call_received", data.chatter_token);
    var token = data.chatter_token,
    dialog = $("#call_dialog"),
    profile = $('<div class="call_profile"></div>'),
    accept = $('<input type="button" value="Accept" id="accept_call">')
    .click(function() {
		resetTitle();
        send.accept_call(token);
        $("#modal").hide();
    }),
    decline = $('<input type="button" value="Decline" id="decline_call">')
    .click(function() {
		resetTitle();
        send.decline_call(token);
        $("#modal").hide();
    });

    dialog.html("<h2>Incoming Call</h2>");
    dialog.append(profile);
    dialog.append($('<div class="call_buttons"></div>').append(accept).append(decline));

    $("#modal").show();
	flashTitle("Incoming Call ...");
};

receive.call_connected = function(data) {
    chat.openChat(data);
};

receive.chatter_reconnect = function(data) {
	if(data.connections == 1)
    	chat.add_notice(data.conversation_token, "<strong>" + chat.chatter_name + "</strong> has reconnected!", "positive reconnection_notice");
};

receive.chatter_disconnect = function(data) {
	if(data.connections == 0)
    	chat.add_notice(data.conversation_token, "<strong>" + chat.chatter_name + "</strong> has disconnected!", "disconnection_notice");
};

receive.call_declined = function(data) {
    alert("The call from " + data.name + " has already been accepted by somebody else.")
};

receive.self_message = function(data) {
    chat.add_message(data.conversation_token, "You", data.message, "self");
};

receive.chatter_message = function(data) {
    var convo = chat.conversation(data.conversation_token);
    chat.add_message(data.conversation_token, convo.chatter_name, data.message, "other");
    convo.unread_messages_here = true;
};

receive.message_seen = function(data) {
	console.log("Messages seen by chatter");
    var convo = chat.conversation(data.conversation_token);
	convo.unread_messages_there = false;
	chat.show_message_seen_notice(convo.token, data.timestamp);
    
};

receive.log = function(data){
	console.log(data);
}

receive.alert = function(data){
	alert(data);
}

receive.typing = function(data) {
    var convo = chat.conversation(data.conversation_token);
	if(data.typing){
		chat.show_typing_notice(convo.token);
	}else{
		chat.hide_typing_notice(convo.token);
	}
    console.log("Chatter has " + (data.typing ? "started": "stopped") + " typing");
};

// Send events
send.auth = function() {
    socket.emit('auth', auth);
};

send.accept_call = function(token) {
    socket.emit("accept_call", token);
};

send.decline_call = function(token) {
    socket.emit("decline_call", token);
};

send.message_read = function() {
    var convo = chat.conversation();
    socket.emit("message_read", {
        conversation_token: convo.token,
		chatter_token: convo.chatter_token
    });
};

send.start_typing = function(token) {
    var convo = chat.conversation();
    socket.emit("typing", {
        conversation_token: convo.token,
        typing: true,
		chatter_token: convo.chatter_token
    });
};

send.stop_typing = function(token) {
    var convo = chat.conversation(token);
    socket.emit("typing", {
        conversation_token: convo.token,
        typing: false,
		chatter_token: convo.chatter_token
    });
};

send.new_message = function(token, message) {
    var convo = chat.conversation(token);
	convo.unread_messages_there = true;
	chat.hide_message_seen_notice(convo.token);
    socket.emit("new_message", {
        "message": message,
        conversation_token: convo.token,
		chatter_token: convo.chatter_token
    });
};

function setup() {
    socket = io.connect('http://localhost/operator');
    for (var i in receive) {
        socket.on(i, receive[i]);
    }
    $(window).focus(chat.window_focus);
}

$(document).ready(setup);