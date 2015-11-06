var express = require("express")
var http = require("http")
var config = require("./config/")
var SocketClient = require("socket.io-client")

var app = express({ strict: true })



// Set up express & socket.io
var server = http.Server(app)
var io = require('socket.io')(server)
server.listen(config.network.port, config.network.address)
server.on('listening', function() {
	console.log('Express server started on at %s:%s', server.address().address, server.address().port)
})



// Server Socket
io.on('connection', function(socket){
	sendOnlineLines(socket)

	socket.on("setLine", function(data){
		var lineSocket = config.lines[data.line].socket
		if (lineSocket != undefined){
			lineSocket.emit(data.method, data.data)
		}
	})
})



var linesOnline = {}

// Line Sockets
for (id in config.lines){
	registerLine(id)
}
function registerLine(id){
	var line = config.lines[id]
	linesOnline[id] = false

	config.lines[id].socket = SocketClient("http://"+line.ip+":"+line.port)

	var methods = ["setSession", "setConfig", "setData"]
	for (i in methods){
		setUpEvent(config.lines[id].socket, methods[i])
	}

	function setUpEvent(socket, method){
		socket.on(method, function(data){
			io.emit("setSession", {
				line: line._id,
				data: data,
			})
		})

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



function sendOnlineLines(socket){
	socket.emit("onlineLines", {
		lines: linesOnline,
	})
}
