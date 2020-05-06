"use strict";

const EventManager = require("./EventManager.js");
// const SocketClient = require("socket.io-client");


const WebSocket = require('ws');

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
    
    this.linesOnlineMeta = {};

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
  
  
  setUpTimeout(id) {
    // console.log("set up timeout", id);
    const lineMeta = this.linesOnlineMeta[id];
    if (lineMeta) {
      
      clearTimeout(lineMeta.pingTimeout);
    }
    lineMeta.pingTimeout = setTimeout(() => {
      // console.log("close", id)
      lineMeta.socket.close();
    }, 5000 + 1000);
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
    
    
    
    
    
    
    

    var socket = new WebSocket("http://"+line.ip+":"+line.port);
    
    this.linesOnlineMeta[id] = {
      pingTimeout: null,
      socket: socket,
    }
    
    socket.on('ping', () => {
      // console.log("ping", id);
      clearTimeout(this.linesOnlineMeta[id].pingTimeout);
      this.setUpTimeout(id);
    });
    socket.on("message", function(rawData){
      const data = JSON.parse(rawData);
      console.info(id+" on message", data.type);
      if (data != null) {
        if (data.type == "Session") {
          this.linesOnline[id].cache.setData = data.session;
          this.call("setData", {
            line: line,
            data: data.session,
          });
        }
        if (data.type == "Config") {
          this.linesOnline[id].cache.setConfig = data.config;
          this.call("setConfig", {
            line: line,
            data: data.config,
          });
        }
        if (data.type == "StoredSessions") {
          console.log(data);
          // this.linesOnline[id].cache.setConfig = data.config;
          // this.call("setConfig", {
          //   line: line,
          //   data: data.config,
          // });
        }
      }
    }.bind(this));


    socket.on("open", function(){  
      console.info(id+" connected");
      this.linesOnline[id].online = true;
      this.setUpTimeout(id);
      
      this.call("connect", line);

      setTimeout(function(){
        socket.emit("getData", {});
        socket.emit("getConfig", {});
      }.bind(this), 5000);
    }.bind(this));
    
    
    socket.on("close", function(){
      // If this line was online bevore, we call disconnect
      if (this.linesOnline[id].online) {
        console.info(id+" disconnected");
        this.linesOnline[id].online = false;
        delete this.linesOnlineMeta[id];
        this.call("disconnect", line);
      }
      
      // Try to connect to this line again in 5 seconds
      setTimeout(function(){
        this.setUpLine(line);
      }.bind(this), 5000);
    }.bind(this));
    
    
    socket.on("error", function(e){
      if (this.linesOnline[id].online) {
        console.error(id+" error", e);
      }
      // this.linesOnline[id].online = false;
      // this.call("disconnect", line);
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
