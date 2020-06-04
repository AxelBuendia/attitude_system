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

//*********************************************************************************//
//************************* ATTITUDE SERVER ***************************************//
//*********************************************************************************//

wss.serverData = {};

wss.getCurrentGames = function (){
  var games = [];
  this.clients.forEach(function (ws) {
    if (typeof ws.clientData.gameId != 'undefined' && !games.includes(ws.clientData.gameId)){
      games.push(ws.clientData.gameId);
    }
  });
  return games;
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

wss.manageNewPseudo = function (json, ws) {
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
    var gameData = this.serverData.games[ws.clientData.gameId];
    if(typeof json.pseudo !== 'undefined'){
      ws.clientData.pseudo = json.pseudo;
      var playersPseudos = this.getPseudos('player', json.game);
      var dramaturgesPseudos = this.getPseudos('dramaturge', json.game);
      if(ws.clientData.type == 'player'){
        ws.clientData.grid = { 'elements':[{name:'Vigilance', x:25, y:354, value:7},{name:'AudacePerformance', x:920, y:411, value:0},{name:'AudaceBetAgainst', x:1529, y:414, value:0},{name:'Precaution', x:237, y:801, value:0},{name:'AudaceRapidite', x:897, y:802, value:0},{name:'AudaceRuse', x:1536, y:782, value:0},{name:'Concentration1', x:243, y:1291, value:0},{name:'Concentration2', x:884, y:1291, value:0},{name:'Concentration3', x:1538, y:1291, value:0}], 'tokensCount':7};
        ws.send(JSON.stringify({'msg':'init','playersPseudos':playersPseudos,'dramaturgesPseudos':dramaturgesPseudos,'clientData':ws.clientData,'gameData':gameData}));
      }else if(ws.clientData.type == 'dramaturge'){
        var grids = this.getPlayerGrids(json.game);
        var dataJSON = {'msg':'init','playersPseudos':playersPseudos,'dramaturgesPseudos':dramaturgesPseudos,'clientData':ws.clientData,'gameData':gameData};
        dataJSON.grids = grids;
        //console.log(dataJSON);
        var data = JSON.stringify(dataJSON);
        //console.log(data);
        ws.send(data);
      }else{
        ws.send(JSON.stringify({'msg':'init','clientData':ws.clientData,'gameData':gameData}));
      }
      playersPseudos = null;
      dramaturgesPseudos = null;
      this.broadcast(JSON.stringify({'msg':'connexion', 'type':ws.clientData.type, 'pseudo':ws.clientData.pseudo, 'grid':ws.clientData.grid}), [ws.clientData.pseudo]);
      console.log(ws.clientData.type+' ['+ws.clientData.pseudo+'] connecté');
    }else{
      ws.send(JSON.stringify({'msg':'init','clientData':ws.clientData,'gameData':gameData}));
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
  var currentGames = this.getCurrentGames();
  ws.send(JSON.stringify({'msg':'games_list', 'games':currentGames}));
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
        console.log("ping received from "+ws.clientData.pseudo);
        ws.send(JSON.stringify({'msg':'pong'}));
      break;
      case 'connect_pseudo':
        // New game
        if(!wss.getCurrentGames().includes(json.game)){
          if(typeof wss.serverData.games=='undefined'){
            wss.serverData.games = [];
          }
          if(typeof wss.serverData.games[json.game] == 'undefined'){
            wss.serverData.games[json.game] = {};
          }
        }
        wss.manageNewPseudo(json, this);
      break;
      case 'push_content':
//        console.log('content has been pushed');
        wss.broadcast(JSON.stringify({'msg':'receive_content', 'url':json.url}));
        wss.serverData.games[this.clientData.gameId].currentContentURL = json.url;
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
          wss.broadcast(message);
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
    wss.broadcast(JSON.stringify({'msg':'deconnexion', 'type':type, 'pseudo':pseudo}));
  });

  ws.on('error', function(error){
    console.log('Socket erreur :');
    console.log(error);
  });

});

var chronoStart = 60;
var chrono = chronoStart;

function chronometre(){
  if(chrono>0){
    --chrono;
    wss.broadcast(JSON.stringify({'time':chrono}));
    setTimeout(chronometre, 1000);
  }
}

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
