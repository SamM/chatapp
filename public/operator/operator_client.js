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
chat.unread_messages_here = false;
chat.unread_messages_there = false;
chat.chatting = false;
chat.conversation_token = null;

chat.add_notice = function(text, className) {
    className = className || "";
    var notice = $('<div class="notice ' + className + '">' + text + '</div>');
    $("#messages").append(notice);
    chat.scroll_messages();
    return notice;
}
chat.add_message = function(username, text, className) {
    className = className || "";
    var message = $('<div class="message ' + className + '"><span class="username">' + username + ':</span>' + text + '</div>');
    $("#messages").append(message);
    chat.scroll_messages();
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
    $("#message_input").css("border-color", "red");
}

chat.stop_typing = function() {
	if(chat.typing_timeout){
    	clearTimeout(chat.typing_timeout);
    	chat.typing_timeout = null;
    	send.stop_typing();
	}
    $("#message_input").css("border-color", "#777777");
}

chat.user_activity = function() {
	if(title_interval){
		resetTitle();
	}
    if (chat.unread_messages_here) {
        send.message_read();
        chat.unread_messages_here = false;
    }
    chat.scroll_messages();
}

chat.scroll_messages = function() {
    $("#scroll").scrollTop($("#scroll")[0].scrollHeight);
}

chat.openChat = function(config) {
    chat.build();
    chat.chatting = true;
    // TODO: Load previous conversation messages
    chat.add_notice("<strong>" + config.name + "</strong> has connected!", "positive connection_notice");
    chat.conversation_token = config.conversation_token;
    chat.chatter_name = config.name;
    chat.chatter_token = config.chatter_token;
}

chat.closeChat = function() {
    chat.chatting = false;
}

chat.typing_notice_before = "";
chat.typing_notice_timer = null;
chat.typing_notice_fading = false;
chat.show_typing_notice = function(){
	chat.clear_typing_notice(true);
	if(!chat.typing_notice_fading){
		chat.typing_notice_before = $("#typing")[0].innerHTML;
	}
	$("#typing").html(chat.chatter_name+" is typing ...").show();
	chat.typing_notice_timer = setTimeout(chat.hide_typing_notice, 15000);
}

chat.hide_typing_notice = function(){
	chat.clear_typing_notice();
	chat.typing_notice_fading = true;
	var msg = chat.typing_notice_before||"";
	$("#typing").fadeOut(400, function(){
		$(this).html(msg).show();
		chat.typing_notice_fading = false;
	});
}

chat.clear_typing_notice = function(reset){
	if(chat.typing_notice_timer){
		clearTimeout(chat.typing_notice_timer);
		chat.typing_notice_timer = null;
		if(reset){ $("#typing").html(chat.typing_notice_before||"").show(); }
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

chat.show_message_seen_notice = function(timestamp){
	$("#typing").html('Seen '+parseDate(timestamp));
};

chat.hide_message_seen_notice = function(){
	$("#typing").fadeOut(400, function(){
		$(this).html("").show();
	});
};

chat.build = function() {
    var content = $("#content")
    .html('<div id="display">asdg</div>')
    .append(
    $('<div id="chat"></div>')
    .append(
    $('<div id="scroll"></div>')
    .append($('<div id="messages"></div>'))
    )
	.append('<div id="typing"></div>')
    .append(
    $('<form id="input"></form>')
    .append($('<div class="textarea_wrapper"></div>')
		.append(
			$('<textarea id="message_input"></textarea>')
		    .keydown(chat.inputKeyPress)
		    .focus(chat.user_activity)
		    .blur(chat.user_activity)
	    )
	)
    .append($('<input id="send" type="submit" value="Send">'))
    .submit(chat.inputSubmit)
    )
    );
}

chat.inputSubmit = function() {
	chat.stop_typing();
    var message = $("#message_input").val();
    if (message.length) {
        send.new_message(message);
    }
    $("#message_input").val("").focus();
    return false;
}

chat.inputKeyPress = function(ev) {
    chat.user_activity();
    if (ev.keyCode == 13) {
        // Enter
        if (!ev.shiftKey) {
            // Shift >> New Line
            $("#input").submit();
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
    	chat.add_notice("<strong>" + chat.chatter_name + "</strong> has reconnected!", "positive reconnection_notice");
};

receive.chatter_disconnect = function(data) {
	if(data.connections == 0)
    	chat.add_notice("<strong>" + chat.chatter_name + "</strong> has disconnected!", "disconnection_notice");
};

receive.call_declined = function(data) {
    alert("The call from " + data.name + " has already been accepted by somebody else.")
};

receive.self_message = function(data) {
    chat.add_message("You", data.message, "self");
};

receive.chatter_message = function(data) {
    chat.add_message(chat.chatter_name, data.message, "other");
	chat.unread_messages_here = true;
};

receive.message_seen = function(data) {
	console.log("Messages seen by chatter");
	chat.unread_messages_there = false;
	chat.show_message_seen_notice(data.timestamp);
    
};

receive.log = function(data){
	console.log(data);
}

receive.alert = function(data){
	alert(data);
}

receive.typing = function(data) {
	if(data.typing){
		chat.show_typing_notice();
	}else{
		chat.hide_typing_notice();
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
    socket.emit("message_read", {
        conversation_token: chat.conversation_token,
		chatter_token: chat.chatter_token
    });
};

send.start_typing = function() {
    socket.emit("typing", {
        conversation_token: chat.conversation_token,
        typing: true,
		chatter_token: chat.chatter_token
    });
};

send.stop_typing = function() {
    socket.emit("typing", {
        conversation_token: chat.conversation_token,
        typing: false,
		chatter_token: chat.chatter_token
    });
};

send.new_message = function(message) {
	chat.unread_messages_there = true;
	chat.hide_message_seen_notice();
    socket.emit("new_message", {
        "message": message,
        conversation_token: chat.conversation_token,
		chatter_token: chat.chatter_token
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