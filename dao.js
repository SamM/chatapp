var redis = require('then-redis'),
	db = redis.createClient("redis://redistogo:d7527215d8bd631e7fbe6a8110a7a068@koi.redistogo.com:9715/"),
	dao = {};

dao.operator = function(token){
	if(token.token){
		token = token.token;
	}
	if(typeof token != "string"){
		return null;
	}
	var pre = "operator:"+token+":",
		j = "|";
	function none(){};
	function split(cb){
		return function(v){ v = v==""?[]:v.split(j); (cb||none)(v); };
	}
	function g(key, cb){
		cb = cb || none;
		db.get(pre+key).then(function(v){
			if(v=="null")
				v = null;
			if(v=="undefined")
				v = undefined;
			if(v=="true")
				v = true;
			if(v=="false")
				v = false;
			if(typeof v == "string" && v!="" && parseInt(v)!=NaN && !/[^0-9]+/.test(v))
				v = parseInt(v);
			if(typeof v == "string" && v!="" && parseFloat(v)!=NaN && !/[^0-9|.]+/.test(v))
				v = parseFloat(v);
			cb(v);
		});
	}
	function s(key, value){
		db.set(pre+key, value);
	}
	var self = {
		create: function(secret, name){
			var operator = {};
			operator[pre] = token;
			operator[pre+'secret'] = secret;
			operator[pre+'name'] = name||null;
			operator[pre+'connected'] = false;
			operator[pre+'sockets'] = "";
			operator[pre+'call_requests'] = "";
			operator[pre+'conversations'] = "";
			db.mset(operator);
			return self;
		},
		remove: function(cb){
			var keys = [
				pre, 
				pre+'secret',
				pre+'name',
				pre+'connected',
				pre+'sockets',
				pre+'call_requests',
				pre+'conversations'];
			db.del.apply(db,keys).then(cb||none);
			return self;
		},
		exists: function(cb){ db.exists(pre).then(cb); return self; },
				
		get token(){ return token; },
		
		get_secret: function(cb){ g('secret',cb); return self; },
		set secret(v){ s('secret',v); },
		
		get_name: function(cb){ g('name',cb); return self; },
		set name(v){ s('name',v); },
		
		get_connected: function(cb){ g('connected',cb); return self; },
		set connected(v){ s('connected',v); },
		
		get_sockets: function(cb){ g('sockets',split(cb)); return self; },
		set sockets(v){ s('sockets',v.join(j)); },
		add_socket: function(id,cb){
			this.get_sockets(function(sockets){
				if(sockets.indexOf(id)==-1){
					sockets.push(id);
					s('sockets', sockets.join(j));
				}
				(cb||none)(sockets);
			});
			return self;
		},
		remove_socket: function(id, cb){
			this.get_sockets(function(sockets){
				var kept = [];
				for(var i=0;i<sockets.length;i++){
					if(sockets[i]!=id){
						kept.push(sockets[i]);
					}
				}
				s('sockets', kept.join(j));
				(cb||none)(kept);
			});
			return self;
		},
		
		get_call_requests: function(cb){ g("call_requests", split(cb)); return self; },
		set call_requests(v){ s('call_requests',v.join(j)); },
		add_call_request: function(id,cb){
			this.get_call_requests(function(call_requests){
				if(call_requests.indexOf(id)==-1){
					call_requests.push(id);
					s('call_requests', call_requests.join(j));
				}
				(cb||none)(call_requests);
			});
			return self;
		},
		
		get_conversations: function(cb){ g('conversations', split(cb)); return self; },
		set conversations(v){ s('conversations',v.join(k)); },
		add_conversation: function(id,cb){
			this.get_conversations(function(conversations){
				if(conversations.indexOf(id)==-1){
					conversations.push(id);
					s('conversations', conversations.join(j));
				}
				(cb||none)(conversations);
			});
			return self;
		}
	};
	return self;
};
dao.chatter = function(token){
	if(token.token){
		token = token.token;
	}
	if(typeof token != "string"){
		return null;
	}
	var pre = "chatter:"+token+":",
		j = "|";
	function none(){};
	function split(cb){
		return function(v){ v = v==""?[]:v.split(j); (cb||none)(v); };
	}
	function g(key, cb){
		cb = cb || none;
		db.get(pre+key).then(function(v){
			if(v=="null")
				v = null;
			if(v=="undefined")
				v = undefined;
			if(v=="true")
				v = true;
			if(v=="false")
				v = false;
			if(typeof v == "string" && v!="" && parseInt(v)!=NaN && !/[^0-9]+/.test(v))
				v = parseInt(v);
			if(typeof v == "string" && v!="" && parseFloat(v)!=NaN && !/[^0-9|.]+/.test(v))
				v = parseFloat(v);
			cb(v);
		});
	}
	function s(key, value){
		db.set(pre+key, value);
	}
	var self = {
		create: function(secret, name, ops, convo_token){
			var c = {};
			c[pre] = token;
			c[pre+'secret'] = secret;
			c[pre+'name'] = name||"";
			c[pre+'connected'] = false;
			c[pre+'sockets'] = "";
			c[pre+'operators'] = (ops||[]).join(j);
			c[pre+'call_accepted'] = false;
			c[pre+'call_declined'] = false;
			c[pre+'conversation_token'] = convo_token||null;
			c[pre+'chatting_with'] = null;
			db.mset(c);
			return self;
		},
		remove: function(cb){
			var keys = [
				pre, 
				pre+'secret',
				pre+'name',
				pre+'connected',
				pre+'sockets',
				pre+'operators',
				pre+'call_accepted',
				pre+'call_declined',
				pre+'conversation_token',
				pre+'chatting_with'];
			db.del.apply(db,keys).then(cb||none);
			return self;
		},
		exists: function(cb){ db.exists(pre).then(cb); return self; },
				
		get token(){ return token; },
		
		get_secret: function(cb){ g('secret',cb); return self; },
		set secret(v){ s('secret',v); },
		
		get_name: function(cb){ g('name',cb); return self; },
		set name(v){ s('name',v); },
		
		get_connected: function(cb){ g('connected',cb); return self; },
		set connected(v){ s('connected',v); },
		
		get_call_accepted: function(cb){ g('call_accepted',cb); return self; },
		set call_accepted(v){ s('call_accepted',v); },
		
		get_call_declined: function(cb){ g('call_declined',cb); return self; },
		set call_declined(v){ s('call_declined',v); },
		
		get_conversation_token: function(cb){ g('conversation_token',cb); return self; },
		set conversation_token(v){ s('conversation_token',v); },
		
		get_chatting_with: function(cb){ g('chatting_with',cb); return self; },
		set chatting_with(v){ s('chatting_with',v); },
		
		get_sockets: function(cb){ g('sockets',split(cb)); return self; },
		set sockets(v){ s('sockets',v.join(j)); },
		add_socket: function(id,cb){
			this.get_sockets(function(sockets){
				if(sockets.indexOf(id)==-1){
					sockets.push(id);
					s('sockets', sockets.join(j));
				}
				(cb||none)(sockets);
			});
			return self;
		},
		remove_socket: function(id, cb){
			this.get_sockets(function(sockets){
				var kept = [];
				for(var i=0;i<sockets.length;i++){
					if(sockets[i]!=id){
						kept.push(sockets[i]);
					}
				}
				s('sockets', kept.join(j));
				(cb||none)(kept);
			});
			return self;
		},
		
		get_operators: function(cb){ g("operators",split(cb)); return self; },
		set operators(v){ s('operators',v.join(j)); },
		add_operator: function(id,cb){
			this.get_operators(function(operators){
				if(operators.indexOf(id)==-1){
					operators.push(id);
					s('operators', operators.join(j));
				}
				(cb||none)(operators);
			});
			return self;
		},
		remove_operator: function(id, cb){
			this.get_operators(function(operators){
				var kept = [];
				for(var i=0;i<operators.length;i++){
					if(operators[i]!=id){
						kept.push(operators[i]);
					}
				}
				s('operators', operators.join(j));
				(cb||none)(operators);
			});
			return self;
		}
	};
	return self;
};
dao.chatter.getByConversationToken = function(token){
	return dao.chatter.search(function(chatter){
		return chatter.conversation_token == token;
	});
};
dao.chatter.search = function(query){
	for(var i in chatters){
		if(query(chatters[i])){
			return dao.chatter.use(i);
		}
	}
	return null;
};
dao.db = db;
module.exports = dao;