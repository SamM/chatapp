module.exports = function(env){
	
	var io = env.io,
		express = env.express,
		app = env.app,
		handle = env.handle,
		routes = {};
		
	app.post("/incoming_call", handle.call_received);
	
	app.get("/operator/login/:id/:token", handle.operator_login);
	
	app.get("/operator/logout/:id/:token", handle.operator_logout);
		
	io.of('/chatter').on('connection', function (socket) {
		socket.emit('ready', {  });
		socket.on('auth', function(data){
			console.log("chatter auth",data);
			handle.chatter_connect(socket, data);
		});
	});
		
	io.of('/operator').on('connection', function (socket) {
		socket.emit('ready', {  });
		socket.on('auth', function(data){
			console.log("operator auth",data);
			handle.operator_connect(socket, data);
		});
	});
	
	return routes;
	
};