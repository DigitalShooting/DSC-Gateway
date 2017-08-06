"use strict";

const SocketClient = require("socket.io-client");

const GatewayHandler = require("../index.js");

/**
 */
class RelaySocketHandler extends GatewayHandler {
  constructor() {
    super();

    this.connectedSockets = [];

    /**
     Object for each relay socket (index as key).
     */
    this.sockets = {};
  }

  onOnlineLines(data) {
    super.onOnlineLines(data);
    this.emit("onlineLines", this.onlineLines);
  }
  onDisconnect() {
    super.onDisconnect();
    this.emit("onlineLines", this.onlineLines);
  }
  onSetConfig(data) {
    super.onSetConfig(data);
    this.emit("setConfig", data);
  }
  onSetData(data) {
    super.onSetData(data);
    this.emit("setData", data);
  }
  onSetTeam(data) {
    super.onSetTeam(data);
    this.emit("setTeam", data);
  }


  /**
   Open the connection to all lines
   @param relays       ["abc.com:1234", "..."]
   */
  connect(relays) {
    if (relays == null) {
      throw Error("Relays: config is null");
    }

    // set up socket for all relays
    for (var i in relays) {
      this.setUpRelay(i, relays[i]);
    }
  }



  /**
    Internal function
    Set up the socket
   */
  setUpRelay(i, relay) {
    var socket = SocketClient(relay.url);
    socket.on("connect", function(){
      this.connectedSockets.push(i);
      socket.emit("onlineLines", this.onlineLines);
    }.bind(this, relay));

    socket.on("disconnect", function(){
      var index = this.connectedSockets.indexOf(i);
      if (index > -1) {
        this.connectedSockets.splice(index, 1);
      }
    }.bind(this, relay));

    this.sockets[i] = socket;
  }



  /**
    Send data to each relay
  */
  emit(title, data) {
    for (var i in this.connectedSockets) {
      this.sockets[i].emit(title, data);
    }
  }

}

module.exports = RelaySocketHandler;
