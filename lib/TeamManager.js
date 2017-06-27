const EventManager = require("./EventManager.js");

/**
 Groups the line data into teams
 */
class TeamManager extends EventManager {
  constructor() {
    super();
    this.teams = {};
  }

  // TODO
  // add reserve flag into session.user

  /**
   Call with line data to update teams
   @param data        line data
   @param lineID
   */
  updateWithLineData(data, lineID) {
    if (
      data.user == null ||
      data.user.verein == null || data.user.verein == "" ||
      data.user.manschaft == null || data.user.manschaft == "" ||
      data.user.manschaftAnzahlSchuetzen == null || data.user.manschaftAnzahlSchuetzen == "" ||
      data.user.firstName == null || data.user.firstName == ""
    ) {
      if (this.clearLine(lineID, null)) {
        this.call("updateAllTeams");
      }
      return;
    }

    var teamID = data.user.verein + "_" + data.user.manschaft;
    var session = data.sessionParts[data.sessionIndex];
    var updateAllTeams = false;

    this.clearLine(lineID, teamID);

    // init new team
    if (this.teams[teamID] == null) {
      this.teams[teamID] = {
        teamID: teamID,
        gesamt: 0,
        anzahl: 0,
        progress: 0,
        hochrechnung: 0,
        users: {},
      };

      updateAllTeams = true;
    }

    this.teams[teamID].users[lineID] = {
      user: data.user,
      gesamt: session.gesamt, // TODO remove
      anzahl: session.anzahl, // TODO remove
      session: session,
      disziplin: data.disziplin,
    };

    if (this.recalculateTeam(teamID)) {
      updateAllTeams = true;
    }

    if (updateAllTeams) {
      this.call("updateAllTeams");
    }
    else {
      this.call("updateTeam", this.teams[teamID]);
    }
  }

  /**
   Call when a line has disconnected
   @param lineID
   */
  updateWithLineDisconnect(lineID) {
    this.clearLine(lineID, null);
  }


  /**
   Remove given lineID from every team which is not the given teamID.
   @param lineID
   @param teamID
   @return true if something has changed
   */
  clearLine(lineID, teamID) {
    var changed = false;
    for (var t in this.teams) {
      if (t != teamID) {
        if (this.teams[t] != null) {
          if (this.teams[t].users[lineID] != null) {
            delete this.teams[t].users[lineID];
            this.recalculateTeam(t);
            changed = true;
          }
        }
      }
    }
    return changed;
  }


  /**
   Calculate metadata of oure teams
   @param teamID
   */
  recalculateTeam(teamID) {
    var numberOfShotsPerUser = 40; // TODO

    // reset counts
    this.teams[teamID].gesamt = 0;
    this.teams[teamID].anzahl = 0;
    this.teams[teamID].hochrechnung = 0;

    var lastUser;

    // loop over each user and sum gesamt/ anzahl and hochrechnung
    var userCount = 0;
    for (var lineID in this.teams[teamID].users) {
      if (this.teams[teamID].users[lineID] != null && this.teams[teamID].users[lineID].user.ersatz != true && this.teams[teamID].users[lineID].anzahl != 0) {
        userCount += 1;

        // inefficent, but working
        this.teams[teamID].verein = this.teams[teamID].users[lineID].user.verein;
        this.teams[teamID].manschaft = this.teams[teamID].users[lineID].user.manschaft;
        this.teams[teamID].numberOfUsersInTeam = this.teams[teamID].users[lineID].user.manschaftAnzahlSchuetzen;
        lastUser = this.teams[teamID].users[lineID];

        this.teams[teamID].gesamt += this.teams[teamID].users[lineID].gesamt;
        this.teams[teamID].anzahl += this.teams[teamID].users[lineID].anzahl;
        this.teams[teamID].hochrechnung += this.teams[teamID].users[lineID].gesamt / this.teams[teamID].users[lineID].anzahl * numberOfShotsPerUser;
      }
    }

    if (userCount == 0 || this.teams[teamID].anzahl == 0) {
      delete this.teams[teamID];
      return true;
    }
    else {
      // calculate team schnitt
      this.teams[teamID].schnitt = 0;
      if (this.teams[teamID].anzahl > 0) {
        this.teams[teamID].schnitt = (this.teams[teamID].gesamt/ this.teams[teamID].anzahl).toFixed(1);
      }

      // TODO if zehntel is true, ...
      if (lastUser.disziplin.parts[lastUser.session.type].zehntel) {
        this.teams[teamID].hochrechnung = (Math.floor(this.teams[teamID].hochrechnung / userCount * this.teams[teamID].numberOfUsersInTeam*10) / 10).toFixed(1);
        this.teams[teamID].gesamt = (Math.floor(this.teams[teamID].gesamt*10) / 10).toFixed(1);
      }
      else {
        this.teams[teamID].hochrechnung = Math.floor(this.teams[teamID].hochrechnung / userCount * this.teams[teamID].numberOfUsersInTeam);
        this.teams[teamID].gesamt = Math.floor(this.teams[teamID].gesamt);
      }

      this.teams[teamID].progress = Math.round(this.teams[teamID].anzahl/(numberOfShotsPerUser * this.teams[teamID].numberOfUsersInTeam)*100);
    }
    return false;
  }

}

module.exports = TeamManager;
