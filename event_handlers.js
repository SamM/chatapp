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
	
	handle.stop_waiting_for_operators = function(chatter_token){
		var chatter = dao.chatter.getByToken(chatter_token);
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
			dao.chatter.save(chatter);
			handle.call_operators(chatter);
		}		
	};
	
	handle.operator_login = function(req, res){
		var body = req.body,
			operator = dao.operator.create(body.token, body.secret, body.name);
			operator.connected = false;
			operator.socket = null;
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
			session = dao.chatter.getByToken(token);
		
		if(token === undefined || secret === undefined){
			handle.reject_chatter_connect(socket, token === undefined ? "missing token" : "missing secret");
		}else if(session === null){
			handle.reject_chatter_connect(socket, "bad token");
		}else if(session.secret !== secret){
			handle.reject_chatter_connect(socket, "bad secret");
		}else{
			// Connected successfully
			handle.accept_chatter_connect(socket, session);
		}
	};
	
	handle.chatter_typing = function(socket, data){
		log("Chatter typing: ",data.typing,socket.chatter.token, socket.chatter.name);
		var chatter = dao.chatter.get(socket.chatter);
		if(chatter.call_accepted){
			var operator = dao.operator.getByToken(chatter.chatting_with);
			handle.notify_operator_of_typing(operator, chatter.conversation_token, data.typing);
		}
	};
	
	handle.chatter_read_message = function(socket, data){
		log("Chatter reads messages: ",socket.chatter.token, socket.chatter.name);
		var chatter = dao.chatter.get(socket.chatter);
		if(chatter.call_accepted){
			var operator = dao.operator.getByToken(chatter.chatting_with);
			handle.notify_operator_of_read(operator, chatter.conversation_token, (new Date()).getTime());
		}
	};
	
	handle.chatter_send_msg = function(socket, data){
		var chatter = dao.chatter.get(socket.chatter);
		log("Chatter sends message: ",socket.chatter.token, socket.chatter.name);
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
			session = dao.operator.getByToken(token);
		
		if(token === undefined || secret === undefined){
			handle.reject_operator_connect(socket, token === undefined ? "missing token" : "missing secret");
		}else if(session === null){
			handle.reject_operator_connect(socket, "bad token");
		}else if(session.secret !== secret){
			handle.reject_operator_connect(socket, "bad secret");
		}else{
			// Connected successfully
			handle.accept_operator_connect(socket, session);
		}
	};
	
	handle.operator_accepts_call = function(socket, token, operator_token){
		log("Operator accepts call: ",operator_token,token);
		var chatter = dao.chatter.search(function(session){
			return session.conversation_token == token;
		});
		if(chatter === null) return;
		if(chatter.call_accepted){
			handle.call_already_accepted(socket, chatter);
		}else{
			chatter.call_accepted = true;
			chatter.chatting_with = operator_token;
			
			chatter = dao.chatter.save(chatter);
			var operator = dao.operator.getByToken(operator_token);
			
			log("Connecting chatter and operator", chatter.name, operator.name);
			
			handle.notify_chatter_of_operator(chatter, operator);
			handle.notify_operator_of_chatter(operator, chatter);
		}
	};
	
	handle.operator_declines_call = function(token, operator_token){
		log("Operator declines call", operator_token);
		var chatter = dao.chatter.getByConversationToken(token);
		if(chatter === null) return;
		var i = chatter.operators.indexOf(operator_token);
		if(i > -1 && !chatter.call_accepted){
			chatter.operators.splice(i,1);
			dao.chatter.save(chatter);
			if(chatter.operators.length == 0){
				handle.call_declined(chatter);
			}
		}
	};
	
	handle.operator_typing = function(socket, data){
		log("Operator typing: ",data.typing,socket.operator.token, socket.operator.name);
		var chatter = dao.chatter.getByConversationToken(data.conversation_token);
		handle.notify_chatter_of_typing(chatter, data.typing);
	};
	
	handle.operator_read_message = function(socket, data){
		log("Operator reads message: ",socket.operator.token, socket.operator.name);
		var chatter = dao.chatter.getByConversationToken(data.conversation_token);
		handle.notify_chatter_of_read(chatter, (new Date()).getTime());
	};
	
	handle.operator_send_msg = function(socket, data){
		var chatter = dao.chatter.getByConversationToken(data.conversation_token);
		data.message = processMessage(data.message);
		handle.notify_chatter_of_msg(chatter, data.message);
		log("Operator sends message:",socket.operator.token,socket.operator.name);
		socket.emit("self_message", data);
	};
	
	handle.operator_receives_call = function(socket, conversation_token, operator_token){
		log("Operator has recieved call:", operator_token, conversation_token);
	};
	
	handle.operator_disconnect = function(socket, data){};
	
	handle.operator_status = function(socket, data){};
	
	// Node to Chatter
	
	handle.accept_chatter_connect = function(socket, chatter){
		if(chatter.socket == socket){
			log("Chatter sends auth again");
		}else{
			log("Chatter connected: ",chatter.token,chatter.name);
			chatter.socket = socket;
			chatter.connected = true;
			socket.chatter = dao.chatter.save(chatter);
			// Setup socket events
			socket.on("typing", function(data){
				handle.chatter_typing(socket, data);
			});
			socket.on("message_read", function(data){
				handle.chatter_read_message(socket, data);
			});
			socket.on("new_message", function(data){
				handle.chatter_send_msg(socket, data);
			});
			socket.on("disconnect", function(data){
				handle.chatter_disconnect(socket, data);
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
		log("Notifying chatter that call was declined by all operators who were called ",chatter.token, chatter.name);
		chatter.call_declined = true;
		dao.chatter.save(chatter);
		if(chatter.connected){
			chatter.socket.emit("call_declined", {});
		}else{
			log("Chatter not connected so will notify of declined call when they connect");
		}
	};
	
	handle.notify_chatter_of_operator = function(chatter, operator){
		if(chatter.connected){
			log("Notifying chatter of operator", 
				chatter.name, 
				operator.name);
			var operator = dao.operator.getByToken(chatter.chatting_with);
			chatter.socket.emit("call_connected", {name: operator.name});
		}else{
			log("Would notify chatter of operator but chatter not connected yet.")
		}
	};
	
	handle.notify_chatter_of_typing = function(chatter, typing){
		chatter.socket.emit("typing", {"typing": typing});
	};
	
	handle.notify_chatter_of_read = function(chatter, timestamp){
		chatter.socket.emit("message_seen", {"timestamp": timestamp});
	};
	
	handle.notify_chatter_of_msg = function(chatter, message){
		chatter.socket.emit("operator_message", {"message": message});
	};
	
	// Node to Operator
	
	handle.accept_operator_connect = function(socket, operator){
		log("Operator connected: ", operator.token, operator.name);
		if(operator.socket == socket){
			log("Operator sends auth again");
		}else{
			operator.socket = socket;
			operator.connected = true;
			socket.operator = dao.operator.save(operator);

			socket.on("typing", function(data){
				handle.operator_typing(socket, data);
			});
			socket.on("message_read", function(data){
				handle.operator_read_message(socket, data);
			});
			socket.on("new_message", function(data){
				handle.operator_send_msg(socket, data);
			});
			socket.on("disconnect", function(data){
				handle.operator_disconnect(socket, data);
			});
			socket.on("status", function(data){
				handle.operator_status(socket, data);
			});
			socket.on("call_received", function(token){
				handle.operator_receives_call(socket, token, operator.token);
			});
			socket.on("accept_call", function(token){
				handle.operator_accepts_call(socket, token, operator.token);
			});
			socket.on("decline_call", function(token){
				handle.operator_declines_call(token, operator.token);
			});
			socket.emit("auth_success", {});

			if(operator.conversations.length){
				operator.conversations.forEach(function(token){
					var chatter = dao.chatter.getByToken(token);
					handle.notify_operator_of_chatter(operator, chatter);
				});
			}

			if(operator.call_requests.length){
				log("Operator has call requests waiting:",operator.call_requests.join(", "));
				operator.call_requests.forEach(function(token){
					var chatter = dao.chatter.getByToken(token);

					if(!chatter.call_accepted){
						log("Call has not yet been accepted:", token);
						handle.call_operator(operator.token, chatter);
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
		log("Calling operators for chatter:",chatter.token, chatter.name);
		var operators = chatter.operators;
		operators.forEach(function(token){
			handle.call_operator(token, chatter);
		});
		setTimeout(function(){ handle.stop_waiting_for_operators(chatter.token); }, WAITING_TIME);
	};
	
	handle.call_operator = function(operator_token, chatter){
		var operator = dao.operator.getByToken(operator_token);
		if(operator === null){
			log("Calling operator fails because operator not found:",operator_token);
			handle.operator_declines_call(chatter.conversation_token, operator_token);
			return;
		}
		if(operator.connected){
			log("Calling operator:", operator_token);
			var	socket = operator.socket;
			socket.emit("call_request", {
				name: chatter.name, 
				conversation_token: chatter.conversation_token, 
				chatter_token: chatter.token });
		}else{
			log("Operator not connected yet:"+operator_token);
			operator.call_requests.push(chatter.token);
		}
	};
	
	handle.notify_operator_of_chatter = function(operator, chatter){
		log("Notifying operator of chatter:", operator.name, chatter.name)
		var token = chatter.token;
		if(operator.conversations.indexOf(token)===-1){
			operator.conversations.push(token);
			dao.operator.save(operator);
		}
		operator.socket.emit("call_connected", {conversation_token: chatter.conversation_token, name: chatter.name, chatter_token: chatter.token})
	};
	
	handle.notify_operator_of_typing = function(operator, conversation_token, typing){
		operator.socket.emit("typing", {"typing": typing, "conversation_token": conversation_token});
	};
	
	handle.notify_operator_of_read = function(operator, conversation_token, timestamp){
		operator.socket.emit("message_seen", {"conversation_token": conversation_token, "timestamp": timestamp});
	};
	
	handle.notify_operator_of_msg = function(operator, conversation_token, message){
		operator.socket.emit("chatter_message", {"message": message, "conversation_token": conversation_token});
	};
	
	return handle;
};