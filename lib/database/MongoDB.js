"use strict";

const MongoClient = require('mongodb').MongoClient;
const request = require('request');

const config = require("../../config/");

/**
 MongoDB database API
 Connects to the DB, and manages all updates
 */
class MongoDB {
  /**
   Will call callback when we have a DB connection
   @param callback        Will be called after we connected to the DB
   */
  constructor(callback) {
    MongoClient.connect(config.database.mongodb.url, function(err, db) {
      if (err){
        console.error("MongoDB not connected ("+err+")");
      }
      console.info("MongoDB connected");

      this.collection = db.collection(config.database.mongodb.collection);
      callback();
    }.bind(this));
  }

  /**
   Write the data from a line to the DB
   @param data            Data from "setData" to write
   TODO only write to db if more the 0 shots or more than one session
   */
  updateLineData(data) {
    if (data == null) {
      throw Error("MongoDB: data to insert is null");
    }

    if (this.collection == undefined) {
      throw Error("MongoDB: collection is null");
    }

    try {
      // If we only have 1 session part and 0 shots, dont save it
      if (data.sessionParts.length <= 1 && data.sessionParts[data.sessionIndex].anzahl == 0) {
        return;
      }

      // Save it to db
      this.collection.update(
        {"_id" : data._id},
        data,
        {upsert: true, unique: true},
        function() {}
      );
    }
    catch (err) {
      console.error(err);
    }
  }

  /**
   Check if we missed any data from the line (DSC online, DSC-Gateway offline)
   @param id            Line id to check
   */
  loadHistorieFromLine(id){
    this.collection.find({"$or": [{"line": id}]}).sort({date:-1}).limit(1).skip(1).toArray(function (err, data) {
      if (err){
        console.error(err);
      }
      if (data.length >= 1) {
        this.loadHistorieFromLineSince(id, data[0].date);
      }
      else {
        this.loadHistorieFromLineSince(id, 0);
      }
    }.bind(this));
  }

  /**
   Internal helper to fetch line data
   @param id            Line id
   @param data          Date (unixtime) to load data from
   */
  loadHistorieFromLineSince(id, date){
    var line = config.lines[id];

    request.get("http://" + line.ip + ":" + line.port + "/api/data?limit=1000&sinceDate=" + date, function (error, response) {
      if (response == null) {
        return null;
      }

      var datas = JSON.parse(response.body);
      console.info("Fetched "+datas.length+" Sessions from line "+id);
      for (var i in datas){
        this.updateLineData(datas[i]);
      }
    }.bind(this));
  }
}

module.exports = MongoDB;
