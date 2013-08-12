var env = {};

env.express = require('express');

env.app = env.express();
var app = env.app;

env.server = require('http').createServer(env.app);
env.io = require('socket.io').listen(env.server);

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

console.log("Server listening on port 8080 >> http://localhost:8080");