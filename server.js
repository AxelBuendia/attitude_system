//************************************************************************//
//************************* DOTENV ***************************************//
//************************************************************************//
require('dotenv').config();
// Manage for glitch.com
const PORT = process.env.PORT;
//console.log(process.env);

//********************************************************************************//
//************************* EXPRESS SERVER ***************************************//
//********************************************************************************//
//import * as express from 'express';
//import * as http from 'http';
//import * as WebSocket from 'ws';
const express = require('express')
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({'server':server});
const fs = require('fs');
const GAMES_DIR = "./games";

//*********************************************************************************//
//************************* ATTITUDE SERVER ***************************************//
//*********************************************************************************//

wss.getSavedGamesList = function (){
	var savedGamesList = [];
	try{
		var dir = fs.opendirSync(GAMES_DIR);

		while(file = dir.readSync()){
			if(file.isFile()){
				savedGamesList.push(file.name);
			}
		}
	}catch(e){
		console.error(e);
	}
	return savedGamesList;
};

wss.serverData = {};
wss.serverData.savedGamesList = wss.getSavedGamesList();

wss.loadSavedGameByName = function (id){
	try{
		return JSON.parse(fs.readFileSync(GAMES_DIR+'/'+id, 'utf8'));
	}catch(e){
		console.error(e);
		return {};
	}
};

wss.getCurrentGamesList = function (originalWS, doublon){
	if(typeof doublon == 'undefined')
		doublon = false;
  var games = [];
  this.clients.forEach(function (ws) {
    if (ws != originalWS && typeof ws.clientData.gameId != 'undefined' && (doublon || !games.includes(ws.clientData.gameId))){
      games.push(ws.clientData.gameId);
    }
  });
  return games;
};

wss.saveGame = function (id, data) {
	try{
		fs.writeFileSync(GAMES_DIR+'/'+id, JSON.stringify(data));
	}catch(e){
		console.error(e);
	}
};

wss.cleanGames = function (ws) {
	if(typeof ws.clientData != 'undefined' && typeof ws.clientData.gameId != 'undefined'){
		var gameId = ws.clientData.gameId;
		var gamesList = this.getCurrentGamesList(ws, true);
		if(!gamesList.includes(gameId)){	// no one left on this game so save it
			var game = this.serverData.games[gameId];
			if(typeof game != 'undefined'){
				this.saveGame(gameId, game);
			}
		}
	}
};

wss.checkPseudo = function (pseudo, gameId, ws) {
  for(var i in this.clients){
    var _ws = this.clients[i];
    if (_ws != ws && ws.clientData.pseudo == pseudo && ws.clientData.gameId == gameId){
      //console.log('Client '+i+' with data '+ws.clientData.pseudo);
      return {'entityIndex':i, 'type':ws.clientData.type};
    }
  }
  return {'entityIndex':-1};
};

wss.getPseudos = function (type, gameId) {
  var pseudos = new Array();
  this.clients.forEach(function (ws) {
    if(typeof ws.clientData !== 'undefined' && typeof ws.clientData.pseudo !== 'undefined' && ws.clientData.pseudo !== null && (typeof type === 'undefined' || type == ws.clientData.type) && typeof ws.clientData.gameId != 'undefined' && ws.clientData.gameId == gameId){
      pseudos.push(ws.clientData.pseudo);
    }
  });
  if (typeof type === 'undefined' || type == 'observer')
    pseudos.push('observer');
  return pseudos;
};

wss.getPlayerData = function(pseudo, game) {
	if(typeof game.players == 'undefined')	// first player added
		game.players = [];
	if(typeof game.players[pseudo] == 'undefined')	// unknown player so create an empty one
		game.players[pseudo] = {};
	return game.players[pseudo];
};

wss.getPlayerGrids = function (gameId) {
  var grids = [];
  this.clients.forEach(function (ws){
    if(typeof ws.clientData !== 'undefined' && ws.clientData.type == 'player' && typeof ws.clientData.grid !== 'undefined' && typeof ws.clientData.pseudo !== 'undefined' && ws.clientData.pseudo != null && ws.clientData.gameId == gameId){
      grids.push({'pseudo':ws.clientData.pseudo, 'elements':ws.clientData.grid.elements});
    }
  });
  return grids;
};

wss.urlParametersToJSon = function (url) {
  var json = {};
  var parameters = url.substr(url.indexOf('?')+1).split('&');
  for (var p in parameters){
    var parameter = parameters[p].split('=');
    json[parameter[0]] = parameter[1];
  }
  return json;
};

wss.broadcast = function (data, exceptions) {
  this.clients.forEach(function (ws){
    if (typeof exceptions === 'undefined' || exceptions.indexOf(ws.clientData.pseudo) == -1)
      ws.send(data);
  });
};

wss.broadcastToGame = function (data, gameId, exceptions) {
  this.clients.forEach(function (ws){
    if ((ws.clientData.gameId==gameId) && (typeof exceptions === 'undefined' || exceptions.indexOf(ws.clientData.pseudo) == -1))
      ws.send(data);
  });
};

wss.broadcastToType = function (type, data) {
  this.clients.forEach(function (ws){
    if (typeof ws.clientData.type !== 'undefined' && ws.clientData.type == type){
      ws.send(data);
    }
  });
};

wss.broadcastToList = function (list, data) {
  this.clients.forEach(function (ws){
    if (typeof ws.clientData.pseudo !== 'undefined' && list.indexOf(ws.clientData.pseudo)>=0)
      ws.send(data);
  });
};

wss.sendTo = function (ws, data) {
  ws.send(data);
};

wss.manageNewPseudo = function (json, ws, gameData) {
	// check if the pseudo is already in use
  var iPseudo = -1;
  if (typeof json.pseudo !== 'undefined'){
    var entity = this.checkPseudo(json.pseudo, json.game, ws);
    iPseudo = entity.entityIndex;
  }
  if(iPseudo>-1){
    ws.send(JSON.stringify({'msg':'pseudo_already_in_use', 'pseudo':json.pseudo}));
    console.log('Pseudo '+json.pseudo+' déjà utilisé par le '+iPseudo+'e pseudo dans le jeu '+json.game);
  }else{
    ws.clientData.type = json.type.toLowerCase();
    ws.clientData.gameId = json.game;
    var gridDefinition = { 'elements':[{name:'Vigilance', x:235, y:354, value:7},{name:'AudacePerformance', x:920, y:411, value:0},{name:'AudaceBetAgainst', x:1529, y:414, value:0},{name:'Precaution', x:237, y:801, value:0},{name:'AudaceRapidite', x:897, y:802, value:0},{name:'AudaceRuse', x:1536, y:782, value:0},{name:'Concentration1', x:243, y:1291, value:0},{name:'Concentration2', x:884, y:1291, value:0},{name:'Concentration3', x:1538, y:1291, value:0}], 'tokensCount':7};
    if(typeof json.pseudo !== 'undefined'){
      ws.clientData.pseudo = json.pseudo;
      var playersPseudos = this.getPseudos('player', json.game);
      var dramaturgesPseudos = this.getPseudos('dramaturge', json.game);
      if(ws.clientData.type == 'player'){
        ws.clientData.grid = gridDefinition;
        // Set player data from game
        ws.clientData.player = wss.getPlayerData(json.pseudo);
        ws.send(JSON.stringify({'msg':'init','playersPseudos':playersPseudos,'dramaturgesPseudos':dramaturgesPseudos,'clientData':ws.clientData,'currentContentURL':gameData.currentContentURL,'playerData':ws.clientData.player}));
      }else if(ws.clientData.type == 'dramaturge'){
        var grids = this.getPlayerGrids(json.game);
        var dataJSON = {'msg':'init','playersPseudos':playersPseudos,'dramaturgesPseudos':dramaturgesPseudos,'clientData':ws.clientData,'currentContentURL':gameData.currentContentURL,'gameData':gameData};
        dataJSON.grids = grids;
        dataJSON.gridDefinition = gridDefinition;
        //console.log(dataJSON);
        var data = JSON.stringify(dataJSON);
        //console.log(data);
        // Set dramaturge data (common to all dramaturges)
        ws.clientData.game = gameData;
        ws.send(data);
      }else{	// connected is an observer
        ws.send(JSON.stringify({'msg':'init','clientData':ws.clientData,'currentContentURL':gameData.currentContentURL,'gameData':gameData}));
      }
      playersPseudos = null;
      dramaturgesPseudos = null;

      this.broadcastToGame(JSON.stringify({'msg':'connexion', 'type':ws.clientData.type, 'pseudo':ws.clientData.pseudo, 'grid':ws.clientData.grid}), ws.clientData.gameId, [ws.clientData.pseudo]);
      console.log(ws.clientData.type+' ['+ws.clientData.pseudo+'] connecté');
    }else{	// Observer
      ws.send(JSON.stringify({'msg':'init','clientData':ws.clientData,'currentContentURL':gameData.currentContentURL,'gameData':gameData}));
      console.log(ws.clientData.type+' connecté');
    }
  }
};

wss.on('error', function(error){
  console.log('Serveur erreur :');
  console.log(error);
});

wss.on('connection', function(ws) {
//  console.log('connection reçue');
//  var parameters = this.urlParametersToJSon(ws.upgradeReq.url);
  ws.clientData = {};
  // send the current games as return message
  var currentGamesList = this.getCurrentGamesList();
  var savedGamesList = this.savedGamesList;
  ws.send(JSON.stringify({'msg':'games_list', 'games':currentGamesList, 'savedGames':this.serverData.savedGamesList}));
//  this.manageNewPseudo(parameters, ws);
//  console.log(ws);
  
  ws.broadcast = function (tab, data) {
    for(var i in tab){
      if(tab[i] != null){
        var otherWs = tab[i].ws; 
        if(otherWs != undefined && otherWs != null && otherWs != this) otherWs.send(data);
      }
    }
  };

  ws.on('message', function(message) {
//    console.log('message received:'+message);
    try {
      var json = JSON.parse(message);
    } catch (e) {
      console.log('Invalide JSON: ', message);
      return;
    }
//    console.log(json);
    switch(json.msg){
      case 'ping':
        console.log("ping received from "+this.clientData.pseudo);
        this.send(JSON.stringify({'msg':'pong'}));
      break;
      case 'pong':
        console.log("pong received from "+this.clientData.pseudo);
        clearTimeout(ws.pong);
      break;
      case 'connect_pseudo':
        // New game
        if(!wss.getCurrentGamesList().includes(json.game)){
        	if(json.type.toLowerCase() == 'dramaturge'){	// only dramaturge can create / load a game
	          if(typeof wss.serverData.games=='undefined'){
  	          wss.serverData.games = [];
    	      }
      	    if(typeof wss.serverData.games[json.game] == 'undefined'){
        	    wss.serverData.games[json.game] = wss.loadSavedGameByName(json.game);
          	}
		        wss.manageNewPseudo(json, this, wss.serverData.games[json.game]);
          }else{
          	this.send(JSON.stringify({'error':'Only dramaturge can create/load a game!'}));
          }
        }else{
	        wss.manageNewPseudo(json, this);
        }
      break;
      case 'push_content':
      	if(this.clientData.type == 'dramaturge'){
      		//        console.log('content has been pushed');
        	wss.broadcastToGame(JSON.stringify({'msg':'receive_content', 'url':json.url}), this.clientData.gameId);
        	wss.serverData.games[this.clientData.gameId].currentContentURL = json.url;
        }
      break;
      case 'swap_grid_token':
        wss.broadcastToType('dramaturge', message);
      break;
      case 'hide_player'://{'msg':'hide_player','pseudo':evt.target.innerText,'hide':!hidden}
        wss.broadcastToList([json.pseudo], message);
        wss.broadcastToType('dramaturge', message);
      break;
      case 'chat_msg':
        if (json.to.all){
          wss.broadcastToGame(message, this.clientData.gameId);
        }else{
          wss.broadcastToList(json.to.persons, message);
          this.send(message);
        }
      break;
    } 
  });

  ws.on('close', function(code, message){
    var type = this.clientData.type;
    var pseudo = (typeof this.clientData.pseudo === 'undefined') ? 'observer' : this.clientData.pseudo;
    console.log(type+' ['+pseudo+'] s\'est déconnecté');
    wss.broadcastToGame(JSON.stringify({'msg':'deconnexion', 'type':type, 'pseudo':pseudo}), this.clientData.gameId);
    clearInterval(this.ping);
    wss.cleanGames(this);
    ws.ping = null;
  });

  ws.on('error', function(error){
    console.log('Socket erreur :');
    console.log(error);
  });

  ws.ping = setInterval(function(){
    console.log("ping send to "+ws.clientData.pseudo);
    ws.send(JSON.stringify({'msg':'ping'}));
    ws.pong = setTimeout(function(){
    	console.log("Not responding to ping, so close ["+ws.clientData.pseudo+"]");
    	ws.close();
    }, 5000);
  }, 55000);

});

//************************************************************************//
//************************* ROUTING **************************************//
//************************************************************************//
// static files in public
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

const LISTENER = server.listen(PORT, function(){ console.log('Attitude Server is listening on port '+LISTENER.address().port+'!'); });
