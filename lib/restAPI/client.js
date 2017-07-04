"use strict";

const request = require('request');

const config = require("../../config/");

/**
 Call the remote api with given data
 */
class RESTAPIClient {
  constructor() {
    setInterval(function(){
      config.restAPI.client.servers.forEach(function(server) {
        var options = {
          method: "post",
          body: {},
          json: true,
          url: server + "/keepalive",
          timeout: 1000,
        };
        request(options, function(){});
      });
    }, config.restAPI.client.keepaliveInterval);
  }



  setConfig(event) {
    config.restAPI.client.servers.forEach(function(server) {
      var options = {
        method: "post",
        body: event.data,
        json: true,
        url: server + "/line/"+event.line._id+"/setConfig",
        timeout: 1000,
      };
      request(options, function(){});
    });
  }

  setData(event) {
    config.restAPI.client.servers.forEach(function(server) {
      var options = {
        method: 'post',
        body: event.data,
        json: true,
        url: server + "/line/"+event.line._id+"/setData",
        timeout: 1000,
      };
      request(options, function(){});
    });
  }

  connect(line) {
    config.restAPI.client.servers.forEach(function(server) {
      var options = {
        method: 'post',
        body: {},
        json: true,
        url: server + "/line/"+line._id+"/connect",
        timeout: 1000,
      };
      request(options, function(){});
    });
  }

  disconnect(line) {
    config.restAPI.client.servers.forEach(function(server) {
      var options = {
        method: 'post',
        body: {},
        json: true,
        url: server + "/line/"+line._id+"/disconnect",
        timeout: 1000,
      };
      request(options, function(){});
    });
  }
}

module.exports = RESTAPIClient;
