var env = {};

env.express = require('express'),
env.app = env.express(),
env.server = require('http').createServer(env.app),
env.io = require('socket.io').listen(env.server),
env.handle = require("./event_handlers")(env),
env.routes = require("./routes")(env);

/*
io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});
*/


env.app.listen(8080);

console.log("Server listening on port 8080 >> http://localhost:8080");