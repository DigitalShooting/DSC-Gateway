"use strict";

const http = require("http");
const SocketIO = require("socket.io");
const child_process = require('child_process');

const WebSocket = require('ws');

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
    
    this.socket = new WebSocket.Server({ host: "0.0.0.0", port: 5008 });
    this.socket.on('connection', function connection(ws) {
      console.log("connection");
      
      ws.send(JSON.stringify({
        type: "full",
        data: this.onlineLines
      }));
      
      // setTimeout(function(){
      //   ws.send(JSON.stringify({
      //     type: "fulll",
      //     data: this.onlineLines,
      //   }));
      // }.bind(this, ws), 1000);
    
      // // send the online lines to the line
      // socket.on("getLines", function(){
      //   socket.emit("onlineLines", this.onlineLines);
      // }.bind(this));
      
      
      
      ws.on('message', function incoming(data) {
        console.log(data);
      });
    }.bind(this));

    // this.io = SocketIO(this.server);
    // this.io.on("connection", function(socket){
    //   // send online DSCs to new connected client
      // setTimeout(function(){
      //   socket.emit("onlineLines", this.onlineLines);
      // }.bind(this, socket), 1000);
      // 
      // // send the online lines to the line
      // socket.on("getLines", function(){
      //   socket.emit("onlineLines", this.onlineLines);
      // }.bind(this));
    // 
    //   // triggers any given event on DSC
    //   if (config.permissions.setLine){
    //     socket.on("setLine", function(data){
    //       process.send({type: "setLine", data: data});
    //     });
    //   }
    // 
    //   // set power performs wakeonlan or ssh shutdown on target machine
    //   if (config.permissions.startLine) {
    //     socket.on('startLine', function(data){
    //       var line = config.lines[data.line];
    //       // Power On
    //       child_process.exec("wakeonlan " + line.mac, function(err, out, code) { });
    //     });
    //   }
    // 
    // 
    // }.bind(this));
  }
  
  broadcastMessage(message) {
    this.socket.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  onOnlineLines(data) {
    super.onOnlineLines(data);
    // this.io.emit("onlineLines", this.onlineLines);
    
    this.broadcastMessage({
      type: "full",
      data: this.onlineLines,
    });
  }
  onDisconnect() {
    super.onDisconnect();
    // this.io.emit("onlineLines", this.onlineLines);
    
    // this.broadcastMessage({
    //   type: "disconnect",
    //   data: { lineID: lineID }
    // });
    
    // this.broadcastMessage({
    //   type: "full",
    //   data: this.onlineLines,
    // });
    
  }
  onSetConfig(data) {
    super.onSetConfig(data);
    // this.io.emit("setConfig", data);
    // this.io.emit(data.line + "_setConfig", data.data);
    
    // this.broadcastMessage(this.onlineLines);
  }
  onSetData(data) {
    super.onSetData(data);
    // this.io.emit("setData", data);
    // this.io.emit(data.line + "_setData", data.data);
    
    this.broadcastMessage({
      type: "delta",
      data: data,
    });
  }
  onSetTeam(data) {
    super.onSetTeam(data);
    // this.io.emit("setTeam", data);
    // this.io.emit(data.team.teamID + "_setTeam", data.data);
    
    // this.broadcastMessage(this.onlineLines);
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
