var express = require("express");
var http = require("http");
var config = require("./config/");
var SocketClient = require("socket.io-client");
var http = require('http');
var RestClient = require('node-rest-client').Client;
var rest = new RestClient();
var mysql = require("./lib/mysql.js");
var child_process = require('child_process');
var exec = require("exec");



// -------- Server Socket --------
var app = express({ strict: true });
var server = http.Server(app);
var io = require('socket.io')(server);
server.listen(config.network.port, config.network.address);
server.on('listening', function() {
	console.log('Express server started on at %s:%s', server.address().address, server.address().port);
});

io.on('connection', function(socket){
	// send online DSCs to new connected client
	sendOnlineLines(socket);

	socket.on("getLines", function(){
		sendOnlineLines(socket);
	});

	// triggers any given event on DSC
	socket.on("setLine", function(data){
		var line = config.lines[data.line];
		if (line !== undefined){
			var lineSocket = line.socket;
			if (lineSocket !== undefined){
				lineSocket.emit(data.method, data.data);
			}
		}
	});

	// set power performs wakeonlan or ssh shutdown on target machine
	socket.on('setPower', function(data){
		var line = config.lines[data.line];
		if (data.state === true){
			// Power On
			exec(["wakeonlan", line.mac], function(err, out, code) { });
		}
		else {
			// Power Off
			child_process.exec(["ssh -t "+line.user+"@"+line.ip+" 'sudo shutdown -h now'"], function(err, out, code) { });
		}
	});
});



// -------- Line Sockets --------

// store bool for each line id (true = online)
var linesOnline = {};

for (var id in config.lines){
	registerLine(id);
}

// Register line with id
function registerLine(id){
	var line = config.lines[id];

	linesOnline[id] = {};
	linesOnline[id].id = id;
	linesOnline[id].label = line.label;
	linesOnline[id].ip = line.ip;
	linesOnline[id].port = line.port;
	linesOnline[id].labelShort = line.labelShort;
	linesOnline[id].online = false;

	config.lines[id].socket = SocketClient("http://"+line.ip+":"+line.port);

	// redirect following methods
	var methods = ["setSession", "setConfig", "setData"];
	for (var i in methods){
		setUpEvent(config.lines[id].socket, methods[i]);
	}
	setUpConnection(config.lines[id].socket);

	// set up socket event method
	function setUpEvent(socket, method){
		socket.on(method, function(data){
			if (method == "setSession"){
				poolLine(line);
			}
			io.emit(method, {
				line: line._id,
				data: data,
			});
		});
	}

	// set up connection methods
	function setUpConnection(socket){
		socket.on("connect", function(){
			console.log(id+" connected");
			linesOnline[id].online = true;
			sendOnlineLines(io);
		});
		socket.on("disconnect", function(){
			console.log(id+" disconnected");
			linesOnline[id].online = false;
			sendOnlineLines(io);
		});
	}
}

// send online lines event to socket or broadcast to all clients
function sendOnlineLines(socket){
	socket.emit("onlineLines", {
		lines: linesOnline,
	});
}




function poolLine(line){
	if (config.dataPooling.enabled === false){
		return;
	}


	mysql.query(
		"SELECT MAX(unixtime) as 'unixtime' FROM shot WHERE shot.sessionID LIKE ? ;",
		[line._id+"_%"],
		function(err, rows) {
			var time = 0;
			if (rows !== undefined && rows.length > 0 && rows[0].unixtime !== undefined){
				time = rows[0].unixtime - config.dataPooling.poolingDelta;
			}
			rest.get("http://"+line.ip+":"+line.port+"/api/shot?after="+time, function(data, response){
				for (var i in data){
					var single = data[i];
					if (single !== undefined && single.id !== undefined){
						mysql.query(
							"INSERT INTO shot (id, number, sessionID, ring, ringValue, teiler, winkel, x, y, unixtime, serie) " +
							"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);",
							[single.id, single.number, line._id + "_" + single.sessionID, single.ring, single.ringValue, single.teiler, single.winkel, single.x, single.y, single.unixtime, single.serie],
							function(err, rows) {}
						);
					}
				}
			});
		}
	);



	mysql.query(
		"SELECT MAX(unixtime) as 'unixtime' FROM session WHERE session.id LIKE ? ;",
		[line._id+"_"],
		function(err, rows) {
			var time = 0;
			if (rows !== undefined && rows.length > 0 && rows[0].unixtime !== undefined){
				time = rows[0].unixtime - config.dataPooling.poolingDelta;
			}
			rest.get("http://"+line.ip+":"+line.port+"/api/session?after="+time, function(data, response){
				for (var i in data){
					var single = data[i];
					if (single !== undefined && single.id !== undefined){
						mysql.query(
							"INSERT INTO session (id, sessionGroupID, part, unixtime) " +
							"VALUES (?, ?, ?, ?);",
							[line._id + "_" + single.id, line._id + "_" + single.sessionGroupID, single.part, single.unixtime],
							function(err, rows) {}
						);
					}
				}
			});
		}
	);



	mysql.query(
		"SELECT MAX(unixtime) as 'unixtime' FROM sessionGroup WHERE line = ?;",
		[line._id],
		function(err, rows) {
			var time = 0;
			if (rows !== undefined && rows.length > 0 && rows[0].unixtime !== undefined){
				time = rows[0].unixtime - config.dataPooling.poolingDelta;
			}

			rest.get("http://"+line.ip+":"+line.port+"/api/sessionGroup?after="+time, function(data, response){
				for (var i in data){
					var single = data[i];
					if (single !== undefined && single.id !== undefined){
						mysql.query(
							"INSERT INTO sessionGroup (id, disziplin, unixtime, userID, line) " +
							"VALUES (?, ?, ?, ?, ?) " +
							"ON DUPLICATE KEY UPDATE userID = ?;",
							[line._id + "_" + single.id, single.disziplin, single.unixtime, single.userID, line._id, single.userID],
							function(err, rows) {}
						);
					}
				}
			});
		}
	);

}
