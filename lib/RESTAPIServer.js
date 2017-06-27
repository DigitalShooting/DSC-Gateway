const EventManager = require("./EventManager.js");

const config = require("../config/");

/**

 */
class RESTAPIServer extends EventManager {
  constructor(app) {
    super();

    /**
     Main data, lineID as a key
     Contains status (online/ offline) and the main configs
     */
    this.linesOnline = {};

    for (var i in config.lines) {
      var line = config.lines[i];
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
    }

    app.post('/line/:lineID/setConfig', function(req, res) {
      var line = config.lines[req.params.lineID];
      if (line != null) {
        this.linesOnline[line._id].cache.setConfig = req.body;

        if (this.linesOnline[line._id].online == false) {
          this.linesOnline[line._id].online = true;
          this.call("connect", line);
        }
        else {
          this.call("setConfig", {
            line: line,
            data: req.body,
          });
        }

        res.sendStatus(200);
      }
      else {
        res.sendStatus(404);
      }
    }.bind(this));

    app.post('/line/:lineID/setData', function(req, res) {
      var line = config.lines[req.params.lineID];
      if (line != null) {
        this.linesOnline[line._id].cache.setData = req.body;

        if (this.linesOnline[line._id].online == false) {
          this.linesOnline[line._id].online = true;
          this.call("connect", line);
        }
        else {
          this.call("setData", {
            line: line,
            data: req.body,
          });
        }

        res.sendStatus(200);
      }
      else {
        res.sendStatus(404);
      }
    }.bind(this));

    app.post('/line/:lineID/connect', function(req, res) {
      var line = config.lines[req.params.lineID];
      if (line != null) {
        console.log("[INFO] "+line._id+" connected");
        this.linesOnline[line._id].online = true;
        this.call("connect", line);
      res.sendStatus(200);
      }
      else {
        res.sendStatus(404);
      }
    }.bind(this));

    app.post('/line/:lineID/disconnect', function(req, res) {
      var line = config.lines[req.params.lineID];
      if (line != null) {
        console.log("[INFO] "+line._id+" disconnected");
        this.linesOnline[line._id].online = false;
        this.call("disconnect", line);
      res.sendStatus(200);
      }
      else {
        res.sendStatus(404);
      }
    }.bind(this));
  }
}

module.exports = RESTAPIServer;
