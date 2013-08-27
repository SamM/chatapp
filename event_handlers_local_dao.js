module.exports = function(env){
	var io = env.io,
		express = env.express,
		app = env.app,
		dao = env.dao,
		handle = {},
		WAITING_TIME = 10 * 1000;
	
	function log(){
		console.log.apply(console, arguments);
	}
	
	function get_sockets(channel, user){
		if(!user) return [];
		var sockets = [],
			ids = [];
		user.sockets.forEach(function(id){
			var socket = io.of("/"+channel).sockets[id];
			if(socket){
				sockets.push(socket);
				ids.push(id);
			}
		});
		user.sockets = ids;
		return sockets;
	}
	
	var processMessage = function(msg){
		var strip_attrs = /<\s*([a-zA-Z0-9]*)\s+([^>]*)>/gi;
		msg = msg.replace(strip_attrs,"<$1>");
		var strip_tags = /<(\/?)\s*([a-zA-Z0-9]*)[^>]*>/gi,
			open_tags = [],
			accept_tags = ["b","strong","i","u"];
		function filter_tags(match, p1, p2, offset, str){
			p2 = p2.toLowerCase();
			if(accept_tags.indexOf(p2)==-1)
				return "";
			var tag = "<";
			if(p1=="/"){
				var i = open_tags.indexOf(p2);
				if(i>-1){
					for(var t=i-1;t>=0;t--){
						tag = "</"+open_tags[t]+">"+tag;
					}
					open_tags.splice(0,i+1);
				}
				tag += "/";
			}else{
				open_tags.unshift(p2);
			}
			tag += p2+">";
			return tag;
		}
		msg = msg.replace(strip_tags, filter_tags);
		for(var i=0;i<open_tags.length;i++){
			msg+="</"+open_tags[i]+">";
		}
		return msg;
	}
	
	handle.stop_waiting_for_operators = function(chatter){
		if(!chatter.call_accepted && chatter.operators.length > 0){
			handle.call_declined(chatter);
		}
	}
	
	// Rails to Node
	
	handle.call_received = function(req, res){
		log("Call Received:\n",req.body);
		res.send(200);
		if(dao.chatter.exists(req.body.token)){
			log("Token already exists");
		}else{
			var body = req.body,
				chatter = dao.chatter.create(body.token, body.secret, body.name, body.operators, body.conversation_token);
			handle.call_operators(chatter);
		}		
	};
	
	handle.operator_login = function(req, res){
		var body = req.body,
			operator = dao.operator.create(body.token, body.secret, body.name);
		log("Operator logs in: ",operator);
		res.send(200);
	};
	
	handle.operator_logout = function(req, res){
		var secret = req.params.secret,
			token = req.params.token;
		log("Operator logs in: ",token);
		dao.operator.remove(token);
		res.send(200);
	};
	
	handle.msg_by_chatter_logged = function(){};
	
	handle.msg_by_operator_logged = function(){};
	
	handle.read_by_chatter_logged = function(){};
		
	handle.read_by_operator_logged = function(){};
	
	handle.operator_status_cb = function(){};
	
	// Node to Rails
	
	handle.log_msg_by_in = function(){};
	
	handle.log_msg_by_out = function(){};
	
	handle.log_read_by_in = function(){};
	
	handle.log_read_by_out = function(){};
	
	handle.operator_status = function(){};
	
	// Chatter to Node
	
	handle.chatter_connect = function(socket, data){
		var token = data.token,
			secret = data.secret,
			chatter = dao.use.chatter(token);
		
		if(token === undefined || secret === undefined){
			handle.reject_chatter_connect(socket, token === undefined ? "missing token" : "missing secret");
		}else if(chatter === null){
			handle.reject_chatter_connect(socket, "bad token");
		}else if(chatter.secret !== secret){
			handle.reject_chatter_connect(socket, "bad secret");
		}else{
			// Connected successfully
			handle.accept_chatter_connect(socket, chatter);
		}
	};
	
	handle.chatter_typing = function(socket, data, chatter){
		log("Chatter typing:\n\t", data.typing, chatter.token, chatter.name, socket.id);
		if(chatter.call_accepted){
			var operator = dao.use.operator(chatter.chatting_with);
			handle.notify_operator_of_typing(operator, chatter.conversation_token, data.typing);
		}
	};
	
	handle.chatter_read_message = function(socket, data, chatter){
		log("Chatter reads messages:\n\t",chatter.token, chatter.name);
		if(chatter.call_accepted){
			var operator = dao.use.operator(chatter.chatting_with);
			handle.notify_operator_of_read(operator, chatter.conversation_token, (new Date()).getTime());
		}
	};
	
	handle.chatter_send_msg = function(socket, data, chatter){
		log("Chatter sends message:\n\t",chatter.token, chatter.name, socket.id);
		data.message = processMessage(data.message);
		get_sockets("chatter",chatter).forEach(function(s){s.emit("self_message", data);});
		if(chatter.call_accepted){
			var operator = dao.use.operator(chatter.chatting_with);
			handle.notify_operator_of_msg(operator, chatter.conversation_token, data.message);
		}else{
			// TODO: Handle messages sent before call is accepted
		}
	};
	
	handle.chatter_disconnect = function(socket, data, chatter){
		log("Chatter Disconnects!!", socket.id);
		chatter.remove_socket(socket.id);
		if(chatter.call_accepted){
			var operator = dao.use.operator(chatter.chatting_with);
			handle.notify_operator_of_chatter_disconnect(operator, chatter);
		}
	};
	
	// Operator to Node
	
	handle.operator_connect = function(socket, data){
		var token = data.token,
			secret = data.secret,
			operator = dao.use.operator(token);
		
		if(token === undefined || secret === undefined){
			handle.reject_operator_connect(socket, token === undefined ? "missing token" : "missing secret");
		}else if(operator === null){
			handle.reject_operator_connect(socket, "bad token");
		}else if(operator.secret !== secret){
			handle.reject_operator_connect(socket, "bad secret");
		}else{
			// Connected successfully
			handle.accept_operator_connect(socket, operator);
		}
	};
	
	handle.operator_accepts_call = function(socket, token, operator){
		log("Operator accepts call:\n\t",operator.token,token);
		var chatter = dao.chatter.search(function(session){
			return session.conversation_token == token;
		});
		if(chatter === null) return;
		if(chatter.call_accepted){
			handle.call_already_accepted(socket, chatter);
		}else{
			chatter.call_accepted = true;
			chatter.chatting_with = operator.token;
			
			log("Connecting chatter and operator", chatter.name, operator.name);
			
			handle.notify_chatter_of_operator(chatter, operator);
			handle.notify_operator_of_chatter(operator, chatter);
		}
	};
	
	handle.operator_declines_call = function(token, operator){
		log("Operator declines call:\n\t", operator.token);
		var chatter = dao.chatter.getByConversationToken(token);
		if(chatter === null) return;
		var ops = chatter.operators,
			i = ops.indexOf(operator.token);
		if(i > -1 && !chatter.call_accepted){
			ops.splice(i,1);
			chatter.operators = ops;
			if(ops.length == 0){
				handle.call_declined(chatter);
			}
		}
	};
	
	handle.operator_typing = function(socket, data, operator){
		log("Operator typing:\n\t",data.typing,operator.token, operator.name, socket.id);
		var chatter = dao.chatter.getByConversationToken(data.conversation_token);
		handle.notify_chatter_of_typing(chatter, data.typing);
	};
	
	handle.operator_read_message = function(socket, data, operator){
		log("Operator reads message:\n\t",operator.token, operator.name);
		var chatter = dao.chatter.getByConversationToken(data.conversation_token);
		handle.notify_chatter_of_read(chatter, (new Date()).getTime());
	};
	
	handle.operator_send_msg = function(socket, data, operator){
		log("Operator sends message:\n\t",operator.token,operator.name, socket.id);
		var chatter = dao.chatter.getByConversationToken(data.conversation_token);
		data.message = processMessage(data.message);
		handle.notify_chatter_of_msg(chatter, data.message);
		get_sockets("operator",operator).forEach(function(s){
			log("Op self_message to socket:",s.id);
			s.emit("self_message", data);});
	};
	
	handle.operator_receives_call = function(socket, conversation_token, operator){
		log("Operator has recieved call:\n\t", operator.token, conversation_token);
	};
	
	handle.operator_disconnect = function(socket, data, operator){
		log("Operator Disconnects!!",socket.id);
		operator.remove_socket(socket.id);
		if(operator.conversations.length){
			operator.conversations.forEach(function(token){
				var chatter = dao.use.chatter(token);
				if(!chatter) log("Chatter not found");
				handle.notify_chatter_of_operator_disconnect(chatter, operator);
			});
		}
	};
	
	handle.operator_status = function(socket, data){};
	
	// Node to Chatter
	
	handle.accept_chatter_connect = function(socket, chatter){
		if(chatter.sockets.indexOf(socket.id)>-1){
			log("Chatter sends auth again");
		}else{
			log("Chatter connected:\n\t",chatter.token,chatter.name,chatter.sockets);
			
			var sockets = get_sockets("chatter", chatter);
			if(sockets.length){
				log("*Reconnect*");
				sockets.forEach(function(s){
					s.emit("multiple_connections", {quantity: sockets.length+1});
				});
			}
			
			chatter.connected = true;
			chatter.add_socket(socket.id);
			log(chatter.sockets);
			
			// Setup socket events
			socket.on("typing", function(data){
				handle.chatter_typing(socket, data, chatter);
			});
			socket.on("message_read", function(data){
				handle.chatter_read_message(socket, data, chatter);
			});
			socket.on("new_message", function(data){
				handle.chatter_send_msg(socket, data, chatter);
			});
			socket.on("disconnect", function(data){
				handle.chatter_disconnect(socket, data, chatter);
			});
			socket.emit("auth_success", {});
			
			if(chatter.call_accepted){
				log("Call already accepted by operator");
				var operator = dao.use.operator(chatter.chatting_with);
				handle.notify_chatter_of_operator(chatter, operator, socket.id);
				handle.notify_operator_of_chatter_reconnect(operator, chatter);
			}
			if(chatter.call_declined){
				handle.call_declined(chatter);
			}
		}
	};
	
	handle.reject_chatter_connect = function(socket, error){
		log("Chatter has trouble with auth:\n\t",error);
		socket.emit("auth_error", error);
	};
	
	handle.call_declined = function(chatter){
		log("Notifying chatter that call was declined by all operators who were called:\n\t",chatter.token, chatter.name);
		chatter.call_declined = true;
		if(chatter.connected){
			get_sockets("chatter",chatter).forEach(function(s){s.emit("call_declined", {});});
		}else{
			log("Chatter not connected so will notify of declined call when they connect");
		}
	};
	
	handle.notify_chatter_of_operator = function(chatter, operator, socket_id){
		if(chatter.connected){
			log("Notifying chatter of operator:\n\t", chatter.name, operator.name);
			var operator = dao.use.operator(chatter.chatting_with);
			get_sockets("chatter",chatter).forEach(function(s){
				if(!socket_id || s.id == socket_id)
					s.emit("call_connected", {name: operator.name});
			});
		}else{
			log("Would notify chatter of operator but chatter not connected yet.")
		}
	};
	
	handle.notify_chatter_of_typing = function(chatter, typing){
		log("Ch id",chatter.sockets);
		get_sockets("chatter",chatter).forEach(function(s){s.emit("typing", {"typing": typing});});
	};
	
	handle.notify_chatter_of_read = function(chatter, timestamp){
		get_sockets("chatter",chatter).forEach(function(s){s.emit("message_seen", {"timestamp": timestamp});});
	};
	
	handle.notify_chatter_of_msg = function(chatter, message){
		log("Ch id",chatter.sockets);
		get_sockets("chatter",chatter).forEach(function(s){s.emit("operator_message", {"message": message});});
	};
	
	handle.notify_chatter_of_operator_disconnect = function(chatter, operator){
		get_sockets('chatter', chatter).forEach(function(s){
			s.emit("operator_disconnect", { timestamp: (new Date()).getTime(), "connections": operator.sockets.length });
		});
	};
	handle.notify_chatter_of_operator_reconnect = function(chatter, operator){
		get_sockets('chatter', chatter).forEach(function(s){
			s.emit("operator_reconnect", { timestamp: (new Date()).getTime(), "connections": operator.sockets.length });
		});
	}
	
	// Node to Operator
	
	handle.accept_operator_connect = function(socket, operator){
		if(operator.sockets == socket.id){
			log("Operator sends auth again");
		}else{
			log("Operator connected:\n\t", operator.token, operator.name, operator.sockets);
			var sockets = get_sockets("operator", operator);
			if(sockets.length){
				log("*Reconnect*");
				sockets.forEach(function(s){
					s.emit("multiple_connections", {quantity: sockets.length+1});
				});
			}
			operator.connected = true;
			operator.add_socket(socket.id);
			log(operator.sockets);
			
			socket.on("typing", function(data){
				handle.operator_typing(socket, data, operator);
			});
			socket.on("message_read", function(data){
				handle.operator_read_message(socket, data, operator);
			});
			socket.on("new_message", function(data){
				handle.operator_send_msg(socket, data, operator);
			});
			socket.on("disconnect", function(data){
				handle.operator_disconnect(socket, data, operator);
			});
			socket.on("status", function(data){
				handle.operator_status(socket, data, operator);
			});
			socket.on("call_received", function(token){
				handle.operator_receives_call(socket, token, operator);
			});
			socket.on("accept_call", function(token){
				handle.operator_accepts_call(socket, token, operator);
			});
			socket.on("decline_call", function(token){
				handle.operator_declines_call(token, operator);
			});
			socket.emit("auth_success", {});

			if(operator.conversations.length){
				operator.conversations.forEach(function(token){
					var chatter = dao.use.chatter(token);
					if(!chatter) log("Chatter not found");
					handle.notify_operator_of_chatter(operator, chatter, socket.id);
					handle.notify_chatter_of_operator_reconnect(chatter, operator);
				});
			}

			if(operator.call_requests.length){
				log("Operator has call requests waiting:\n\t",operator.call_requests.join(", "));
				operator.call_requests.forEach(function(token){
					var chatter = dao.use.chatter(token);

					if(!chatter.call_accepted){
						log("Call has not yet been accepted:\n\t", token);
						handle.call_operator(operator, chatter);
					}
				});
				operator.call_requests = [];
			}
		}		
	};
	
	handle.reject_operator_connect = function(socket, error){
		log("Operator has trouble with auth:\n\t",error);
		socket.emit("auth_error", error);
	};
	
	handle.call_operators = function(chatter){
		log("Calling operators for chatter:\n\t",chatter.token, chatter.name);
		var operators = chatter.operators;
		operators.forEach(function(token){
			handle.call_operator(token, chatter);
		});
		setTimeout(function(){ handle.stop_waiting_for_operators(chatter); }, WAITING_TIME);
	};
	
	handle.call_operator = function(operator_token, chatter){
		var operator = dao.use.operator(operator_token);
		if(operator === null){
			log("Calling operator fails because operator not found:\n\t",operator_token);
			handle.operator_declines_call(chatter.conversation_token, operator_token);
			return;
		}
		if(operator.connected){
			log("Calling operator:\n\t", operator.token, operator.name, operator.sockets);
			var	sockets = get_sockets("operator",operator);
			sockets.forEach(function(s){
				log('Socket call_request:\n\t', s.id);
				s.emit("call_request", {
					name: chatter.name, 
					conversation_token: chatter.conversation_token, 
					chatter_token: chatter.token 
				});
			});
		}else{
			log("Operator not connected yet:\n\t"+operator.token);
			operator.add_call_request(chatter.token);
		}
	};
	
	handle.notify_operator_of_chatter = function(operator, chatter, socket_id){
		log("Notifying operator of chatter:\n\t", operator.name, chatter.name)
		var token = chatter.token;
		if(operator.conversations.indexOf(token)===-1){
			operator.add_conversation(token);
		}
		get_sockets("operator",operator).forEach(function(s){
			if(!socket_id || socket_id == s.id){
				s.emit("call_connected", {
					conversation_token: chatter.conversation_token, 
					name: chatter.name, 
					chatter_token: chatter.token
				});
			}
		});
	};
	
	handle.notify_operator_of_typing = function(operator, conversation_token, typing){
		log("Op id",operator.sockets);
		get_sockets("operator",operator).forEach(function(s){s.emit("typing", {"typing": typing, "conversation_token": conversation_token});});
	};
	
	handle.notify_operator_of_read = function(operator, conversation_token, timestamp){
		get_sockets("operator",operator).forEach(function(s){s.emit("message_seen", {"conversation_token": conversation_token, "timestamp": timestamp});});
	};
	
	handle.notify_operator_of_msg = function(operator, conversation_token, message){
		log("Op id",operator.sockets);
		get_sockets("operator",operator).forEach(function(s){s.emit("chatter_message", {"message": message, "conversation_token": conversation_token});});
	};
	
	handle.notify_operator_of_chatter_disconnect = function(operator, chatter){
		get_sockets('operator', operator).forEach(function(s){
			s.emit("chatter_disconnect", { 
				'conversation_token': chatter.conversation_token, 
				chatter_token: chatter.token, 
				timestamp: (new Date()).getTime(),
				connections: chatter.sockets.length
			});
		});
	};
	
	handle.notify_operator_of_chatter_reconnect = function(operator, chatter){
		get_sockets('operator', operator).forEach(function(s){
			s.emit("chatter_reconnect", { 
				'conversation_token': chatter.conversation_token, 
				chatter_token: chatter.token, 
				timestamp: (new Date()).getTime(),
				connections: chatter.sockets.length
			});
		});
	};
	
	return handle;
};