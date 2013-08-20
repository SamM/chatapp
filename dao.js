var dao = {};

dao.operator = {};
dao.chatter = {};

var operators = {},
	chatters = {};
	
function Session(secret, token){
	this.secret = secret;
	this.token = token;
}

function searcher(data){
	return function(query){
		var result = null;
		for(var i in data){
			if(query(data[i])){
				return data[i];
			}
		}
		return null;
	};
}
	
dao.operator.create = function(token, secret, name){
	var session = new Session(secret, token);
	if(name) session.name = name;
	return operators[token] = session;
};
dao.operator.save = function(token, session){
	if(!session && token.token){
		session = token;
		token = session.token;
	}
	return operators[token] = session;
};
dao.operator.get = function(operator){
	if(operator.token){
		return dao.operator.getByToken(operator.token);
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
dao.operator.search = searcher(operators);

dao.chatter.create = function(token, secret, name){
	var session = new Session(secret, token);
	if(name) session.name = name;
	return chatters[token] = session;
};
dao.chatter.save = function(token, session){
	if(!session && token.token){
		session = token;
		token = session.token;
	}
	return chatters[token] = session;
};
dao.chatter.get = function(chatter){
	if(chatter.token){
		return dao.chatter.getByToken(chatter.token);
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
	return dao.chatter.search(function(session){
		return session.conversation_token == token;
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
			return chatters[i];
		}
	}
	return null;
};

module.exports = dao;