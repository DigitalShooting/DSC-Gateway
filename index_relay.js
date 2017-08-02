"use strict";
//
// index_relay.js
//
// Main file for DSC Gateway (Relay)
// The relay recives its data from a DSC Gateway, who calls the REST API.
//

const express = require("express");
const http = require("http");

const SocketIO = require("socket.io");
const SocketIOClient = require("socket.io-client");
const OnlineLines = require("./lib/OnlineLines.js");

const config = require("./config/");

// TODO: Implement Database handling for rest
// var Database = require("./lib/database/NoDB.js");



// -------- Server Socket --------
var app = express({ strict: true });
var server = http.Server(app);
var io = SocketIO(server);



// Delay start of the public api a bit, to make sure we cached each line
setTimeout(function(){
  server.listen(config.network.port+1, config.network.address);
}, 2000);
server.on("listening", function() {
  console.info("DSC-Gateway (Relay) started (%s:%s)", server.address().address, server.address().port);
});


// --------- relay connection handling -------
io.on("connection", function(socket){
  // send online DSCs to new connected client
  sendOnlineLines(socket);

  // send the online lines to the line
  socket.on("getLines", function(){
    console.log("getLines")
    sendOnlineLines(socket);
  });
});

/**
 Send online lines event to socket or broadcast to all clients
 */
function sendOnlineLines(socket) {
  socket.emit("onlineLines", clientCache.onlineLines);
}




// -------- Client Socket --------
var clientSocket = SocketIOClient(config.relay.dscGatewayServer);
var clientCache = {
  onlineLines: new OnlineLines(),
};

clientSocket.on('connect', function(){
  console.info("DSC-Gateway client socket connected");
});
clientSocket.on('disconnect', function(){
  console.info("DSC-Gateway client socket disconnected");
  clientCache.onlineLines = new OnlineLines();
  sendOnlineLines(io);
});

clientSocket.on("onlineLines", function(data){
  clientCache.onlineLines = data;
  sendOnlineLines(io);
});
clientSocket.on("setConfig", function(data){
  io.emit("setConfig", data);
  io.emit(data.line + "_setConfig", data.data);
});
clientSocket.on("setData", function(data){
  io.emit("setData", data);
  io.emit(data.line + "_setData", data.data);
});
clientSocket.on("setTeam", function(data){
  io.emit("setTeam", data);
  io.emit(data.team.teamID + "_setTeam", data.data);
});




// ----------- Database -----------
// var database = new Database(function(){});
