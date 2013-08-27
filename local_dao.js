var dao = {};

dao.operator = {};
dao.chatter = {};

var operators = {},
	chatters = {};

dao.operator.use = function(token){
	if(token.token){
		token = token.token;
	}
	if(typeof token != "string" || !dao.operator.exists(token)){
		return null;
	}
	function g(){
		return operators[token];
	}
	function s(i, v){
		operators[token][i] = v;
	}
	return {
		get operator(){ return g(); },
		set operator(v){ operators[token] = v; },
		
		get token(){ return token; },
		
		get secret(){ return g().secret; },
		set secret(v){ s('secret',v); },
		
		get name(){ return g().name; },
		set name(v){ s('name',v); },
		
		get connected(){ return g().connected; },
		set connected(v){ s('connected',v); },
		
		get sockets(){ return g().sockets; },
		set sockets(v){ s('sockets',v); },
		add_socket: function(id){
			var sockets = g().sockets;
			if(sockets.indexOf(id)==-1){
				sockets.push(id);
				s('sockets', sockets);
			}
		},
		remove_socket: function(id){
			var sockets = g().sockets,
				kept = [];
			for(var i=0;i<sockets.length;i++){
				if(sockets[i]!=id){
					kept.push(sockets[i]);
				}
			}
			s('sockets', kept);
		},
		
		get call_requests(){ return g().call_requests; },
		set call_requests(v){ s('call_requests',v); },
		add_call_request: function(id){
			var call_requests = g().call_requests;
			if(call_requests.indexOf(id)==-1){
				call_requests.push(id);
				s('call_requests', call_requests);
			}
		},
		
		get conversations(){ return g().conversations; },
		set conversations(v){ s('conversations',v); },
		add_conversation: function(id){
			var conversations = g().conversations;
			if(conversations.indexOf(id)==-1){
				conversations.push(id);
				s('conversations', conversations);
			}
		}
	};
};
dao.operator.create = function(token, secret, name){
	var operator = {
		'token': token,
		'secret': secret,
		'name': name||null,
		connected: false,
		sockets: [],
		call_requests: [],
		conversations: []
	};
	delete operators[token];
	return operators[token] = operator;
};
dao.operator.save = function(token, operator){
	if(!operator && token.token){
		operator = token;
		token = operator.token;
	}
	delete operators[token];
	return operators[token] = operator;
};
dao.operator.get = function(operator){
	if(!operator) return null;
	var token = (typeof operator == "string")?operator:operator.token;
	if(token){
		return dao.operator.getByToken(token);
	}
	return null;
}
dao.operator.getByToken = function(token){
	if(token === undefined){
		return null;
	}
	if(token.token){
		token = token.token;
	}
	var found = operators[token];
	return found === undefined ? null : found;
};
dao.operator.getById = function(secret){
	var found = [];
	
	for(var i in operators){
		if(operators[i].secret === secret){
			found.push(operators[i]);
		}
	}
	
	return found.length === 0 ? null : found;
};
dao.operator.remove = function(token, secret){
	if(secret !== undefined){
		var remainder = {};
		for(var i in operators){
			if(operators[i].secret !== secret){
				remainder[i] = operators[i];
			}
		}
		operators = remainder;
	}else{
		delete operators[token];
	}
};
dao.operator.exists = function(token){
	return !!operators[token];
};
dao.operator.search = function(query){
	for(var i in operators){
		if(query(operators[i])){
			return dao.operator.use(i);
		}
	}
	return null;
};


dao.chatter.use = function(token){
	if(token.token){
		token = token.token;
	}
	if(typeof token != "string" || !dao.chatter.exists(token)){
		return null;
	}
	function g(){
		return chatters[token];
	}
	function s(i, v){
		chatters[token][i] = v;
	}
	return {
		get chatter(){ return g(); },
		set chatter(v){ chatter[token] = v; },
		
		get token(){ return token; },
		
		get secret(){ return g().secret; },
		set secret(v){ s('secret',v); },
		
		get name(){ return g().name; },
		set name(v){ s('name',v); },
		
		get connected(){ return g().connected; },
		set connected(v){ s('connected',v); },
		
		get conversation_token(){ return g().conversation_token; },
		set conversation_token(v){ s('conversation_token',v); },
		
		get call_accepted(){ return g().call_accepted; },
		set call_accepted(v){ s('call_accepted',v); },
		
		get call_declined(){ return g().call_declined; },
		set call_declined(v){ s('call_declined',v); },
		
		get chatting_with(){ return g().chatting_with; },
		set chatting_with(v){ s('chatting_with',v); },
		
		get sockets(){ return g().sockets; },
		set sockets(v){ s('sockets',v); },
		add_socket: function(id){
			var sockets = g().sockets;
			if(sockets.indexOf(id)==-1){
				sockets.push(id);
				s('sockets', sockets);
			}
		},
		remove_socket: function(id){
			var sockets = g().sockets,
				kept = [];
			for(var i=0;i<sockets.length;i++){
				if(sockets[i]!=id){
					kept.push(sockets[i]);
				}
			}
			s('sockets', kept);
		},
		
		get operators(){ return g().operators; },
		set operators(v){ s('operators',v); },
		add_operator: function(id){
			var operators = g().operators;
			if(operators.indexOf(id)==-1){
				operators.push(id);
				s('operators', operators);
			}
		}
	};
};
dao.chatter.create = function(token, secret, name, ops, convo_token){
	var chatter = {
		'token': token,
		'secret': secret,
		'name': name||null,
		operators: ops||[],
		conversation_token: convo_token||null,
		call_accepted: false,
		call_declined: false,
		chatting_with: null,
		connected: false,
		sockets: []
	};
	delete chatters[token];
	return chatters[token] = chatter;
};
dao.chatter.exists = function(token){
	return !!chatters[token];
};
dao.chatter.save = function(token, chatter){
	if(!chatter && token.token){
		chatter = token;
		token = chatter.token;
	}
	delete chatters[token];
	return chatters[token] = chatter;
};
dao.chatter.get = function(chatter){
	if(!chatter) return null;
	var token = (typeof chatter == "string")?chatter:chatter.token;
	if(token){
		return dao.chatter.getByToken(token);
	}
	return null;
}
dao.chatter.getByToken = function(token){
	if(token === undefined){
		return null;
	}
	if(token.token){
		token = token.token;
	}
	var found = chatters[token];
	return found === undefined ? null : found;
};
dao.chatter.getById = function(secret){
	var found = [];
	
	for(var i in chatters){
		if(chatters[i].secret === secret){
			found.push(chatters[i]);
		}
	}
	
	return found.length === 0 ? null : found;
};
dao.chatter.getByConversationToken = function(token){
	return dao.chatter.search(function(chatter){
		return chatter.conversation_token == token;
	});
};
dao.chatter.remove = function(token, secret){
	if(secret !== undefined){
		var remainder = {};
		for(var i in chatters){
			if(chatters[i].secret !== secret){
				remainder[i] = chatters[i];
			}
		}
		chatters = remainder;
	}else{
		delete chatters[token];
	}
};
dao.chatter.search = function(query){
	for(var i in chatters){
		if(query(chatters[i])){
			return dao.chatter.use(i);
		}
	}
	return null;
};

dao.use = {
	operator: dao.operator.use,
	chatter: dao.chatter.use
}
module.exports = dao;