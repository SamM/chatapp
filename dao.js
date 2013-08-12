var dao = {};

dao.insider = {};
dao.outsider = {};

var insiders = {},
	outsiders = {};
	
function Session(id, token){
	this.id = id;
	this.token = token;
}
	
dao.insider.create = function(token, id){
	insiders[token] = new Session(id, token);
};
dao.insider.save = function(token, session){
	insiders[token] = session;
};
dao.insider.getByToken = function(token){
	if(token === undefined){
		return null;
	}
	var found = insiders[token];
	return found === undefined ? null : found;
};
dao.insider.getById = function(id){
	var found = [];
	
	for(var i in insiders){
		if(insiders[i].id === id){
			found.push(insiders[i]);
		}
	}
	
	return found.length === 0 ? null : found;
};
dao.insider.remove = function(token, id){
	if(id !== undefined){
		var remainder = {};
		for(var i in insiders){
			if(insiders[i].id !== id){
				remainder[i] = insiders[i];
			}
		}
		insiders = remainder;
	}else{
		delete insiders[token];
	}
};

dao.outsider.create = function(token, id){
	outsiders[token] = new Session(id, token);
};
dao.outsider.save = function(token, session){
	outsider[token] = session;
};
dao.outsider.getByToken = function(token){
	if(token === undefined){
		return null;
	}
	var found = outsiders[token];
	return found === undefined ? null : fou
};
dao.outsider.getById = function(id){
	var found = [];
	
	for(var i in outsiders){
		if(outsiders[i].id === id){
			found.push(outsiders[i]);
		}
	}
	
	return found.length === 0 ? null : found;
};
dao.outsider.remove = function(token, id){
	if(id !== undefined){
		var remainder = {};
		for(var i in outsiders){
			if(outsiders[i].id !== id){
				remainder[i] = outsiders[i];
			}
		}
		outsiders = remainder;
	}else{
		delete outsiders[token];
	}
};

module.exports = dao;