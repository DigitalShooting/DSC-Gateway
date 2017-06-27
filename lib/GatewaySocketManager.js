const SocketIO = require("socket.io");
/**

 */
class GatewaySocketManager {
  constructor(server) {
    this.io = SocketIO(server);


    // --------- relay connection handling -------
    this.io.on("connection", function(socket){
      // send online DSCs to new connected client
      sendOnlineLines(socket);

      // send the online lines to the line
      socket.on("getLines", function(){
        sendOnlineLines(socket);
      });

      if (config.permissions.setLine) {
        // triggers any given event on DSC
        socket.on("setLine", function(data){
          clientSocketManager.setLine(data);
        });
      }

      if (config.permissions.startLine) {
        // set power performs wakeonlan or ssh shutdown on target machine
        socket.on("startLine", function(data){
          var line = config.lines[data.line];
          if (line != undefined) {
            child_process.execFile("wakeonlan", [line.mac], function() { });
          }
        });
      }
    }.bind(this));
  }


  /**
   Send online lines event to socket or broadcast to all clients
   */
  sendOnlineLines(socket, lines, teams){
  	socket.emit("onlineLines", {
  		lines: clientSocketManager.linesOnline,
  		teams: teamManager.teams,
  	});
  }

}

module.exports = GatewaySocketManager;
