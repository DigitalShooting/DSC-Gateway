var express = require("express")
var http = require("http")
var config = require("./config/")
var SocketClient = require("socket.io-client")



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
var linesOnline = {}

for (id in config.lines){
	registerLine(id)
}

// Register line with id
function registerLine(id){
	var line = config.lines[id]
	linesOnline[id] = false

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
			io.emit(method, {
				line: line._id,
				data: data,
			})
		})
	}

	// set up connection methods
	function setUpConnection(socket){
		socket.on("connect", function(){
			linesOnline[id] = true
			sendOnlineLines(io)
		})
		socket.on("disconnect", function(){
			linesOnline[id] = false
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
