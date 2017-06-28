"use strict";

const express = require("express");
const http = require("http");
const child_process = require("child_process");
const SocketIO = require("socket.io");

const config = require("./config/");
const ClientSocketManager = require("./lib/ClientSocketManager.js");
const RESTAPIClient = require("./lib/RESTAPIClient.js");
const TeamManager = require("./lib/TeamManager.js");

var Database;
if (config.database.enabled) {
  Database = require("./lib/database/MongoDB.js");
}
else {
  Database = require("./lib/database/NoDB.js");
}

var restAPIClient = new RESTAPIClient();


// -------- Server Socket --------
var app = express({ strict: true });
var server = http.Server(app);
var io = SocketIO(server);

// Delay start of the public api a bit, to make sure we cached each line
setTimeout(function(){
  server.listen(config.network.port, config.network.address);
}, 2000);
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
      clientSocketManager.setLine(data);
    });
  }

  if (config.permissions.startLine) {
    // set power performs wakeonlan or ssh shutdown on target machine
    socket.on("startLine", function(data){
      var line = config.lines[data.line];
      if (line != undefined) {
        child_process.execFile("wakeonlan", [line.mac], function() { });
      }
    });
  }
});

/**
 Send online lines event to socket or broadcast to all clients
 */
function sendOnlineLines(socket) {
  socket.emit("onlineLines", {
    lines: clientSocketManager.linesOnline,
    teams: teamManager.teams,
  });

	// request.post("http://127.0.0.1:4001", })
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




// ----------- ClientSocketManager -----------
var clientSocketManager = new ClientSocketManager();
clientSocketManager.on("setConfig", function(event){
  teamManager.updateWithLineData(event.data, event.line._id);
  sendConfig(event);
	restAPIClient.setConfig(event);
});
clientSocketManager.on("setData", function(event){
  database.updateLineData(event.data);

  teamManager.updateWithLineData(event.data, event.line._id);
  sendData(event);
	restAPIClient.setData(event);
});
clientSocketManager.on("connect", function(line){
  database.loadHistorieFromLine(line._id);
	restAPIClient.connect(line);

  // TODO check if needet so long
  setTimeout(function(){
    sendOnlineLines(io);
  }, 2000);
});
clientSocketManager.on("disconnect", function(line){
  teamManager.updateWithLineDisconnect(line._id);
  sendOnlineLines(io);
	restAPIClient.disconnect(line);
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
var database = new Database(function(){
  clientSocketManager.connect(config.lines);
});
