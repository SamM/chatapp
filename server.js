var express = require('express')
  , app = express(),
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , fs = require("fs");

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

app.listen(8080);
console.log("Server listening on port 8080 >> http://localhost:8080");