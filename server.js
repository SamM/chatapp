var env = {};

env.express = require('express');

env.app = env.express();
var app = env.app;

app.use(express.methodOverride());
app.use(express.bodyParser());
app.use(app.router);

env.server = require('http').createServer(env.app);
env.io = require('socket.io').listen(env.server);

env.handle = require("./event_handlers")(env);
env.routes = require("./routes")(env);

app.listen(8080);

console.log("Server listening on port 8080 >> http://localhost:8080");