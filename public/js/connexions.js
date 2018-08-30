
function ConnectionErrorManager(json, connexion){
  alert('Cannot connect to '+json.error.target.url);
};

function ChangePseudo(json, connexion) {
  console.log('Error pseudo already in use!');
};


var CONNEXION = (function (){
  var _connexion;

  _connexion = new Object();
  _connexion.listeners = [];

  _connexion.callListeners = function (listeners, json) {
    for (var iListener=0; iListener<listeners.length; ++iListener){
      listeners[iListener](json, this);
    }
  };

  _connexion.addMessageListener = function (message, callback) {
    if (typeof this.listeners[message] === 'undefined'){
      this.listeners[message] = [];
    }
    this.listeners[message].push(callback);
  };

  _connexion.addMessageListeners = function (newListeners) {
    newListeners.forEach(function (newListener) {
      _connexion.addMessageListener(newListener.msg, newListener.callback);
    });
  };

  _connexion.connectToGame = function (pseudo, type, game, listeners){
    this.addMessageListener('pseudo_already_in_use', ChangePseudo);
    if(typeof listeners != 'undefined')
      this.addMessageListeners(listeners);
    this.ws.send(JSON.stringify({msg:'connect_pseudo', pseudo:pseudo, type:type, game:game}));
    this.clientData.type = type;
    this.clientData.pseudo = pseudo;
    this.clientData.gameId = game;
  };

  _connexion.send = function (json) { _connexion.ws.send(JSON.stringify(json)); };

  function _connectTo (url) {
    var webSocket = window.WebSocket || window.MozWebSocket;
    _connexion.addMessageListener('ws_error', ConnectionErrorManager);

    if(typeof exports!='undefined' && typeof exports.CFG!='undefined' && typeof exports.CFG.PORT!='undefined' && exports.CFG.PORT!='')
      url += ':'+exports.CFG.PORT;
    if(location.protocol=='https:')
      url = 'wss://'+url;
    else
      url = 'ws://'+url;
    _connexion.ws = new webSocket(url);

    _connexion.ws.onerror = function (error) {
      // an error occurred when sending/receiving data
      console.log('connection erreur :');
      console.log(error);
      if(typeof _connexion.listeners['ws_error'] !== 'undefined'){
        _connexion.callListeners(_connexion.listeners['ws_error'], {'connexion':_connexion, 'error':error});
      }
    };

    _connexion.clientData = {};

    _connexion.ws.onmessage = function (message) {
      // try to decode json (I assume that each message from server is json)
  //    console.log('Message received:'+message.data);
      try {
        var json = JSON.parse(message.data);
      } catch (e) {
        console.log('This doesn\'t look like a valid JSON: ', message.data);
        return;
      }
      // handle incoming message
  //    console.log(json);
      if(typeof json.error !== 'undefined'){
        console.error(json);
      }
      if(typeof json.msg !== 'undefined'){
        if(typeof _connexion.listeners[json.msg] !== 'undefined'){
          var listeners = _connexion.listeners[json.msg];
          _connexion.callListeners(listeners, json);
        }
      }
    };
  };

  return {
    connectTo: function (url){ _connectTo(url); },
    getConnexion: function (){ return _connexion; },
    getClientData: function (){ return _connexion.clientData; },
    addListeners: function (newListeners){ _connexion.addMessageListeners(newListeners); },
    addListener: function (message, callback){ _connexion.addMessageListener(message, callback); },
    connectAs: function (pseudo, type, game, listeners){ _connexion.connectToGame(pseudo, type, game, listeners); },
    createGame: function (pseudo, type, game, listeners){ _connexion.connectToGame(pseudo, type, game, listeners); },
    send: function (json){ _connexion.ws.send(JSON.stringify(json)); }
  }
})();
