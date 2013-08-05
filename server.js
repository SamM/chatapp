var app = require("http").createServer(server_handler),
	io = require("socket.io").listen(app),
	fs = require("fs");

function server_handler(req, res){
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

app.listen(8080);
console.log("Server listening on port 8080 >> http://localhost:8080");