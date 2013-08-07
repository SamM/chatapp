module.exports = function(env){
	
	var io = env.io,
		express = env.express,
		app = env.app,
		handle = env.handle,
		routes = {};
		
	// Outsider > Node API
	
	app.get('/', function (req, res) {
	  res.sendfile(__dirname + '/index.html');
	});
	
	// Rails > Node API
		
	app.post("/incoming_call", handle.call_received);
	
	app.get("/operator/login/:id/:token", handle.insider_login);
	
	app.get("/operator/logout/:id/:token", handle.insider_logout);
	
	// Outsider Websocket Connections
	
	io.sockets.of('/caller').on('connection', function (socket) {
		socket.emit('hello', {  });
		socket.on('auth', function(data){
			handler.outsider_connect(socket, data);
		});
	});
	
	// Insider Websocket Connections
	
	io.sockets.of('/operator').on('connection', function (socket) {
		socket.emit('hello', {  });
		socket.on('auth', function(data){
			handler.insider_connect(socket, data);
		});
	});
	
	return routes;
	
};