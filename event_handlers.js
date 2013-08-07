module.exports = function(env){
	var io = env.io,
		express = env.express,
		app = env.app,
		handle = {};
	
	// Rails to Node
	
	handle.call_received = function(req, res){
		
	};
	
	handle.insider_logs_in = function(req, res){
		
	};
	
	handle.insider_logs_out = function(req, res){
		
	};
	
	handle.msg_by_out_logged = function(){};
	
	handle.msg_by_in_logged = function(){};
	
	handle.read_by_out_logged = function(){};
		
	handle.read_by_in_logged = function(){};
	
	handle.insider_status_cb = function(){};
	
	// Node to Rails
	
	handle.log_msg_by_in = function(){};
	
	handle.log_msg_by_out = function(){};
	
	handle.log_read_by_in = function(){};
	
	handle.log_read_by_out = function(){};
	
	handle.insider_status = function(){};
	
	// Outsider to Node
	
	handle.outsider_connect = function(socket, data){
		
	};
	
	handle.outsider_typing = function(){};
	
	handle.outsider_read = function(){};
	
	handle.outsider_send_msg = function(){};
	
	handle.outsider_disconnect = function(){};
	
	// Insider to Node
	
	handle.insider_connect = function(socket, data){
		
	};
	
	handle.insider_typing = function(){};
	
	handle.insider_read = function(){};
	
	handle.insider_send_msg = function(){};
	
	handle.insider_disconnect = function(){};
	
	handle.insider_status = function(){};
	
	// Node to Outsider
	
	handle.accept_out_connect = function(){};
	
	handle.reject_out_connect = function(){};
	
	handle.notify_out_of_in = function(){};
	
	handle.notify_out_of_typing = function(){};
	
	handle.notify_out_of_read = function(){};
	
	handle.notify_out_of_msg = function(){};
	
	// Node to Insider
	
	handle.accept_in_connect = function(){};
	
	handle.reject_in_connect = function(){};
	
	handle.call_insider = function(){};
	
	handle.notify_in_of_out = function(){};
	
	handle.notify_in_of_typing = function(){};
	
	handle.notify_in_of_read = function(){};
	
	handle.notify_in_of_msg = function(){};
	
	return handle;
};