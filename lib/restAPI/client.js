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
          auth: {
            user: server.user,
            pass: server.password
          },
          json: true,
          url: server.url + "/keepalive",
          timeout: 30000,
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
        auth: {
          user: server.user,
          pass: server.password
        },
        json: true,
        url: server.url + "/line/"+event.line._id+"/setConfig",
        timeout: 30000,
      };
      request(options, function(){});
    });
  }

  setData(event) {
    config.restAPI.client.servers.forEach(function(server) {
      var options = {
        method: 'post',
        body: event.data,
        auth: {
          user: server.user,
          pass: server.password
        },
        json: true,
        url: server.url + "/line/"+event.line._id+"/setData",
        timeout: 30000,
      };
      request(options, function(){});
    });
  }

  connect(line) {
    config.restAPI.client.servers.forEach(function(server) {
      var options = {
        method: 'post',
        body: {},
        auth: {
          user: server.user,
          pass: server.password
        },
        json: true,
        url: server.url + "/line/"+line._id+"/connect",
        timeout: 30000,
      };
      request(options, function(){});
    });
  }

  disconnect(line) {
    config.restAPI.client.servers.forEach(function(server) {
      var options = {
        method: 'post',
        body: {},
        auth: {
          user: server.user,
          pass: server.password
        },
        json: true,
        url: server.url + "/line/"+line._id+"/disconnect",
        timeout: 30000,
      };
      request(options, function(){});
    });
  }
}

module.exports = RESTAPIClient;
