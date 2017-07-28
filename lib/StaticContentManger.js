"use strict";

const EventManager = require("./EventManager.js");

/**
 Store custom static sessions which will be included in oure teams calculations
 */
class StaticContentManger extends EventManager {
  constructor() {
    super();
    
    /**
     Object for the each content object
     */
    this.content = {};
  }


  /**
   API to edit one static conent object.
   */
  setContent(data) {
    console.log(data);

    var sessionID = data._id;
    if (sessionID == null) {
      console.error("[StaticContentManger]: Invalid SessionID.");
      return;
    }

    this.content = data;

    this.call("didChangeContent", {
      data: data,
    });
  }
}

module.exports = StaticContentManger;
