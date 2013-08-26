var env = {};

env.express = require('express');

env.app = env.express();
var app = env.app;

env.server = require('http').createServer(env.app);
env.io = require('socket.io').listen(env.server);
env.io.set('log level', 1);

env.server.listen(8080);

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
	var operator = env.dao.operator.create(token, secret, name);
	operator.connected = false;
	operator.socket = null;
	operator.call_requests = [];
	operator.conversations = [];
	env.dao.operator.save(operator);
}

createOperator("a", "1", "Jim");
createOperator("b", "2", "Bob");
createOperator("c", "3", "Jill");
createOperator("operatorSecret", "abc", "Operator Guy");

// Dummy chatters

function createChatter(secret, token, name){
	env.dao.chatter.create(token, secret, name);
}

console.log("Server listening on port 8080 >> http://localhost:8080");