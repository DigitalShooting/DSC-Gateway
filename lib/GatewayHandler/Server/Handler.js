"use strict";

const http = require("http");
const SocketIO = require("socket.io");
const child_process = require('child_process');

const GatewayHandler = require("../index.js");
const config = require("../../../config/");

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
      setTimeout(function(){
        socket.emit("onlineLines", this.onlineLines);
      }.bind(this, socket), 1000);

      // send the online lines to the line
      socket.on("getLines", function(){
        socket.emit("onlineLines", this.onlineLines);
      }.bind(this));

      // triggers any given event on DSC
      if (config.permissions.setLine){
        socket.on("setLine", function(data){
          process.send({type: "setLine", data: data});
        });
      }

      // set power performs wakeonlan or ssh shutdown on target machine
      if (config.permissions.setPower) {
        socket.on('setPower', function(data){
          var line = config.lines[data.line];
          if (data.state === true){
            // Power On
            child_process.exec("wakeonlan " + line.mac, function(err, out, code) { });
          }
          else {
            // Power Off
            child_process.exec(["ssh -t "+line.user+"@"+line.ip+" 'sudo shutdown -h now'"], function(err, out, code) { });
          }
        });
      }


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
