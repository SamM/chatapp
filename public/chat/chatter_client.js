var auth = {
    "secret": "chatterSecret",
    "token": "123",
	"time": (new Date()).getTime(),
	"location": window.location.href
},
socket = null,
receive = {},
send = {},
chat = {};

chat.connected = false;
chat.reconnecting = false;
chat.typing_timeout = null;
chat.unread_messages_here = false;
chat.unread_messages_there = false;
chat.operator_name = null;

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

chat.typing_notice_before = "";
chat.typing_notice_timer = null;
chat.typing_notice_fading = false;
chat.show_typing_notice = function(){
	chat.clear_typing_notice(true);
	if(!chat.typing_notice_fading){
		chat.typing_notice_before = $("#typing")[0].innerHTML;
	}
	$("#typing").html(chat.operator_name+" is typing ...").show();
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

chat.user_activity = function() {
    if (chat.unread_messages_here) {
        send.message_read();
        chat.unread_messages_here = false;
    }
    chat.scroll_messages();
}

chat.scroll_messages = function() {
    $("#scroll").scrollTop($("#scroll")[0].scrollHeight);
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
}

// Receive events
receive.ready = function(data) {
    if (chat.connected) {
        chat.reconnecting = true;
    }
    send.auth();
};

receive.auth_success = function(data) {
    if (chat.reconnecting) {
        chat.add_notice("You have been reconnected.");
        chat.reconnecting = false;
    } else {
        chat.add_notice("Please wait while we connect you to a representative ...")
        .addClass("connecting_notice");
    }
    chat.connected = true;
};

receive.auth_error = function(error) {
    chat.add_notice("Error connecting to server: " + error, 'negative');
};

receive.call_connected = function(data) {
    chat.operator_name = data.name;
    chat.add_notice("<strong>" + chat.operator_name + "</strong> has connected!", 'positive connection_notice');
    $(".connecting_notice").fadeOut(1000,
    function() {
        $(this).remove();
    });
};

receive.operator_reconnect = function(data) {
	if(data.connections == 1){
		chat.add_notice("<strong>" + chat.operator_name + "</strong> has reconnected!", "positive reconnection_notice");
	}
};

receive.operator_disconnect = function(data) {
	if(data.connections == 0){
		chat.add_notice("<strong>" + chat.operator_name + "</strong> has disconnected!", "disconnection_notice");
	}
};

receive.self_message = function(data) {
    chat.add_message("You", data.message, "self");
};

receive.operator_message = function(data) {
    chat.add_message(chat.operator_name, data.message, "operator");
	chat.unread_messages_here = true;
};

receive.message_seen = function(data) {
	chat.unread_messages_there = false;
	chat.show_message_seen_notice(data.timestamp);
    console.log("Messages seen by operator");
};

receive.typing = function(data) {
	if(data.typing){
		chat.show_typing_notice();
	}else{
		chat.hide_typing_notice();
	}
    console.log("Operator has " + (data.typing ? "started": "stopped") + " typing");
};

receive.log = function(data){
	console.log(data);
}

receive.alert = function(data){
	alert(data);
}

// Send events
send.auth = function() {
	console.log("Sending auth", auth);
    socket.emit('auth', auth);
};

send.message_read = function() {
    socket.emit("message_read", {});
};

send.start_typing = function() {
    socket.emit("typing", {
        typing: true
    });
};

send.stop_typing = function() {
    socket.emit("typing", {
        typing: false
    });
};

send.new_message = function(message) {
	chat.unread_messages_there = true;
	chat.hide_message_seen_notice();
    socket.emit("new_message", {
        "message": message
    });
};

function setup() {
    socket = io.connect('http://localhost/chatter');
    for (var i in receive) {
        socket.on(i, receive[i]);
    }
    $("#input").submit(chat.inputSubmit);
    $("#message_input")
    .keydown(chat.inputKeyPress)
    .focus(chat.user_activity)
    .blur(chat.user_activity);
    $(window).focus(chat.user_activity);

    $("#login_form").submit(function() {
        $.ajax({
            type: "POST",
            url: "/incoming_call",
            data: {
                token: auth.token,
                secret: auth.secret,
                name: $("#login_name").val() || "Chatter",
                operators: ["1", "2", "3", "abc"],
                conversation_token: "hello_world"
            },
            complete: function(data, status) {
                console.log(data, status)
				setTimeout(send.auth, 2000);
            },
            dataType: "application/json; charset=UTF-8"
        });
        return false;
    });
}

$(document).ready(setup);