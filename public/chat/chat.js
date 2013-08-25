var auth = {
    "secret": "456",
    "token": "123"
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
    clearTimeout(chat.typing_timeout);
    chat.typing_timeout = null;
    send.stop_typing();
    $("#message_input").css("border-color", "#777777");
}

chat.user_activity = function() {
    if (chat.unread_messages_here) {
        send.read_message();
        chat.unread_messages_here = false;
    }
    chat.scroll_messages();
}

chat.scroll_messages = function() {
    $("#scroll").scrollTop($("#scroll")[0].scrollHeight);
}

chat.inputSubmit = function() {
    var message = $("#message_input").val();
    if (message.length) {
        send.new_message(message);
    }
    $("#message_input").val("").focus();
    return false;
}

chat.inputKeyPress = function(ev) {
    chat.user_activity();
    if (ev.charCode == 13) {
        // Enter
        if (!ev.shiftKey) {
            // Shift >> New Line
            chat.stop_typing();
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
    chat.add_notice("You are now chatting with <strong>" + chat.operator_name + "</strong>!", 'positive');
    $(".connecting_notice").fadeOut(1000,
    function() {
        $(this).remove();
    });
};

receive.self_message = function(data) {
    chat.add_message("You", data.message, "self");
};

receive.operator_message = function(data) {
    chat.add_message(chat.operator_name, data.message, "operator");
};

receive.messages_seen = function(data) {
    console.log("Messages seen by operator");
};

receive.typing = function(data) {
    console.log("Operator has " + (data.typing ? "started": "stopped") + " typing");
};

// Send events
send.auth = function() {
    socket.emit('auth', auth);
};

send.read_message = function(id) {
    socket.emit("read_message", id);
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
    .keypress(chat.inputKeyPress)
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
                operators: ["1", "2", "3", "123"],
                conversation_token: "hello_world"
            },
            complete: function(data, status) {
                console.log(data, status)
                send.auth();
            },
            dataType: "application/json; charset=UTF-8"
        });
        return false;
    });
}

$(document).ready(setup);