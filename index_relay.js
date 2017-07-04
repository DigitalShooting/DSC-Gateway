"use strict";
//
// index_relay.js
//
// Main file for DSC Gateway (Relay)
// The relay recives its data from a DSC Gateway, who calls the REST API.
//

const express = require("express");
const http = require("http");
const BodyParser = require('body-parser');
const SocketIO = require("socket.io");

const config = require("./config/");
const RESTAPIServer = require("./lib/restAPI/server.js");
const TeamManager = require("./lib/TeamManager.js");

// TODO: Implement Database handling for rest
var Database;
// if (config.database.enabled) {
//   Database = require("./lib/database/MongoDB.js");
// }
// else {
  Database = require("./lib/database/NoDB.js");
// }



// -------- Server Socket --------
var app = express({ strict: true });
var server = http.Server(app);
var io = SocketIO(server);



// Delay start of the public api a bit, to make sure we cached each line
setTimeout(function(){
  server.listen(config.network.port+1, config.network.address);
}, 2000);
server.on("listening", function() {
  console.log("[INFO] DSC-Gateway started (%s:%s)", server.address().address, server.address().port);
});



// -------- REST Socket --------
var restApp = express({ strict: true });
// restApp.use(BodyParser.urlencoded({
// 	extended: true
// }));
restApp.use(BodyParser.json({limit: '50mb'}));
var httpServer = http.Server(restApp);
setTimeout(function(){
  httpServer.listen(config.restAPI.server.network.port, config.restAPI.server.network.address);
}, 2000);
httpServer.on("listening", function() {
	console.log("[INFO] DSC-Relay started (%s:%s)", httpServer.address().address, httpServer.address().port);
});



// --------- relay connection handling -------
io.on("connection", function(socket){
  // send online DSCs to new connected client
  sendOnlineLines(socket);

  // send the online lines to the line
  socket.on("getLines", function(){
    sendOnlineLines(socket);
  });
});

/**
 Send online lines event to socket or broadcast to all clients
 */
function sendOnlineLines(socket) {
  socket.emit("onlineLines", {
    lines: restAPIServer.linesOnline,
    teams: teamManager.teams,
  });
}

function sendConfig(event) {
  // Depricated
  io.emit("setConfig", {
    line: event.line._id,
    data: event.data,
  });
  // Send event directly to room with id_method
  io.emit(event.line._id + "_setConfig", event.data);
}

function sendData(event) {
  // Depricated
  io.emit("setData", {
    line: event.line._id,
    data: event.data,
  });
  // Send event directly to room with id_method
  io.emit(event.line._id + "_setData", event.data);
}

function sendTeam(team) {
  // Depricated
  io.emit("setTeam", {
    team: team,
  });
  io.emit(team.teamID + "_setTeam", {
    team: team,
  });
}



// ----------- RESTAPIServer -----------
var restAPIServer = new RESTAPIServer(restApp);
restAPIServer.on("setConfig", function(event){
  teamManager.updateWithLineData(event.data, event.line._id);
  sendConfig(event);
});
restAPIServer.on("setData", function(event){
  database.updateLineData(event.data);

  teamManager.updateWithLineData(event.data, event.line._id);
  sendData(event);
});
restAPIServer.on("connect", function(line){
  database.loadHistorieFromLine(line._id);

  // TODO check if needet so long
  setTimeout(function(){
    sendOnlineLines(io);
  }, 2000);
});
restAPIServer.on("disconnect", function(line){
  teamManager.updateWithLineDisconnect(line._id);
  sendOnlineLines(io);
});
restAPIServer.on("timeout", function(){
  teamManager.timeoutReset();
  sendOnlineLines(io);
});



// ----------- TeamManager -----------
var teamManager = new TeamManager();
teamManager.on("updateAllTeams", function(){
  sendOnlineLines(io);
});
teamManager.on("updateTeam", function(team){
  sendTeam(team);
});



// ----------- Database -----------
var database = new Database(function(){});
