var express = require("express");
var http = require("http");
var config = require("./config/");
var SocketClient = require("socket.io-client");
var http = require("http");
var child_process = require("child_process");
var exec = require("exec");
var mongodb = require("./lib/mongodb.js");
var request = require('request');



// -------- Server Socket --------
var app = express({ strict: true });
var server = http.Server(app);
var io = require("socket.io")(server);
server.listen(config.network.port, config.network.address);
server.on("listening", function() {
	console.log("[INFO] DSC-Gateway started (%s:%s)", server.address().address, server.address().port);
});



// --------- relay connection handling -------
io.on("connection", function(socket){
	// send online DSCs to new connected client
	sendOnlineLines(socket);

	// send the online lines to the line
	socket.on("getLines", function(){
		sendOnlineLines(socket);
	});

	if (config.permissions.setLine) {
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
	}

	if (config.permissions.setPower) {
		// set power performs wakeonlan or ssh shutdown on target machine
		socket.on("setPower", function(data){
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
	}
});








// -------- Line Sockets --------

// store bool for each line id (true = online)
var linesOnline = {};

function registerAllLines(){
	for (var id in config.lines){
		registerLine(id);
	}
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
	linesOnline[id].cache = {};

	config.lines[id].socket = SocketClient("http://"+line.ip+":"+line.port);

	// redirect following methods
	var methods = ["setConfig", "setData"];
	for (var i in methods){
		setUpEvent(config.lines[id].socket, methods[i]);
	}
	setUpConnection(config.lines[id].socket);

	// set up socket event method
	function setUpEvent(socket, method){
		socket.on(method, function(data){
			linesOnline[id].cache[method] = data;

			if (method == "setData" && config.database.enabled){
				if (data !== undefined && collection !== undefined){
					collection.update(
						{"_id" : data._id},
						data,
						{upsert: true, unique: true},
						function() {}
					);
				}
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
			console.log("[INFO] "+id+" connected");
			linesOnline[id].online = true;
			sendOnlineLines(io);
			updateDB(id);
			socket.emit("getData", {});
			socket.emit("getConfig", {});
		});
		socket.on("disconnect", function(){
			console.log("[INFO] "+id+" disconnected");
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


// fetch all new session from line, while server was offline
function updateDB(id){
	collection.find({"$or": [{"line": id}]}).sort({date:-1}).limit(1).skip(1).toArray(function (err, data) {
		if (err){
			console.log(err);
		}
		if (data.length >= 1) {
			loadFromLineSince(id, data[0].date);
		}
		else {
			loadFromLineSince(id, 0);
		}
	});
}
function loadFromLineSince(id, date){
	var line = linesOnline[id];

	request.get("http://" + line.ip + ":" + line.port + "/api/data?limit=1000&sinceDate=" + date, function (error, response) {
		var data = JSON.parse(response.body);
		for (var i in data){
			collection.update(
				{"_id" : data[i]._id},
				data[i],
				{upsert: true, unique: true},
				function() {}
			);
		}
	});
}



// ------ Main init ------
var collection;
if (config.database.enabled) {
	mongodb(function(dbCollection){
		collection = dbCollection;
		registerAllLines();
	});
}
else {
	registerAllLines();
}
