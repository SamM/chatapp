module.exports = function(env){
	var io = env.io,
		express = env.express,
		app = env.app,
		dao = env.dao,
		handle = {};
	
	// Rails to Node
	
	handle.call_received = function(req, res){
		var id = req.body.id,
			token = req.body.token,
			list = req.body.list;
		
		dao.outsider.create(token, id);
		res.end("success");
	};
	
	handle.insider_login = function(req, res){
		var id = req.params.id,
			token = req.params.token;
			
		dao.insider.create(token, id);
		res.end("success");
	};
	
	handle.insider_logout = function(req, res){
		var id = req.params.id,
			token = req.params.token;
		
		dao.insider.remove(token);
		res.end("success");
	};
	
	handle.msg_by_out_logged = function(){};
	
	handle.msg_by_in_logged = function(){};
	
	handle.read_by_out_logged = function(){};
		
	handle.read_by_in_logged = function(){};
	
	handle.insider_status_cb = function(){};
	
	// Node to Rails
	
	handle.log_msg_by_in = function(){};
	
	handle.log_msg_by_out = function(){};
	
	handle.log_read_by_in = function(){};
	
	handle.log_read_by_out = function(){};
	
	handle.insider_status = function(){};
	
	// Outsider to Node
	
	handle.outsider_connect = function(socket, data){
		var token = data.token,
			id = data.id,
			session = dao.outsider.getByToken(token);
		
		if(token === undefined || id === undefined){
			handle.reject_out_connect(socket, token === undefined ? "missing token" : "missing id");
		}else if(session === null){
			handle.reject_out_connect(socket, "bad token");
		}else if(session.id !== id){
			handle.reject_out_connect(socket, "bad id");
		}else{
			// Connected successfully
			handle.accept_out_connect(socket, session);
		}
	};
	
	handle.outsider_typing = function(){};
	
	handle.outsider_read = function(){};
	
	handle.outsider_send_msg = function(){};
	
	handle.outsider_disconnect = function(){};
	
	// Insider to Node
	
	handle.insider_connect = function(socket, data){
		var token = data.token,
			id = data.id,
			session = dao.insider.getByToken(token);
		
		if(token === undefined || id === undefined){
			handle.reject_in_connect(socket, token === undefined ? "missing token" : "missing id");
		}else if(session === null){
			handle.reject_in_connect(socket, "bad token");
		}else if(session.id !== id){
			handle.reject_in_connect(socket, "bad id");
		}else{
			// Connected successfully
			handle.accept_in_connect(socket, session);
		}
	};
	
	handle.insider_typing = function(){};
	
	handle.insider_read = function(){};
	
	handle.insider_send_msg = function(){};
	
	handle.insider_disconnect = function(){};
	
	handle.insider_status = function(){};
	
	// Node to Outsider
	
	handle.accept_out_connect = function(socket, session){
		socket.session = session;
		// Setup socket events
		socket.on("typing", function(data){
			handle.outsider_typing(socket, data);
		});
		socket.on("read", function(data){
			handle.outsider_read(socket, data);
		});
		socket.on("send", function(data){
			handle.outsider_send_msg(socket, data);
		});
		socket.on("disconnect", function(data){
			handle.outsider_disconnect(socket, data);
		});
		socket.emit("auth_success", {});
	};
	
	handle.reject_out_connect = function(socket, error){
		socket.emit("auth_error", error);
	};
	
	handle.notify_out_of_in = function(){};
	
	handle.notify_out_of_typing = function(){};
	
	handle.notify_out_of_read = function(){};
	
	handle.notify_out_of_msg = function(){};
	
	// Node to Insider
	
	handle.accept_in_connect = function(socket, session){
		socket.session = session;
		socket.on("typing", function(data){
			handle.insider_typing(socket, data);
		});
		socket.on("read", function(data){
			handle.insider_read(socket, data);
		});
		socket.on("send", function(data){
			handle.insider_send_msg(socket, data);
		});
		socket.on("disconnect", function(data){
			handle.insider_disconnect(socket, data);
		});
		socket.on("status", function(data){
			handle.insider_status(socket, data);
		});
		socket.emit("auth_success", {});
	};
	
	handle.reject_in_connect = function(socket, error){
		socket.emit("auth_error", error);
	};
	
	handle.call_insider = function(){};
	
	handle.notify_in_of_out = function(){};
	
	handle.notify_in_of_typing = function(){};
	
	handle.notify_in_of_read = function(){};
	
	handle.notify_in_of_msg = function(){};
	
	return handle;
};