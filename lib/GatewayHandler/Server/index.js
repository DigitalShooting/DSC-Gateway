"use strict";

const SocketClient = require("socket.io-client");

const ServerSocketHandler = require("./Handler.js");

var serverSocketHandler = new ServerSocketHandler();

// Exit when the main process dies
process.once("disconnect", function(){
  console.error("[GatewayHandler Server] Master got disconnect event, trying to exit with 0");
  process.exit(0);
});

process.once("exit", function(code){
  console.error("[GatewayHandler Server] exit with %s", code);
});

process.on("message", function(event){
  switch (event.type) {
  case "onlineLines":
    serverSocketHandler.onOnlineLines(event.data);
    break;

  case "disconnect":
    serverSocketHandler.onDisconnect();
    break;

  case "setConfig":
    serverSocketHandler.onSetConfig(event.data);
    break;

  case "setData":
    serverSocketHandler.onSetData(event.data);
    break;

  case "setTeam":
    serverSocketHandler.onSetTeam(event.data);
    break;

  case "connect":
    serverSocketHandler.connect(event.data.port, event.data.address);
    break;

  default:
    console.error("Unnown event was called from main process", event);
  }
});
