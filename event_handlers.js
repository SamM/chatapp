module.exports = function(env){
	var io = env.io,
		express = env.express,
		app = env.app,
		dao = env.dao,
		http = require('http'),
		querystring = require('querystring'),
		rails_host = 'localhost',
		rails_path = '',
		rails_port = 5000,
		handle = {},
		WAITING_TIME = 10 * 1000,
		STATUS = { OFFLINE: 0, ONLINE: 1, BUSY: 2, AWAY: 3 };
	
	function log(){
		console.log.apply(console, arguments);
	}
	function none(){};
	function get_sockets(channel, user, cb){
		if(!user) return (cb||none)([]);
		user.get_sockets(function(sockets){
			var kept = [],
				ids = [];
			sockets.forEach(function(id){
				var socket = io.of("/"+channel).sockets[id];
				if(socket){
					kept.push(socket);
					ids.push(id);
				}
			});
			user.sockets = ids;
			(cb||none)(kept);
		});
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
		chatter.get_call_accepted(function(call_accepted){
			if(!call_accepted){
				chatter.get_operators(function(operators){
					if(operators.length > 0){
						handle.call_declined(chatter);
					}
				})
			}
		});
	};
	
	// Node to Rails
	
	handle.call_received = function(chatter, cb, err_cb){
		var options = {
			hostname: rails_host,
			port: rails_port,
			path: rails_path+'/call/connect.json?access_token='+chatter.token,
			method: 'GET'
		},
			res_data = "",
		var req = http.request(options, function(res){
		 	res.setEncoding('utf8');
			res.on('data', function (chunk) {
		    	res_data += chunk;
		 	});
		 	res.on('end', function(){
		 		cb(res, JSON.parse(res_data));
		 	});
		});
		req.on('error', err_cb||none);
		req.end();
	};
	
	handle.log_send_message = function(user1, user2, message, cb, err_cb){
		var data = querystring.stringify({user_id: user2.token, message: message});
		var options = {
			hostname: rails_host,
			port: rails_port,
			path: rails_path+'/message.json?access_token='+user1.token,
			method: 'POST',
			headers: {
		        'Content-Type': 'application/x-www-form-urlencoded',
		        'Content-Length': Buffer.byteLength(data)
		    }
		},
			res_data = "",
		var req = http.request(options, function(res){
		 	res.setEncoding('utf8');
			res.on('data', function (chunk) {
		    	res_data += chunk;
		 	});
		 	res.on('end', function(){
		 		cb(res, JSON.parse(res_data));
		 	});
		});
		req.on('error', err_cb||none);
		req.write(data);
		req.end();
	};
	
	handle.log_read_message = function(user, msg_id, cb, err_cb){
		var options = {
			hostname: rails_host,
			port: rails_port,
			path: rails_path+'/'+msg_id+'/read.json?access_token='+user.token,
			method: 'PUT',
			headers: {
		        'Content-Type': 'application/x-www-form-urlencoded',
		        'Content-Length': Buffer.byteLength("")
		    }
		},
			res_data = "",
		var req = http.request(options, function(res){
		 	res.setEncoding('utf8');
			res.on('data', function (chunk) {
		    	res_data += chunk;
		 	});
		 	res.on('end', function(){
		 		(cb||none)(res, JSON.parse(res_data));
		 	});
		});
		req.on('error', err_cb||none);
		req.end();
	};
	
	handle.operator_status = function(operator, status, cb, err_cb){
		var data = querystring.stringify({status: status});
		var options = {
			hostname: rails_host,
			port: rails_port,
			path: rails_path+'/status.json?access_token='+operator.token,
			method: 'POST',
			headers: {
		        'Content-Type': 'application/x-www-form-urlencoded',
		        'Content-Length': Buffer.byteLength(data)
		    }
		},
			res_data = "",
		var req = http.request(options, function(res){
		 	res.setEncoding('utf8');
			res.on('data', function (chunk) {
		    	res_data += chunk;
		 	});
		 	res.on('end', function(){
		 		cb(res, JSON.parse(res_data));
		 	});
		});
		req.on('error', err_cb||none);
		req.write(data);
		req.end();
	};

	handle.log_call_accepted = function(operator, chatter, cb, err_cb){
		var data = querystring.stringify({user_id: chatter.token});
		var options = {
			hostname: rails_host,
			port: rails_port,
			path: rails_path+'/call/accept.json?access_token='+operator.token,
			method: 'POST',
			headers: {
		        'Content-Type': 'application/x-www-form-urlencoded',
		        'Content-Length': Buffer.byteLength(data)
		    }
		},
			res_data = "",
		var req = http.request(options, function(res){
		 	res.setEncoding('utf8');
			res.on('data', function (chunk) {
		    	res_data += chunk;
		 	});
		 	res.on('end', function(){
		 		cb(res, JSON.parse(res_data));
		 	});
		});
		req.on('error', err_cb||none);
		req.write(data);
		req.end();
	};

	handle.request_user_info = function(user, cb, err_cb){
		var options = {
			hostname: rails_host,
			port: rails_port,
			path: rails_path+'/me.json?access_token='+user.token,
			method: 'GET'
		},
			res_data = "",
		var req = http.request(options, function(res){
		 	res.setEncoding('utf8');
			res.on('data', function (chunk) {
		    	res_data += chunk;
		 	});
		 	res.on('end', function(){
		 		cb(res, JSON.parse(res_data));
		 	});
		});
		req.on('error', err_cb||none);
		req.end();
	};
	
	// User to Node
	
	handle.chatter_connect = function(socket, data){
		var token = data.token;
		var chatter = dao.chatter(token);
		
		if(token === undefined){
			handle.reject_chatter_connect(socket,"missing token");
		}else{
			chatter.exists(function(exists){
				if(!exists){
					handle.call_received(chatter, 
						function(res, body){
					 		if(res.statusCode == 200){
								chatter.create(body.name, body.operators, body.conversation_token, function(){
									handle.accept_chatter_connect(socket, chatter);
									handle.call_operators(chatter);
								});
					 		}else{
					 			handle.reject_chatter_connect(socket,"bad token");
					 		}
					 	},
						function(e) {
							handle.reject_chatter_connect(socket,"auth request error");
						}
					);
				}else{
					handle.accept_chatter_connect(socket, chatter);
				}
			});
		}
	};
	
	handle.operator_connect = function(socket, data){
		var token = data.token,
			operator = dao.operator(token);
		
		if(token === undefined){
			handle.reject_operator_connect(socket, "missing token");
		}else{
			operator.exists(function(exists){
				if(!exists){
					handle.operator_status(operator, STATUS.ONLINE,
						function(res, body){
							if(res.statusCode == 200){
								operator.create(body.name, function(){
									handle.accept_operator_connect(socket, operator);
								});
					 		}else{
					 			handle.reject_operator_connect(socket,"bad token");
					 		}
						},
						function(e) {
							handle.reject_operator_connect(socket,"auth request error");
						}
					);
				}else{
					handle.accept_operator_connect(socket, operator);
				}
			});
		}
	};
	
	handle.operator_accepts_call = function(socket, token, operator){
		log("Operator accepts call:\n\t",operator.token,token);
		var chatter = dao.chatter(token);
		chatter.exists(function(exists){
			if(exists){
				chatter.get_call_accepted(function(call_accepted){
					if(call_accepted){
						handle.call_already_accepted(socket, chatter);
					}else{
						chatter.call_accepted = true;
						chatter.chatting_with = operator.token;
						
						log("Connecting chatter and operator", chatter.token, operator.token);
						
						handle.notify_chatter_of_operator(chatter, operator);
						handle.notify_operator_of_chatter(operator, chatter);

						handle.log_call_accepted(operator, chatter, 
							function(res, body){
								if(res.statusCode == 200){
						 			
						 		}else{

						 		}
							},
							function(e) {
								log('Error notifying rails of call accepted:',e);
							}
				);
					}
				});
			}
		});
	};
	
	handle.operator_declines_call = function(chatter, operator){
		log("Operator declines call:\n\t", operator.token, chatter.token);
		chatter.exists(function(exists){
			if(exists){
				chatter.remove_operator(operator.token, function(operators){
					if(operators.length == 0){
						chatter.get_call_accepted(function(call_accepted){
							if(!call_accepted){
								handle.call_declined(chatter);
							}
						});
					}
				});
			}
		});
	};
	
	handle.chatter_typing = function(socket, data, chatter){
		log("Chatter typing:\n\t", data.typing, chatter.token, socket.id);
		chatter.get_call_accepted(function(call_accepted){
			if(call_accepted){
				chatter.get_chatting_with(function(chatting_with){
					var operator = dao.operator(chatting_with);
					chatter.get_conversation_token(function(conversation_token){
						handle.notify_operator_of_typing(operator, conversation_token, chatter.token, data.typing);
					});
				});
			}
		});
	};
	
	handle.operator_typing = function(socket, data, operator){
		log("Operator typing:\n\t",data.typing, operator.token, socket.id);
		var chatter = dao.chatter(data.chatter_token);
		handle.notify_chatter_of_typing(chatter, data.typing);
	};
	
	handle.chatter_read_message = function(socket, data, chatter){
		log("Chatter reads messages:\n\t",chatter.token, socket.id);
		chatter.get_call_accepted(function(call_accepted){
			if(call_accepted){
				chatter.get_chatting_with(function(chatting_with){
					var operator = dao.operator(chatting_with);
					chatter.get_conversation_token(function(conversation_token){
						handle.notify_operator_of_read(operator, conversation_token, chatter.token, (new Date()).getTime());
						handle.log_read_message(chatter, data.message_id, none, none);
					});
				});
			}
		});
	};
	
	handle.operator_read_message = function(socket, data, operator){
		log("Operator reads message:\n\t",operator.token, socket.id);
		var chatter = dao.chatter(data.chatter_token);
		handle.notify_chatter_of_read(chatter, (new Date()).getTime());
		handle.log_read_message(operator, data.message_id, none, none);
	};
	
	handle.chatter_send_msg = function(socket, data, chatter){
		log("Chatter sends message:\n\t",chatter.token, socket.id);
		data.message = processMessage(data.message);
		chatter.get_call_accepted(function(call_accepted){
			if(call_accepted){
				chatter.get_chatting_with(function(chatting_with){
					var operator = dao.operator(chatting_with);
					chatter.get_conversation_token(function(conversation_token){
						handle.log_read_message(chatter, data.message_id, function(res, body){
							if(res.statusCode == 200){
								data.message_id = body.message_id;
								get_sockets("chatter", chatter, function(sockets){
									sockets.forEach(function(s){s.emit("self_message", data);});
								});
								handle.notify_operator_of_msg(operator, conversation_token, chatter.token, data.message, body.message_id);
							}
						}, none);
						
					});
				});
			}else{
			// TODO: Handle messages sent before call is accepted
			}
		});
	};
	
	handle.operator_send_msg = function(socket, data, operator){
		log("Operator sends message:\n\t",operator.token, socket.id);
		var chatter = dao.chatter(data.chatter_token);
		data.message = processMessage(data.message);
		handle.log_read_message(chatter, data.message_id, function(res, body){
			if(res.statusCode == 200){
				data.message_id = body.message_id;
				handle.notify_chatter_of_msg(chatter, data.message, data.message_id);
				get_sockets("operator", operator, function(sockets){
					sockets.forEach(function(s){
						log("Op self_message to socket:",s.id);
						s.emit("self_message:" + data.conversation_token, data);
					});
				});
			}
		}, none);
	};
	
	handle.chatter_disconnect = function(socket, data, chatter){
		log("Chatter Disconnects!!", chatter.token, socket.id);
		chatter.remove_socket(socket.id);
		chatter.get_call_accepted(function(call_accepted){
			if(call_accepted){
				chatter.get_chatting_with(function(chatting_with){
					var operator = dao.operator(chatting_with);
					handle.notify_operator_of_chatter_disconnect(operator, chatter);
				});
			}
		});
	};
	
	handle.operator_disconnect = function(socket, data, operator){
		log("Operator Disconnects!!",socket.id);
		operator.remove_socket(socket.id);
		operator.get_conversations(function(conversations){
			if(conversations.length){
				conversations.forEach(function(token){
					var chatter = dao.chatter(token);
					handle.notify_chatter_of_operator_disconnect(chatter, operator);
				});
			}
		});
		handle.operator_status(operator, STATUS.OFFLINE, none, none);
	};
	
	handle.operator_call_received = function(socket, chatter_token, operator){
		log("Operator has recieved call:\n\t", operator.token, chatter_token);
	};
	
	handle.operator_status = function(socket, data){
		
	};
	
	// Node to user
	
	handle.accept_chatter_connect = function(socket, chatter){
		chatter.get_sockets(function(sockets){
			console.log(sockets);
			if(sockets.indexOf(socket.id)>-1){
				log("Chatter sends auth again:\n\t",chatter.token, socket.id);
			}else{
				log("Chatter connected:\n\t",chatter.token, socket.id);

				get_sockets("chatter", chatter, function(sockets){
					if(sockets.length){
						log("*Reconnect*");
						sockets.forEach(function(s){
							s.emit("multiple_connections", {quantity: sockets.length+1});
						});
					}
				});

				chatter.connected = true;
				chatter.add_socket(socket.id);

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
				
				chatter.get_call_accepted(function(call_accepted){
					if(call_accepted){
						log("Call already accepted by operator");
						chatter.get_chatting_with(function(chatting_with){
							var operator = dao.operator(chatting_with);
							handle.notify_chatter_of_operator(chatter, operator, socket.id);
							handle.notify_operator_of_chatter_reconnect(operator, chatter);
						});
					}
				});
				chatter.get_call_declined(function(call_declined){
					if(call_declined){
						handle.call_declined(chatter);
					}
				});
			}
		});
	};
	
	handle.accept_operator_connect = function(socket, operator){
		console.log("Operator connects");
		operator.get_sockets(function(sockets){
			console.log(sockets);
			if(sockets.indexOf(socket.id) != -1){
				log("Operator sends auth again:\n\t",operator.token, socket.id);
			}else{
				log("Operator connected:\n\t", operator.token, socket.id);
				
				get_sockets("operator", operator, function(sockets){
					if(sockets.length){
						log("*Reconnect*");
						sockets.forEach(function(s){
							s.emit("multiple_connections", {quantity: sockets.length+1});
						});
					}
				});
				
				operator.connected = true;
				operator.add_socket(socket.id);
			
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
					handle.operator_call_received(socket, token, operator);
				});
				socket.on("accept_call", function(token){
					handle.operator_accepts_call(socket, token, operator);
				});
				socket.on("decline_call", function(token){
					handle.operator_declines_call(token, operator);
				});
				socket.emit("auth_success", {});
				
				operator.get_conversations(function(conversations){
					log('Operator '+operator.token+' is currently in '+conversations.length+' conversation'+(conversations.length==1?'':'s'));
					if(conversations.length){
						conversations.forEach(function(token){
							var chatter = dao.chatter(token);
							chatter.exists(function(exists){
								log('Chatter '+token+' does'+(exists?'':' not')+' exist');
								if(exists){
									handle.notify_operator_of_chatter(operator, chatter, socket.id);
									handle.notify_chatter_of_operator_reconnect(chatter, operator);
								}
							});
							
						});
					}
				});
				
				operator.get_call_requests(function(call_requests){
					if(call_requests.length){
						log("Operator has call requests waiting:\n\t", call_requests.join(", "));
						call_requests.forEach(function(token){
							var chatter = dao.chatter(token);
							chatter.exists(function(exists){
								if(exists){
									chatter.get_call_accepted(function(call_accepted){
										if(!call_accepted){
											log("Call has not yet been accepted:\n\t", token);
											handle.call_operator(operator, chatter);
										}
									});
								}
							});
						});
						operator.call_requests = [];
					}
				});				
			}
		});
	};
	
	handle.reject_chatter_connect = function(socket, error){
		log("Chatter has trouble with auth:\n\t",error);
		socket.emit("auth_error", error);
	};
	
	handle.reject_operator_connect = function(socket, error){
		log("Operator has trouble with auth:\n\t",error);
		socket.emit("auth_error", error);
	};
	
	handle.call_operators = function(chatter){
		log("Calling operators for chatter:\n\t",chatter.token);
		chatter.get_operators(function(operators){
			operators.forEach(function(token){
				handle.call_operator(dao.operator(token), chatter);
			});
			setTimeout(function(){ handle.stop_waiting_for_operators(chatter); }, WAITING_TIME);
		});		
	};
	
	handle.call_operator = function(operator, chatter){
		operator.exists(function(exists){
			if(!exists){
				log("Calling operator fails because operator not found:\n\t",operator_token);
				handle.operator_declines_call(chatter, operator_token);
			}else{
				operator.get_connected(function(connected){
					if(connected){
						log("Calling operator:\n\t", operator.token);
						get_sockets("operator",operator, function(sockets){
							log(sockets.length);
							if(sockets.length){
								chatter.get_name(function(name){
									chatter.get_conversation_token(function(conversation_token){
										sockets.forEach(function(s){
											log('Operator call_request on socket:\n\t', s.id);
											s.emit("call_request", {
												'name': name, 
												'conversation_token': conversation_token, 
												'chatter_token': chatter.token 
											});
										});
									});
								});
							}
						});
					}else{
						log("Operator not connected yet:\n\t"+operator.token);
						operator.add_call_request(chatter.token);
					}
				});
			}
		});
	};
	
	handle.call_declined = function(chatter){
		log("Notifying chatter that call was declined by all operators who were called:\n\t", chatter.token);
		chatter.call_declined = true;
		chatter.get_connected(function(connected){
			if(connected){
				get_sockets("chatter",chatter, function(sockets){
					sockets.forEach(function(s){s.emit("call_declined", {});});
				});
			}else{
				log("Chatter not connected so will notify of declined call when they connect");
			}
		});
	};
	
	handle.notify_chatter_of_operator = function(chatter, operator, socket_id){
		chatter.get_connected(function(connected){
			if(connected){
				log("Notifying chatter of operator:\n\t", chatter.token, operator.token);
				chatter.get_chatting_with(function(chatting_with){
					var operator = dao.operator(chatting_with);
					get_sockets("chatter",chatter,function(sockets){
						if(sockets.length){
							operator.get_name(function(name){
								sockets.forEach(function(s){
									if(!socket_id || s.id == socket_id)
										s.emit("call_connected", {'name': name});
								});
							});
						}
					});
				});
			}else{
				log("Would notify chatter of operator but chatter not connected yet.")
			}
		});		
	};
	
	handle.notify_operator_of_chatter = function(operator, chatter, socket_id){
		log("Notifying operator of chatter:\n\t", operator.token, chatter.token)
		operator.add_conversation(chatter.token, function(c){ log('Add conversation: ',c); });
		get_sockets("operator",operator, function(sockets){
			if(sockets.length){
				chatter.get_conversation_token(function(conversation_token){
					chatter.get_name(function(name){
						sockets.forEach(function(s){
							if(!socket_id || socket_id == s.id){
								s.emit("call_connected", {
									'conversation_token': conversation_token, 
									'name': name, 
									'chatter_token': chatter.token
								});
							}
						});
					});
				});
			}
			
		});	
	};
	
	handle.notify_chatter_of_typing = function(chatter, typing){
		get_sockets("chatter", chatter, function(sockets){
			sockets.forEach(function(s){s.emit("typing", {"typing": typing});});
		});
	};
	
	handle.notify_operator_of_typing = function(operator, conversation_token, chatter_token, typing){
		get_sockets("operator", operator, function(sockets){
			sockets.forEach(function(s){
				s.emit("typing:" + conversation_token, {
					"typing": typing, 
					"conversation_token": conversation_token, 
					"chatter_token": chatter_token
				});
			});
		});
	};
	
	handle.notify_chatter_of_read = function(chatter, timestamp){
		get_sockets("chatter",chatter, function(sockets){
			sockets.forEach(function(s){s.emit("message_seen", {"timestamp": timestamp});});
		});
	};
	
	handle.notify_operator_of_read = function(operator, conversation_token, chatter_token, timestamp){
		get_sockets("operator",operator, function(sockets){
			sockets.forEach(function(s){
				s.emit("message_seen:" + conversation_token, {
					"conversation_token": conversation_token, 
					"chatter_token": chatter_token, 
					"timestamp": timestamp
				});
			});
		});
	};
	
	handle.notify_chatter_of_msg = function(chatter, message){
		get_sockets("chatter",chatter, function(sockets){
			sockets.forEach(function(s){s.emit("operator_message", {"message": message});});
		});
	};
	
	handle.notify_operator_of_msg = function(operator, conversation_token, chatter_token, message){
		get_sockets("operator",operator, function(sockets){
			sockets.forEach(function(s){
				s.emit("chatter_message:" + conversation_token, {
					"message": message, 
					"chatter_token": chatter_token, 
					"conversation_token": conversation_token
				});
			});
		});
	};
	
	handle.notify_chatter_of_operator_disconnect = function(chatter, operator){
		get_sockets('chatter', chatter, function(sockets){
			if(sockets.length){
				operator.get_sockets(function(op_sockets){
					sockets.forEach(function(s){
						s.emit("operator_disconnect", {
							"timestamp": (new Date()).getTime(), 
							"connections": op_sockets.length 
						});
					});
				});
			}
		});
	};
	
	handle.notify_operator_of_chatter_disconnect = function(operator, chatter){
		get_sockets('operator', operator, function(sockets){
			if(sockets.length){
				chatter.get_sockets(function(ch_sockets){
					chatter.get_conversation_token(function(conversation_token){
						sockets.forEach(function(s){
							s.emit("chatter_disconnect", { 
								'conversation_token': conversation_token, 
								"chatter_token": chatter.token, 
								"timestamp": (new Date()).getTime(),
								"connections": ch_sockets.length
							});
						});
					});
				});
			}
		});
	};
	
	handle.notify_chatter_of_operator_reconnect = function(chatter, operator){
		get_sockets('chatter', chatter, function(sockets){
			if(sockets.length){
				operator.get_sockets(function(op_sockets){
					sockets.forEach(function(s){
						s.emit("operator_reconnect", { timestamp: (new Date()).getTime(), "connections": op_sockets.length });
					});
				});
			}
		});
	}
	
	handle.notify_operator_of_chatter_reconnect = function(operator, chatter){
		get_sockets('operator', operator, function(sockets){
			if(sockets.length){
				chatter.get_sockets(function(ch_sockets){
					chatter.get_conversation_token(function(conversation_token){
						sockets.forEach(function(s){
							s.emit("chatter_reconnect", { 
								'conversation_token': conversation_token, 
								chatter_token: chatter.token, 
								timestamp: (new Date()).getTime(),
								connections: ch_sockets.length
							});
						});
					});
				});
			}
		});
	};

	handle.server_close = funciton(){

		process.exit();
	};
	handle.server_error = funciton(err){
		console.error('An uncaught error occurred!');
   		console.error(err.stack);
	};
	
	return handle;
};