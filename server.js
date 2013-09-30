var env = {};

env.express = require('express');

env.app = env.express();
var app = env.app;

env.server = require('http').createServer(env.app);
env.io = require('socket.io').listen(env.server);
env.io.set('log level', 1);

env.server.listen(process.env.PORT ||8080);

app.configure(function(){
	app.use(env.express.static(__dirname + '/public'));
	app.use(env.express.bodyParser());
	app.use(env.express.methodOverride());
	app.use(app.router);
});

env.dao = require("./dao.js");
env.handle = require("./event_handlers")(env);
env.routes = require("./routes")(env);

// Dummy operators

function createOperator(secret, token, name){
	var operator = env.dao.operator(token).create(secret, name);
}

createOperator("a", "1", "Jim");
createOperator("b", "2", "Bob");
createOperator("c", "3", "Jill");
env.dao.operator("abc").exists(function(exists){
	//if(exists){
		createOperator("operatorSecret", "abc", "Operator Guy");
	//}
	/*else{
		env.dao.operator("abc").call_requests = [];
		env.dao.operator("abc").conversations = [];
	}*/
});

// Remove test chatter

env.dao.chatter("123").remove(function(i){
	console.log("Dummy chatter removed", i)
});

console.log("Server listening on port 8080 >> http://localhost:8080");

process.on('exit', env.handle.server_close);

process.on('uncaughtException', function(err) {
	handle.server_error(err);
});

var tty = require("tty");

process.openStdin().on("keypress", function(chunk, key) {
  if(key && key.name === "c" && key.ctrl) {
    env.handle.server_close();
  }
});

tty.setRawMode(true);