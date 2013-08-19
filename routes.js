module.exports = function(env){
	
	var io = env.io,
		express = env.express,
		app = env.app,
		handle = env.handle,
		routes = {};

	// Outsider > Node API

	
	// Rails > Node API
		
	app.post("/incoming_call", handle.call_received);
	
	app.get("/operator/login/:id/:token", handle.insider_login);
	
	app.get("/operator/logout/:id/:token", handle.insider_logout);
	
	// Outsider Websocket Connections
	
	io.of('/chatter').on('connection', function (socket) {
		socket.emit('ready', {  });
		socket.on('auth', function(data){
			handle.outsider_connect(socket, data);
		});
	});
	
	// Insider Websocket Connections
	
	io.of('/operator').on('connection', function (socket) {
		socket.emit('ready', {  });
		socket.on('auth', function(data){
			handle.insider_connect(socket, data);
		});
	});
	
	return routes;
	
};