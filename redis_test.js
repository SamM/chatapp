var redis = require('redis'), 
	db = redis.createClient(6379,"nodejitsudb2837567110.redis.irstack.com"),
	db.auth("nodejitsudb2837567110.redis.irstack.com:f327cfe980c971946e80b8e975fbebb4", function(err,val){ if(err) console.log("Redis auth error:",err, val) });
	db.on("error", function (err) { console.log("Redis error: " + err); });

	db.keys("*", function(err, v){
		console.log(v);
	});