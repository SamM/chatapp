var auth = {
      "id": "operator",
      "token": "123"
  },
  socket = null,
  receive = {},
  send = {};

  // Receive events

  receive.ready = function (data) {
      socket.emit('auth', auth);
    };

  receive.auth_success = function(data){
    //alert("Connected to server");
    };

  receive.auth_error = function(error){
    alert("Error connecting to server: "+error);
    };

  receive.call_request = function(data){

    };

  receive.call_connected = function(data){

  };

  receive.self_message = function(data){

  };

  receive.other_message = function(data){

  };

  receive.message_read = function(data){

  };

  receive.typing = function(data){

  };

  // Send events

  send.accept_call = function(token){
    socket.emit("accept_call", token);
  };

  send.decline_call = function(token){
    socket.emit("decline_call", token);
  };

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

  function setup(){
    socket = io.connect('http://localhost/operator');
    for(var i in receive){
      socket.on(i, receive[i]);
    }
  }

  $(document).ready(setup);