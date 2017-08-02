/**
 */
class OnlineLines {
  constructor(lines, teams, staticContent) {
    this.lines = {};
    if (lines != null) this.lines = lines;

    this.teams = {};
    if (teams != null) this.teams = teams;

    this.staticContent = {};
    if (staticContent != null) this.staticContent = staticContent;
  }
}
module.exports = OnlineLines;
