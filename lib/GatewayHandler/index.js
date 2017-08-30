"use strict";
/**
 */
class GatewayHandler {
  constructor(title) {
    this.onlineLines = {lines: {}, teams: {}, staticContent: {}};
  }

  onOnlineLines(data) {
    this.onlineLines = data;
  }

  onDisconnect() {
    this.onlineLines = {lines: {}, teams: {}, staticContent: {}};
  }

  onSetConfig(data) {
    if (this.onlineLines.lines[data.line] != null) {
      this.onlineLines.lines[data.line].cache.setConfig = data.data;
    }
  }

  onSetData(data) {
    if (this.onlineLines.lines[data.line] != null) {
      this.onlineLines.lines[data.line].cache.setData = data.data;
    }
  }

  onSetTeam(data) {
    this.onlineLines.teams[data.team.teamID] = data.team;
  }
}

module.exports = GatewayHandler;
