var express = require("express");
var http = require("http");
var config = require("./config/");
var SocketClient = require("socket.io-client");
var http = require("http");
var child_process = require("child_process");
var mongodb = require("./lib/mongodb.js");
var request = require('request');



// -------- Server Socket --------
var app = express({ strict: true });
var server = http.Server(app);
var io = require("socket.io")(server);
// Delay start of the public api a bit, to make sure we cached each line
setTimeout(function(){
	server.listen(config.network.port, config.network.address);
}, 2000);
server.on("listening", function() {
	console.log("[INFO] DSC-Gateway started (%s:%s)", server.address().address, server.address().port);
});



// --------- relay connection handling -------
io.on("connection", function(socket){
	// send online DSCs to new connected client
	sendOnlineLines(socket);

	// send the online lines to the line
	socket.on("getLines", function(){
		sendOnlineLines(socket);
	});

	if (config.permissions.setLine) {
		// triggers any given event on DSC
		socket.on("setLine", function(data){
			var line = config.lines[data.line];
			if (line != undefined){
				var lineSocket = line.socket;
				if (lineSocket != undefined){
					lineSocket.emit(data.method, data.data);
				}
			}
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
});








// -------- Line Sockets --------

// store bool for each line id (true = online)
var linesOnline = {};

function registerAllLines(){
	for (var id in config.lines){
		registerLine(id);
	}
}



// Register line with id
function registerLine(id){
	var line = config.lines[id];

	linesOnline[id] = {};
	linesOnline[id].id = id;
	linesOnline[id].label = line.label;
	linesOnline[id].ip = line.ip;
	linesOnline[id].port = line.port;
	linesOnline[id].labelShort = line.labelShort;
	linesOnline[id].online = false;
	linesOnline[id].cache = {};

	config.lines[id].socket = SocketClient("http://"+line.ip+":"+line.port);

	// redirect following methods
	var methods = ["setConfig", "setData"];
	for (var i in methods){
		setUpEvent(config.lines[id].socket, methods[i]);
	}
	setUpConnection(config.lines[id].socket);

	// set up socket event method
	function setUpEvent(socket, method){
		socket.on(method, function(data){
			linesOnline[id].cache[method] = data;

			if (method == "setData" && config.database.enabled){
				if (data !== undefined && collection !== undefined){
					collection.update(
						{"_id" : data._id},
						data,
						{upsert: true, unique: true},
						function() {}
					);
				}
			}

			updateTeam(data, line._id);

			// Depricated
			io.emit(method, {
				line: line._id,
				data: data,
			});
			// Send event directly to room with id_method
			io.emit(line._id + "_" + method, data);
		});
	}

	// set up connection methods
	function setUpConnection(socket){
		socket.on("connect", function(){
			console.log("[INFO] "+id+" connected");
			linesOnline[id].online = true;
			socket.emit("getData", {});
			socket.emit("getConfig", {});
			updateDB(id);
			setTimeout(function(){
				sendOnlineLines(io);
			}, 2000);
		});
		socket.on("disconnect", function(){
			console.log("[INFO] "+id+" disconnected");
			linesOnline[id].online = false;
			clearLine(id, null);
			sendOnlineLines(io);
		});
	}
}

// send online lines event to socket or broadcast to all clients
function sendOnlineLines(socket){
	socket.emit("onlineLines", {
		lines: linesOnline,
		teams: teams,
	});
}





// MARK: Teams

var teams = {};

// todo
// add reserve flag into session.user

function updateTeam(data, lineID) {
	if (
		data.user == null ||
		data.user.verein == null || data.user.verein == "" ||
		data.user.manschaft == null || data.user.manschaft == "" ||
		data.user.manschaftAnzahlSchuetzen == null || data.user.manschaftAnzahlSchuetzen == "" ||
		data.user.firstName == null || data.user.firstName == ""
	) {
		if (clearLine(lineID, null)) {
			sendOnlineLines(io);
		}
		return;
	}

	var teamID = data.user.verein + "_" + data.user.manschaft;
	var session = data.sessionParts[data.sessionIndex];
	var updateAllTeams = false;

	clearLine(lineID, teamID);

	// init new team
	if (teams[teamID] == null) {
		teams[teamID] = {
			teamID: teamID,
			gesamt: 0,
			anzahl: 0,
			progress: 0,
			hochrechnung: 0,
			users: {},
		};

		updateAllTeams = true;
	}

	teams[teamID].users[lineID] = {
		user: data.user,
		gesamt: session.gesamt, // TODO remove
		anzahl: session.anzahl, // TODO remove
		session: session,
		disziplin: data.disziplin,
	};

	if (recalculateTeam(teamID)) {
		updateAllTeams = true;
	}

	if (updateAllTeams) {
		sendOnlineLines(io);
	}
	else {
		// Depricated
		io.emit("setTeam", {
			team: teams[teamID],
		});
		io.emit(teamID + "_setTeam", {
			team: teams[teamID],
		});
	}
}


/**
 Remove given lineID from every team which is not the given teamID.
 Returns true if something changed
 */
function clearLine(lineID, teamID) {
	var changed = false;
	for (var t in teams) {
		if (t != teamID) {
			if (teams[t] != null) {
				if (teams[t].users[lineID] != null) {
					delete teams[t].users[lineID];
					recalculateTeam(t);
					changed = true;
				}
			}
		}
	}
	return changed;
}


/**
 Calculate metadata of oure teams
 */
function recalculateTeam(teamID) {
	var numberOfShotsPerUser = 40; // TODO

	// reset counts
	teams[teamID].gesamt = 0;
	teams[teamID].anzahl = 0;
	teams[teamID].hochrechnung = 0;

	var lastUser;

	// loop over each user and sum gesamt/ anzahl and hochrechnung
	var userCount = 0;
	for (var lineID in teams[teamID].users) {
		if (teams[teamID].users[lineID] != null && teams[teamID].users[lineID].user.ersatz != true && teams[teamID].users[lineID].anzahl != 0) {
			userCount += 1;

			// inefficent, but working
			teams[teamID].verein = teams[teamID].users[lineID].user.verein;
			teams[teamID].manschaft = teams[teamID].users[lineID].user.manschaft;
			teams[teamID].numberOfUsersInTeam = teams[teamID].users[lineID].user.manschaftAnzahlSchuetzen;
			lastUser = teams[teamID].users[lineID];

			teams[teamID].gesamt += teams[teamID].users[lineID].gesamt;
			teams[teamID].anzahl += teams[teamID].users[lineID].anzahl;
			teams[teamID].hochrechnung += teams[teamID].users[lineID].gesamt / teams[teamID].users[lineID].anzahl * numberOfShotsPerUser;
		}
	}

	if (userCount == 0 || teams[teamID].anzahl == 0) {
		delete teams[teamID];
		return true;
	}
	else {
		// calculate team schnitt
		teams[teamID].schnitt = 0;
		if (teams[teamID].anzahl > 0) {
			teams[teamID].schnitt = (teams[teamID].gesamt/ teams[teamID].anzahl).toFixed(1);
		}

		// TODO if zehntel is true, ...
		if (lastUser.disziplin.parts[lastUser.session.type].zehntel) {
			teams[teamID].hochrechnung = (Math.floor(teams[teamID].hochrechnung / userCount * teams[teamID].numberOfUsersInTeam*10) / 10).toFixed(1);
			teams[teamID].gesamt = (Math.floor(teams[teamID].gesamt*10) / 10).toFixed(1);
		}
		else {
			teams[teamID].hochrechnung = Math.floor(teams[teamID].hochrechnung / userCount * teams[teamID].numberOfUsersInTeam);
			teams[teamID].gesamt = Math.floor(teams[teamID].gesamt);
		}

		teams[teamID].progress = Math.round(teams[teamID].anzahl/(numberOfShotsPerUser * teams[teamID].numberOfUsersInTeam)*100);
	}
	return false;
}





// MARK: DB

// fetch all new session from line, while server was offline
function updateDB(id){
	if (config.database.enabled == false) {
		return;
	}

	collection.find({"$or": [{"line": id}]}).sort({date:-1}).limit(1).skip(1).toArray(function (err, data) {
		if (err){
			console.log(err);
		}
		if (data.length >= 1) {
			loadFromLineSince(id, data[0].date);
		}
		else {
			loadFromLineSince(id, 0);
		}
	});
}
function loadFromLineSince(id, date){
	var line = linesOnline[id];

	request.get("http://" + line.ip + ":" + line.port + "/api/data?limit=1000&sinceDate=" + date, function (error, response) {
		var data = JSON.parse(response.body);
		for (var i in data){
			collection.update(
				{"_id" : data[i]._id},
				data[i],
				{upsert: true, unique: true},
				function() {}
			);
		}
	});
}




// ------ Main init ------
var collection;
if (config.database.enabled) {
	mongodb(function(dbCollection){
		collection = dbCollection;
		registerAllLines();
	});
}
else {
	registerAllLines();
}
