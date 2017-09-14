"use strict";

const EventManager = require("./EventManager.js");
const SocketClient = require("socket.io-client");

/**
 Opens a socket to each given DSC line
 and informs via EventManagerabout changes.
 */
class ClientSocketManager extends EventManager {
  constructor() {
    super();

    /**
     Main data, lineID as a key
     Contains status (online/ offline) and the main configs
     */
    this.linesOnline = {};

    /**
     Object for each line socket (lineID as key).
     */
    this.sockets = {};
  }

  /**
   Open the connection to all lines
   @param lines       line config
   */
  connect(lines) {
    if (lines == null) {
      throw Error("Clients: config is null");
    }

    // set up socket for all lines
    for (var id in lines) {
      this.setUpLine(lines[id]);
    }
    this.call("init");
  }



  /**
    Internal function
    Set up the socket and call updates on changes
   */
  setUpLine(line) {
    var id = line._id;
    this.linesOnline[id] = {
      id: id,
      label: line.label,
      ip: line.ip,
      port: line.port,
      labelShort: line.labelShort,
      online: false,
      cache: {},
    };

    var socket = SocketClient("http://"+line.ip+":"+line.port);
    socket.on("setConfig", function(data){
      this.linesOnline[id].cache.setConfig = data;
      this.call("setConfig", {
        line: line,
        data: data,
      });
    }.bind(this));

    socket.on("setData", function(data){
      if (data != null) {
        this.linesOnline[id].cache.setData = data;
        this.call("setData", {
          line: line,
          data: data,
        });
      }
    }.bind(this));

    socket.on("connect", function(){
      console.info(id+" connected");
      this.linesOnline[id].online = true;
      this.call("connect", line);

      setTimeout(function(){
        socket.emit("getData", {});
        socket.emit("getConfig", {});
      }.bind(this), 5000);
    }.bind(this));
    socket.on("disconnect", function(){
      console.info(id+" disconnected");
      this.linesOnline[id].online = false;
      this.call("disconnect", line);
    }.bind(this));

    this.sockets[line._id] = socket;
  }

  setLine(data) {
    var socket = this.sockets[data.line];
    if (socket != null){
      socket.emit(data.method, data.data);
    }
  }
}

module.exports = ClientSocketManager;
