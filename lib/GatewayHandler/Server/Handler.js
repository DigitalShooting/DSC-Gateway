"use strict";

const http = require("http");
const SocketIO = require("socket.io");

const GatewayHandler = require("../index.js");

/**
 */
class ServerSocketHandler extends GatewayHandler {
  constructor() {
    super();

    this.server = http.Server();
    this.server.on("listening", function() {
      process.send({type: "init"});
      console.info("DSC-Gateway-Relay ServerSocketHandler started (%s:%s)", this.server.address().address, this.server.address().port);
    }.bind(this));

    this.io = SocketIO(this.server);
    this.io.on("connection", function(socket){
      // send online DSCs to new connected client
      socket.emit("onlineLines", this.onlineLines);

      // send the online lines to the line
      socket.on("getLines", function(){
        socket.emit("onlineLines", this.onlineLines);
      }.bind(this));
    }.bind(this));
  }

  onOnlineLines(data) {
    super.onOnlineLines(data);
    this.io.emit("onlineLines", this.onlineLines);
  }
  onDisconnect() {
    super.onDisconnect();
    this.io.emit("onlineLines", this.onlineLines);
  }
  onSetConfig(data) {
    super.onSetConfig(data);
    this.io.emit("setConfig", data);
    this.io.emit(data.line + "_setConfig", data.data);
  }
  onSetData(data) {
    super.onSetData(data);
    this.io.emit("setData", data);
    this.io.emit(data.line + "_setData", data.data);
  }
  onSetTeam(data) {
    super.onSetTeam(data);
    this.io.emit("setTeam", data);
    this.io.emit(data.team.teamID + "_setTeam", data.data);
  }


  /**
   */
  connect(port, address) {
    if (address == null || port == null) {
      throw Error("Relays: config is null");
    }

    this.server.listen(port, address);
  }
}

module.exports = ServerSocketHandler;
