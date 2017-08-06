"use strict";

const SocketClient = require("socket.io-client");

const RelaySocketHandler = require("./Handler.js");

var relaySocketHandler = new RelaySocketHandler();

// Exit when the main process dies
process.once("disconnect", function(){
  console.error("[GatewayHandler Relay] Master got disconnect event, trying to exit with 0");
  process.exit(0);
});

process.once("exit", function(code){
  console.error("[GatewayHandler Relay] exit with %s", code);
});

process.on("message", function(event){
  switch (event.type) {
  case "onlineLines":
    relaySocketHandler.onOnlineLines(event.data);
    break;

  case "disconnect":
    relaySocketHandler.onDisconnect();
    break;

  case "setConfig":
    relaySocketHandler.onSetConfig(event.data);
    break;

  case "setData":
    relaySocketHandler.onSetData(event.data);
    break;

  case "setTeam":
    relaySocketHandler.onSetTeam(event.data);
    break;

  case "connect":
    relaySocketHandler.connect(event.data);
    break;

  default:
    console.error("Unnown event was called from main process", event);
  }
});
