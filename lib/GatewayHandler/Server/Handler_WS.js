"use strict";

const http = require("http");
const WebSocket = require('ws');
const child_process = require('child_process');

const GatewayHandler = require("../index.js");
const config = require("../../../config/");

/**
 */
class ServerSocketHandler extends GatewayHandler {
  constructor() {
    super();

    this.server = new WebSocket.Server({ port: 4000 });

    // Broadcast to all.
    this.server.broadcast = function broadcast(data) {
      this.server.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }.bind(this);

    this.server.on("connection", function connection(socket) {

      // send online DSCs to new connected client
      setTimeout(function(){
        try {
          socket.send(JSON.stringify({
            type: "onlineLines",
            data: this.onlineLines,
          }));
        }
        catch(err) {
          console.error(err);
        }
      }.bind(this, socket), 1000);

      socket.on("message", function incoming(message) {
        if (message == null) {
          console.log("Got null message");
        }
        else if (message.type == "getLines") {
          // send the online lines to the line
          socket.send(JSON.stringify({
            type: "onlineLines",
            data: this.onlineLines,
          }));
        }
        else if (message.type == "setLine" && config.permissions.setLine) {
          // triggers any given event on DSC
          process.send(JSON.stringify({type: "setLine", data: message.data}));
        }
        else if (message.type == "startLine" && config.permissions.startLine) {
          // set power performs wakeonlan or ssh shutdown on target machine
          var line = config.lines[message.data.line];
          // Power On
          child_process.exec("wakeonlan " + line.mac, function(err, out, code) { });
        }
      }.bind(this));

    }.bind(this));
  }

  onOnlineLines(data) {
    super.onOnlineLines(data);
    this.server.broadcast(JSON.stringify({
      type: "onlineLines",
      data: this.onlineLines,
    }));
  }
  onDisconnect() {
    super.onDisconnect();
    this.server.broadcast(JSON.stringify({
      type: "onlineLines",
      data: this.onlineLines,
    }));
  }
  onSetConfig(data) {
    super.onSetConfig(data);
    this.server.broadcast(JSON.stringify({
      type: "setConfig",
      data: data,
    }));
    this.server.broadcast(JSON.stringify({
      type: data.line + "_setConfig",
      data: data.data,
    }));
  }
  onSetData(data) {
    super.onSetData(data);
    this.server.broadcast(JSON.stringify({
      type: "setData",
      data: data,
    }));
    this.server.broadcast(JSON.stringify({
      type: data.line + "_setData",
      data: data.data,
    }));
  }
  onSetTeam(data) {
    super.onSetTeam(data);
    this.server.broadcast(JSON.stringify({
      type: "setTeam",
      data: data,
    }));
    this.server.broadcast(JSON.stringify({
      type: data.team.teamID + "_setTeam",
      data: data.data,
    }));
  }


  /**
   */
  connect(port, address) {
    // TODO
    // if (address == null || port == null) {
    //   throw Error("Relays: config is null");
    // }
    //
    // this.server.listen(port, address);
  }
}

module.exports = ServerSocketHandler;
