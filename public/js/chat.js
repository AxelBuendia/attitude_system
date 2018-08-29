function SendMessage(connexion){
  var msgDiv = document.getElementById('Message');
  var msg = msgDiv.innerHTML;
  var currentTime = new Date().toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
  var personsElt = document.getElementById('Personnes');
  var to = GetCheckedPersons(personsElt);
  connexion.send({'msg':'chat_msg','time':currentTime,'message':msg,'from':connexion.getClientData().pseudo,'to':to});
  msgDiv.innerHTML = '';
}

function RevealRecipients(elt) {
  if (typeof elt.dataset.to !== 'undefined'){
    var toDecoded = decodeURI(elt.dataset.to);
    try {
      var to = JSON.parse(toDecoded);
    } catch (e) {
      console.log('This doesn\'t look like a valid JSON: ', toDecoded);
      return false;
    }
    var chatElt = document.getElementById('Personnes');
    if(chatElt != null){
      for (var i=chatElt.children.length-1; i>=0; --i) {
        var child = chatElt.children[i];
        if (typeof child.dataset.clientPseudo !== 'undefined' && child.tagName == 'LABEL'){
          if(to.persons.indexOf(child.dataset.clientPseudo)>=0){
            child.classList.add('reveal');
          }
        }
      }
    }
  }
  return false;
}

function HideRecipients(elt) {
  var chatElt = document.getElementById('Personnes');
  if(chatElt != null){
    for (var i=chatElt.children.length-1; i>=0; --i) {
      var child = chatElt.children[i];
      if (typeof child.dataset.clientPseudo !== 'undefined' && child.tagName == 'LABEL'){
        child.classList.remove('reveal');
      }
    }
  }
  return false;
}

function ReceiveMessage(json, connexion) {
//  console.log('Message received');
  var HistoryDiv = document.getElementById('History');
  var to = json.to.all ? 'all' : json.to.persons.length>1 ? '...' : json.to.persons[0];
  var align = json.from == connexion.clientData.pseudo ? 'left' : 'right';
  var toEncoded = encodeURI(JSON.stringify(json.to));
  HistoryDiv.innerHTML = '<div class="chat_message" align="'+align+'" onmouseover="RevealRecipients(this);" onmouseout="HideRecipients();" data-to="'+toEncoded+'">'+json.time + ' [' + json.from + '->'+to+'] : '+json.message+'</div><br/>' + HistoryDiv.innerHTML;
}

function GetCheckedPersons(elt) {
  var totalPersons = 0;
  var persons = [];
  for (var i=elt.children.length-1; i>=0; --i) {
    var child = elt.children[i];
    if (typeof child.dataset.clientPseudo !== 'undefined' && child.tagName == 'INPUT'){
      ++totalPersons;
      if(child.checked)
        persons.push(child.dataset.clientPseudo);
    }
  }
  var all = persons.length==totalPersons;
  return { 'all':all, 'persons':persons };
}

function AddPersons(elt, tab, type, exceptPseudo) {
  for (var i in tab) {
    var pseudo = tab[i];
    if(pseudo == exceptPseudo) continue;
//    console.log('add entity to chat :'+pseudo);
    AddPerson(elt, pseudo, type);
  }
}

function AddPerson(elt, pseudo, type) {
  console.log('add '+pseudo+'/'+type+' to chat!');
  var newInputElt = document.createElement('input');
  newInputElt.type = 'checkbox';
  newInputElt.checked = true;
  newInputElt.id = 'chat_cbox_'+pseudo;
  newInputElt.dataset.clientPseudo = pseudo;
  var newLabelElt = document.createElement('label');
  newLabelElt.classList.add('chat',type);
  newLabelElt.id = 'chat_lbl_'+pseudo;
  newLabelElt.setAttribute('for', newInputElt.id); 
  newLabelElt.innerHTML = pseudo;
  newLabelElt.dataset.clientPseudo = pseudo;
  elt.appendChild(newInputElt);
  elt.appendChild(newLabelElt);
}

// {'msg':'deconnexion', 'type':type, 'id':index}
function RemovePerson(json, connexion) {
  var chatElt = document.getElementById('Personnes');
  if(chatElt != null){
    var pseudo = json.pseudo;
    for (var i=chatElt.children.length-1; i>=0; --i) {
      var child = chatElt.children[i];
      if (typeof child.dataset.clientPseudo !== 'undefined' && child.dataset.clientPseudo == pseudo){
        child.remove();
      }
    }
  }
}

// {'msg':'connexion', 'type':json.type, 'id':iPseudo, 'pseudo':pseudo, 'grid':ws.clientData.grid}
function NewPerson(json, connexion) {
  var chatElt = document.getElementById('Personnes');
  if(chatElt != null)
    AddPerson(chatElt, json.pseudo, json.id, json.type);
}

// 'playersPseudos':playersPseudos,'dramaturgesPseudos':dramaturgesPseudos
function InitChat(json, connexion) {
  console.log('init chat');
  var chatElt = document.getElementById('Personnes');
  while(chatElt.lastChild)
    chatElt.lastChild.remove();
  AddPersons(chatElt, json.playersPseudos, 'player', connexion.clientData.pseudo);
  AddPersons(chatElt, json.dramaturgesPseudos, 'dramaturge', connexion.clientData.pseudo);
  connexion.addMessageListener('connexion', NewPerson);
  connexion.addMessageListener('deconnexion', RemovePerson);
  connexion.addMessageListener('chat_msg', ReceiveMessage);
}