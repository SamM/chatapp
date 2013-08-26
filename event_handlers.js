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
	
	function get_socket(channel, socket_id){
		var socket = io.of("/"+channel).sockets[socket_id];
		if(!socket){
			log("Bad socket!!!",socket_id);
			return io.of("/"+channel).socket(socket_id);
		}
		return socket;
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
		var chatter = dao.chatter.get(chatter);
		if(!chatter.call_accepted && chatter.operators.length > 0){
			handle.call_declined(chatter);
		}
	}
	
	// Rails to Node
	
	handle.call_received = function(req, res){
		log("Call Received:\n",req.body);
		res.send(200);
		if(dao.chatter.getByToken(req.body.token)){
			log("Token already exists");
		}else{
			var body = req.body,
				chatter = dao.chatter.create(body.token, body.secret, body.name);
				chatter.operators = body.operators;
				chatter.conversation_token = body.conversation_token;
				chatter.call_accepted = false;
				chatter.call_declined = false;
				chatter.chatting_with = null;
				chatter.connected = false;
				chatter.socket = null;
				chatter.socket_id = null;
			dao.chatter.save(chatter);
			handle.call_operators(chatter);
		}		
	};
	
	handle.operator_login = function(req, res){
		var body = req.body,
			operator = dao.operator.create(body.token, body.secret, body.name);
			operator.connected = false;
			operator.socket = null;
			operator.socket_id;
			operator.call_requests = [];
			operator.conversations = [];
		dao.operator.save(operator);
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
			chatter = dao.chatter.getByToken(token);
		
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
		chatter = dao.chatter.get(chatter);
		log("Chatter typing: ",data.typing,chatter.token, chatter.name);
		log("Ch id",socket.id);
		if(chatter.call_accepted){
			var operator = dao.operator.getByToken(chatter.chatting_with);
			handle.notify_operator_of_typing(operator, chatter.conversation_token, data.typing);
		}
	};
	
	handle.chatter_read_message = function(socket, data, chatter){
		chatter = dao.chatter.get(chatter);
		log("Chatter reads messages: ",chatter.token, chatter.name);
		if(chatter.call_accepted){
			var operator = dao.operator.getByToken(chatter.chatting_with);
			handle.notify_operator_of_read(operator, chatter.conversation_token, (new Date()).getTime());
		}
	};
	
	handle.chatter_send_msg = function(socket, data, chatter){
		chatter = dao.chatter.get(chatter);
		log("Chatter sends message: ",chatter.token, chatter.name);
		log("Ch id",socket.id);
		data.message = processMessage(data.message);
		socket.emit("self_message", data);
		if(chatter.call_accepted){
			var operator = dao.operator.getByToken(chatter.chatting_with);
			handle.notify_operator_of_msg(operator, chatter.conversation_token, data.message);
		}else{
			// TODO: Handle messages sent before call is accepted
		}
	};
	
	handle.chatter_disconnect = function(){};
	
	// Operator to Node
	
	handle.operator_connect = function(socket, data){
		var token = data.token,
			secret = data.secret,
			operator = dao.operator.getByToken(token);
		
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
		log("Operator accepts call: ",operator.token,token);
		var chatter = dao.chatter.search(function(session){
			return session.conversation_token == token;
		});
		if(chatter === null) return;
		if(chatter.call_accepted){
			handle.call_already_accepted(socket, chatter);
		}else{
			chatter.call_accepted = true;
			chatter.chatting_with = operator.token;
			
			chatter = dao.chatter.save(chatter);
			operator = dao.operator.get(operator);
			
			log("Connecting chatter and operator", chatter.name, operator.name);
			
			handle.notify_chatter_of_operator(chatter, operator);
			handle.notify_operator_of_chatter(operator, chatter);
		}
	};
	
	handle.operator_declines_call = function(token, operator){
		operator = dao.operator.get(operator);
		log("Operator declines call", operator.token);
		var chatter = dao.chatter.getByConversationToken(token);
		if(chatter === null) return;
		var i = chatter.operators.indexOf(operator.token);
		if(i > -1 && !chatter.call_accepted){
			chatter.operators.splice(i,1);
			dao.chatter.save(chatter);
			if(chatter.operators.length == 0){
				handle.call_declined(chatter);
			}
		}
	};
	
	handle.operator_typing = function(socket, data, operator){
		if(!operator) log("Operator typing. NO OPERATOR !!!", data.typing);
		else log("Operator typing: ",data.typing,operator.token, operator.name);
		log("Op id",socket.id);
		var chatter = dao.chatter.getByConversationToken(data.conversation_token);
		handle.notify_chatter_of_typing(chatter, data.typing);
	};
	
	handle.operator_read_message = function(socket, data, operator){
		if(!operator) log("Operator reads message. NO OPERATOR !!!");
		else log("Operator reads message: ",operator.token, operator.name);
		var chatter = dao.chatter.getByConversationToken(data.conversation_token);
		handle.notify_chatter_of_read(chatter, (new Date()).getTime());
	};
	
	handle.operator_send_msg = function(socket, data, operator){
		var chatter = dao.chatter.getByConversationToken(data.conversation_token);
		data.message = processMessage(data.message);
		handle.notify_chatter_of_msg(chatter, data.message);
		if(!operator) log("Operator sends message. NO OPERATOR !!!");
		else log("Operator sends message:",operator.token,operator.name);
		log("Op id",socket.id);
		socket.emit("self_message", data);
	};
	
	handle.operator_receives_call = function(socket, conversation_token, operator){
		log("Operator has recieved call:", operator.token, conversation_token);
	};
	
	handle.operator_disconnect = function(socket, data){};
	
	handle.operator_status = function(socket, data){};
	
	// Node to Chatter
	
	handle.accept_chatter_connect = function(socket, chatter){
		if(chatter.socket_id == socket.id){
			log("Chatter sends auth again");
		}else{
			chatter = dao.chatter.get(chatter);
			log("Chatter connected: ",chatter.token,chatter.name,chatter.socket_id);
			if(chatter.socket_id){
				log("*Reconnect*");
				get_socket("chatter", chatter.socket_id).emit("alert", "reconnect");
			}
			chatter.connected = true;
			chatter.socket_id = socket.id;
			chatter = dao.chatter.save(chatter);
			log(chatter.socket_id);
			// Setup socket events
			socket.on("typing", function(data){
				//chatter.socket_id = socket.id;
				//chatter = dao.chatter.save(chatter);
				handle.chatter_typing(socket, data, chatter);
			});
			socket.on("message_read", function(data){
				//chatter.socket_id = socket.id;
				//chatter = dao.chatter.save(chatter);
				handle.chatter_read_message(socket, data, chatter);
			});
			socket.on("new_message", function(data){
				//chatter.socket_id = socket.id;
				//chatter = dao.chatter.save(chatter);
				handle.chatter_send_msg(socket, data, chatter);
			});
			socket.on("disconnect", function(data){
				//chatter.socket_id = socket.id;
				//chatter = dao.chatter.save(chatter);
				handle.chatter_disconnect(socket, data, chatter);
			});
			socket.emit("auth_success", {});
			if(chatter.call_accepted){
				log("Call already accepted by operator");
				var operator = dao.operator.getByToken(chatter.chatting_with);
				handle.notify_chatter_of_operator(chatter,operator);
			}
			if(chatter.call_declined){
				handle.call_declined(chatter);
			}
		}
	};
	
	handle.reject_chatter_connect = function(socket, error){
		log("Chatter has trouble with auth: ",error);
		socket.emit("auth_error", error);
	};
	
	handle.call_declined = function(chatter){
		chatter = dao.chatter.get(chatter);
		log("Notifying chatter that call was declined by all operators who were called ",chatter.token, chatter.name);
		chatter.call_declined = true;
		dao.chatter.save(chatter);
		if(chatter.connected){
			get_socket("chatter",chatter.socket_id).emit("call_declined", {});
		}else{
			log("Chatter not connected so will notify of declined call when they connect");
		}
	};
	
	handle.notify_chatter_of_operator = function(chatter, operator){
		chatter = dao.chatter.get(chatter);
		if(chatter.connected){
			log("Notifying chatter of operator", 
				chatter.name, 
				operator.name);
			var operator = dao.operator.getByToken(chatter.chatting_with);
			get_socket("chatter",chatter.socket_id).emit("call_connected", {name: operator.name});
		}else{
			log("Would notify chatter of operator but chatter not connected yet.")
		}
	};
	
	handle.notify_chatter_of_typing = function(chatter, typing){
		chatter = dao.chatter.get(chatter);
		log("Ch id",chatter.socket_id);
		get_socket("chatter",chatter.socket_id).emit("typing", {"typing": typing});
	};
	
	handle.notify_chatter_of_read = function(chatter, timestamp){
		chatter = dao.chatter.get(chatter);
		get_socket("chatter",chatter.socket_id).emit("message_seen", {"timestamp": timestamp});
	};
	
	handle.notify_chatter_of_msg = function(chatter, message){
		chatter = dao.chatter.get(chatter);
		log("Ch id",chatter.socket_id);
		get_socket("chatter",chatter.socket_id).emit("operator_message", {"message": message});
	};
	
	// Node to Operator
	
	handle.accept_operator_connect = function(socket, operator){
		if(operator.socket_id == socket.id){
			log("Operator sends auth again");
		}else{
			operator = dao.operator.get(operator);
			log("Operator connected: ", operator.token, operator.name, operator.socket_id);
			if(operator.socket_id){
				log("*Reconnect*");
				get_socket("operator", operator.socket_id).emit("alert", "reconnect");
			}
			operator.connected = true;
			operator.socket_id = socket.id;
			operator = dao.operator.save(operator);
			log(operator.socket_id);
			socket.on("typing", function(data){
				//operator.socket_id = socket.id;
				//operator = dao.operator.save(operator);
				handle.operator_typing(socket, data, operator);
			});
			socket.on("message_read", function(data){
				//operator.socket_id = socket.id;
				//operator = dao.operator.save(operator);
				handle.operator_read_message(socket, data, operator);
			});
			socket.on("new_message", function(data){
				//operator.socket_id = socket.id;
				//operator = dao.operator.save(operator);
				handle.operator_send_msg(socket, data, operator);
			});
			socket.on("disconnect", function(data){
				//operator.socket_id = socket.id;
				//operator = dao.operator.save(operator);
				log("Operator Disconnects!!");
				handle.operator_disconnect(socket, data, operator);
			});
			socket.on("status", function(data){
				operator.socket_id = socket.id;
				operator = dao.operator.save(operator);
				handle.operator_status(socket, data, operator);
			});
			socket.on("call_received", function(token){
				operator.socket_id = socket.id;
				operator = dao.operator.save(operator);
				handle.operator_receives_call(socket, token, operator);
			});
			socket.on("accept_call", function(token){
				operator.socket_id = socket.id;
				operator = dao.operator.save(operator);
				handle.operator_accepts_call(socket, token, operator);
			});
			socket.on("decline_call", function(token){
				operator.socket_id = socket.id;
				operator = dao.operator.save(operator);
				handle.operator_declines_call(token, operator);
			});
			socket.emit("auth_success", {});

			if(operator.conversations.length){
				operator.conversations.forEach(function(token){
					var chatter = dao.chatter.getByToken(token);
					if(!chatter) log("Chatter not found");
					handle.notify_operator_of_chatter(operator, chatter);
				});
			}

			if(operator.call_requests.length){
				log("Operator has call requests waiting:",operator.call_requests.join(", "));
				operator.call_requests.forEach(function(token){
					var chatter = dao.chatter.getByToken(token);

					if(!chatter.call_accepted){
						log("Call has not yet been accepted:", token);
						handle.call_operator(operator, chatter);
					}
				});
				operator.call_requests = [];
			}
		}		
	};
	
	handle.reject_operator_connect = function(socket, error){
		log("Operator has trouble with auth:",error);
		socket.emit("auth_error", error);
	};
	
	handle.call_operators = function(chatter){
		chatter = dao.chatter.get(chatter);
		log("Calling operators for chatter:",chatter.token, chatter.name);
		var operators = chatter.operators;
		operators.forEach(function(token){
			handle.call_operator(token, chatter);
		});
		setTimeout(function(){ handle.stop_waiting_for_operators(chatter); }, WAITING_TIME);
	};
	
	handle.call_operator = function(operator_token, chatter){
		var operator = dao.operator.get(operator_token);
		chatter = dao.chatter.get(chatter);
		if(operator === null){
			log("Calling operator fails because operator not found:",operator_token);
			handle.operator_declines_call(chatter.conversation_token, operator_token);
			return;
		}
		if(operator.connected){
			log("Calling operator:", operator.token, operator.socket_id);
			var	socket = get_socket("operator",operator.socket_id);
			socket.emit("call_request", {
				name: chatter.name, 
				conversation_token: chatter.conversation_token, 
				chatter_token: chatter.token });
		}else{
			log("Operator not connected yet:"+operator.token);
			operator.call_requests.push(chatter.token);
			dao.operator.save(operator);
		}
	};
	
	handle.notify_operator_of_chatter = function(operator, chatter){
		operator = dao.operator.get(operator);
		log("Notifying operator of chatter:", operator.name, chatter.name)
		var token = chatter.token;
		if(operator.conversations.indexOf(token)===-1){
			operator.conversations.push(token);
			dao.operator.save(operator);
		}
		get_socket("operator",operator.socket_id).emit("call_connected", {conversation_token: chatter.conversation_token, name: chatter.name, chatter_token: chatter.token})
	};
	
	handle.notify_operator_of_typing = function(operator, conversation_token, typing){
		operator = dao.operator.get(operator);
		log("Op id",operator.socket_id);
		get_socket("operator",operator.socket_id).emit("typing", {"typing": typing, "conversation_token": conversation_token});
	};
	
	handle.notify_operator_of_read = function(operator, conversation_token, timestamp){
		operator = dao.operator.get(operator);
		get_socket("operator",operator.socket_id).emit("message_seen", {"conversation_token": conversation_token, "timestamp": timestamp});
	};
	
	handle.notify_operator_of_msg = function(operator, conversation_token, message){
		operator = dao.operator.get(operator);
		log("Op id",operator.socket_id);
		get_socket("operator",operator.socket_id).emit("chatter_message", {"message": message, "conversation_token": conversation_token});
	};
	
	return handle;
};