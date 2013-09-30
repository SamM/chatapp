// redis://nodejitsu:nodejitsudb2837567110.redis.irstack.com:f327cfe980c971946e80b8e975fbebb4@nodejitsudb2837567110.redis.irstack.com:6379
var redis = require('redis'), 
	db = redis.createClient(6379,"nodejitsudb2837567110.redis.irstack.com"),
	uniq = Math.round(Math.random()*1000000);
	dao = {},
	j = "|";
	function none(){};
	function join(arr){
		return "["+arr.join(j)+"]";
	}
	function split(cb){
		return function(v,k){ (cb||none)(v==""?[]:(v=="[]"?[]:v.slice(1,-1).split(j))); };
	}
	db.auth("nodejitsudb2837567110.redis.irstack.com:f327cfe980c971946e80b8e975fbebb4", function(err,val){ if(err) console.log("Redis auth error:",err, val) });
	db.on("error", function (err) { console.log("Redis error: " + err); });

dao.operator = function(token){
	if(!token) return null;
	if(token.token){
		token = token.token;
	}
	if(typeof token != "string"){
		return null;
	}
	var pre = uniq+":operator:"+token+":";
	function g(key, cb){
		cb = cb || none;
		db.get(pre+key, function(err, v){
			if(err) console.log('Get error:',pre+key,"-",err);
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
			try{
				cb(v, key);
			}catch(e){
				console.log('Get',pre+key,'- Callback ERROR:',e);
			}
		});
	}
	function s(key, value, cb){
		db.set(pre+key, value, cb||none);
	}
	var self = {
		create: function(name, cb){
			var operator = {};
			operator[pre] = token;
			operator[pre+'name'] = name||null;
			operator[pre+'connected'] = false;
			operator[pre+'sockets'] = "[]";
			operator[pre+'call_requests'] = "[]";
			operator[pre+'conversations'] = "[]";
			var arr = [];
			for(var i in operator){
				arr.push(i);
				arr.push(operator[i]);
			}
			db.mset(arr, cb||none);
			return self;
		},
		remove: function(cb){
			var keys = [
				pre, 
				pre+'name',
				pre+'connected',
				pre+'sockets',
				pre+'call_requests',
				pre+'conversations'];
			db.del(keys,cb||none);
			return self;
		},
		exists: function(cb){ db.exists(pre,function(err, v){(cb||none)(v)}); return self; },
				
		get token(){ return token; },
		
		get_name: function(cb){ g('name',cb); return self; },
		set name(v){ s('name',v); },
		
		get_connected: function(cb){ g('connected',cb); return self; },
		set connected(v){ s('connected',v); },
		
		get_sockets: function(cb){ g('sockets',split(cb)); return self; },
		set sockets(v){ s('sockets',join(v)); },
		add_socket: function(id,cb){
			this.get_sockets(function(sockets){
				if(sockets.indexOf(id)==-1){
					sockets.push(id);
					s('sockets', join(sockets));
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
				s('sockets', join(kept));
				(cb||none)(kept);
			});
			return self;
		},
		
		get_call_requests: function(cb){ g("call_requests", split(cb)); return self; },
		set call_requests(v){ s('call_requests',join(v)); },
		add_call_request: function(id,cb){
			this.get_call_requests(function(call_requests){
				if(call_requests.indexOf(id)==-1){
					call_requests.push(id);
					s('call_requests', join(call_requests));
				}
				(cb||none)(call_requests);
			});
			return self;
		},
		
		get_conversations: function(cb){ g('conversations',split(cb)); return self; },
		set conversations(v){ s('conversations', join(v)); },
		add_conversation: function(id,cb){
			this.get_conversations(function(conversations){
				if(conversations.indexOf(id)==-1){
					conversations.push(id);
					s('conversations', join(conversations));
				}
				(cb||none)(conversations);
			});
			return self;
		}
	};
	return self;
};
dao.chatter = function(token){
	if(!token) return null;
	if(token.token){
		token = token.token;
	}
	if(typeof token != "string"){
		return null;
	}
	var pre = uniq+"chatter:"+token+":";

	function g(key, cb){
		cb = cb || none;
		db.get(pre+key, function(err, v){
			if(err) console.log('Get error:',pre+key,"-",err);
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
	function s(key, value, cb){
		db.set(pre+key, value, cb||none);
	}
	var self = {
		create: function(name, ops, convo_token, cb){
			var c = {};
			c[pre] = token;
			c[pre+'name'] = name||"";
			c[pre+'connected'] = false;
			c[pre+'sockets'] = "[]";
			c[pre+'operators'] = join(ops||[]);
			c[pre+'call_accepted'] = false;
			c[pre+'call_declined'] = false;
			c[pre+'conversation_token'] = convo_token||null;
			c[pre+'chatting_with'] = null;
			var arr = [];
			for(var i in c){
				arr.push(i);
				arr.push(c[i]);
			}
			db.mset(arr,cb||none);
			return self;
		},
		remove: function(cb){
			var keys = [
				pre, 
				pre+'name',
				pre+'connected',
				pre+'sockets',
				pre+'operators',
				pre+'call_accepted',
				pre+'call_declined',
				pre+'conversation_token',
				pre+'chatting_with'];
			db.del.apply(db,keys,cb||none);
			return self;
		},
		exists: function(cb){ db.exists(pre,function(err, v){(cb||none)(v)}); return self; },
				
		get token(){ return token; },
		
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
		set sockets(v){ s('sockets',join(v)); },
		add_socket: function(id,cb){
			this.get_sockets(function(sockets){
				if(sockets.indexOf(id)==-1){
					sockets.push(id);
					s('sockets', join(sockets));
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
				s('sockets', join(kept));
				(cb||none)(kept);
			});
			return self;
		},
		
		get_operators: function(cb){ g("operators",split(cb)); return self; },
		set operators(v){ s('operators', join(v)); },
		add_operator: function(id,cb){
			this.get_operators(function(operators){
				if(operators.indexOf(id)==-1){
					operators.push(id);
					s('operators', join(operators));
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
				s('operators', join(operators));
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