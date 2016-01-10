var express = require("express")
var http = require("http")
var config = require("./config/")
var SocketClient = require("socket.io-client")
var http = require('http');
var RestClient = require('node-rest-client').Client;
var rest = new RestClient();
var mysql = require("./lib/mysql.js")



// -------- Server Socket --------
var app = express({ strict: true })
var server = http.Server(app)
var io = require('socket.io')(server)
server.listen(config.network.port, config.network.address)
server.on('listening', function() {
	console.log('Express server started on at %s:%s', server.address().address, server.address().port)
})

io.on('connection', function(socket){
	// send online DSCs to new connected client
	sendOnlineLines(socket)

	// triggers any given event on DSC
	socket.on("setLine", function(data){
		var lineSocket = config.lines[data.line].socket
		if (lineSocket != undefined){
			lineSocket.emit(data.method, data.data)
		}
	})
})



// -------- Line Sockets --------

// store bool for each line id (true = online)
var linesOnline = {};

for (id in config.lines){
	registerLine(id)
}

// Register line with id
function registerLine(id){
	var line = config.lines[id]

	linesOnline[id] = {};
	linesOnline[id].id = id;
	linesOnline[id].label = line.label;
	linesOnline[id].labelShort = line.labelShort;
	linesOnline[id].online = false

	config.lines[id].socket = SocketClient("http://"+line.ip+":"+line.port)

	// redirect following methods
	var methods = ["setSession", "setConfig", "setData"]
	for (i in methods){
		setUpEvent(config.lines[id].socket, methods[i])
	}
	setUpConnection(config.lines[id].socket)

	// set up socket event method
	function setUpEvent(socket, method){
		socket.on(method, function(data){
			if (method == "setSession"){
				poolLine(line)
			}
			io.emit(method, {
				line: line._id,
				data: data,
			})
		})
	}

	// set up connection methods
	function setUpConnection(socket){
		socket.on("connect", function(){
			console.log(id+" connected")
			linesOnline[id].online = true
			sendOnlineLines(io)
		})
		socket.on("disconnect", function(){
			console.log(id+" disconnected")
			linesOnline[id].online = false
			sendOnlineLines(io)
		})
	}
}

// send online lines event to socket or broadcast to all clients
function sendOnlineLines(socket){
	socket.emit("onlineLines", {
		lines: linesOnline,
	})
}




function poolLine(line){
	if (config.dataPooling.enabled == false){
		return;
	}

	var time = line.loastPoolTime;
	if (time == undefined){
		time = parseInt(Date.now()/1000) - config.dataPooling.startupPooling;
	}
	line.loastPoolTime = parseInt(Date.now()/1000)



	rest.get("http://"+line.ip+":"+line.port+"/api/shot?after="+time, function(data, response){
		var insertData = [];
		for (i in data){
			var single = data[i];
			insertData.push([
				single.number,
				single.sessionID,
				single.ring,
				single.teiler,
				single.winkel,
				single.x,
				single.y,
				single.date,
			])
		}
		if (insertData.length >= 1){
			mysql.query(
				"INSERT INTO shot (number, sessionID, ring, teiler, winkel, x, y, date) " +
				"VALUES ?;",
				[insertData],
				function(err, rows) {

				}
			);
		}
	});



	rest.get("http://"+line.ip+":"+line.port+"/api/session?after="+time, function(data, response){
		var insertData = [];
		for (i in data){
			var single = data[i];
			insertData.push([
				single.id,
				single.sessionGroupID,
				single.part,
				single.date,
			])
		}
		if (insertData.length >= 1){
			mysql.query(
				"INSERT INTO session (id, sessionGroupID, part, date) " +
				"VALUES ?;",
				[insertData],
				function(err, rows) {

				}
			);
		}
	});



	rest.get("http://"+line.ip+":"+line.port+"/api/sessionGroup?after="+time, function(data, response){
		var insertData = [];
		for (i in data){
			var single = data[i];
			insertData.push([
				single.id,
				single.disziplin,
				single.line,
				single.date,
			])
		}
		if (insertData.length >= 1){
			mysql.query(
				"INSERT INTO sessionGroup (id, disziplin, line, date) " +
				"VALUES ?;",
				[insertData],
				function(err, rows) {

				}
			);
		}
	});
}
