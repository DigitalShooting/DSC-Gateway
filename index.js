"use strict";
//
// index.js
//
// Main file for DSC Gateway
// Default DSC Gateway, will connect to each DSC Line Socket to get updates.
//

const express = require("express");
const http = require("http");
const child_process = require("child_process");
const SocketIO = require("socket.io");

const config = require("./config/");
const ClientSocketManager = require("./lib/ClientSocketManager.js");
const TeamManager = require("./lib/TeamManager.js");
const StaticContentManger = require("./lib/StaticContentManger.js");

var Database;
if (config.database.enabled) {
  Database = require("./lib/database/MongoDB.js");
}
else {
  Database = require("./lib/database/NoDB.js");
}



// Start Main Server Processes
var serverSocketProcess = child_process.fork("./lib/GatewayHandler/Server/");

// clientSocketManager

serverSocketProcess.on("exit", function(){
  console.error("[Main Process] serverSocketProcess did exit, stopping ...");
  process.exit();
});
serverSocketProcess.on("message", function(event){
  if (event.type == "setLine") {
    clientSocketManager.setLine(event.data);
  }
});
setTimeout(function(){
  serverSocketProcess.send({
    type: "connect",
    data: config.network,
  });
}, 2000);

// Start Main Server Processes
var relaySocketProcess = child_process.fork("./lib/GatewayHandler/Relay/");
relaySocketProcess.on("exit", function(){
  console.error("[Main Process] relaySocketProcess did exit, stopping ...");
  process.exit();
});



/**
 Send online lines event to socket or broadcast to all clients
 */
function sendOnlineLines() {
  var event = {
    type: "onlineLines",
    data: {
      lines: clientSocketManager.linesOnline,
      teams: teamManager.teams,
      staticContent: staticContentManger.content
    },
  };

  serverSocketProcess.send(event);
  relaySocketProcess.send(event); // TODO own process
}

function sendConfig(event) {
  var event = {
    type: "setConfig",
    data: {
      line: event.line._id,
      data: event.data,
    },
  };

  serverSocketProcess.send(event);
  relaySocketProcess.send(event);
}

function sendData(event) {
  var event = {
    type: "setData",
    data: {
      line: event.line._id,
      data: event.data,
    },
  };

  serverSocketProcess.send(event);
  relaySocketProcess.send(event);
}

function sendTeam(team) {
  var event = {
    type: "setTeam",
    data: {
      team: team,
    },
  };

  serverSocketProcess.send(event);
  relaySocketProcess.send(event);
}



// ----------- TeamManager -----------
var teamManager = new TeamManager();
teamManager.on("updateAllTeams", function(){
  sendOnlineLines();
});
teamManager.on("updateTeam", function(team){
  sendTeam(team);
});



// ----------- ClientSocketManager -----------
var clientSocketManager = new ClientSocketManager();
clientSocketManager.on("setConfig", function(event){
  // teamManager.updateWithLineData(event.data, event.line._id);
  sendConfig(event);
});
clientSocketManager.on("setData", function(event){
  database.updateLineData(event.data);

  teamManager.updateWithLineData(event.data, event.line._id);
  sendData(event);
});
clientSocketManager.on("connect", function(line){
  database.loadHistorieFromLine(line._id);

  setTimeout(function(){
    sendOnlineLines();
  }, 2000);
});
clientSocketManager.on("disconnect", function(line){
  teamManager.updateWithLineDisconnect(line._id);
  sendOnlineLines();
});




// ----------- StaticContentManger -----------
var staticContentManger = new StaticContentManger();
staticContentManger.on("didChangeContent", function(event){
  teamManager.updateWithLineData(event.data, event.data._id);
});




// ----------- Database -----------
var database = new Database(function(){
  clientSocketManager.connect(config.lines);
  relaySocketProcess.send({
    type: "connect",
    data: config.relay.relays,
  });
});
