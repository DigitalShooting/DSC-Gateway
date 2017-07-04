"use strict";

const EventManager = require("../EventManager.js");

const config = require("../../config/");

/**
 Listen for line updates and check if we are getting keepalives.
 */
class RESTAPIServer extends EventManager {
  constructor(app) {
    super();

    this.resetKeepAlive();
    this.setUpLines();

    app.post('/keepalive', function() {
      this.resetKeepAlive();
    }.bind(this));

    app.post('/line/:lineID/setConfig', function(req, res) {
      console.log("on setConfig");
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
      console.log("on setData");
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
        console.info(line._id+" connected");
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
        console.info(line._id+" disconnected");
        this.linesOnline[line._id].online = false;
        this.call("disconnect", line);
      res.sendStatus(200);
      }
      else {
        res.sendStatus(404);
      }
    }.bind(this));
  }

  /**
   Stop keepalive timer and restart it.
   */
  resetKeepAlive() {
    clearTimeout(this.disconnectTimer);
    this.disconnectTimer = setTimeout(function(){
      this.setUpLines();
      this.call("timeout");
    }.bind(this), config.restAPI.server.keepaliveInterval);
  }

  /**
   Init linesOnline object with the line config
   TODO: check if we can get rid of this config, and just show every line data we get.
   */
  setUpLines() {
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
  }
}

module.exports = RESTAPIServer;
