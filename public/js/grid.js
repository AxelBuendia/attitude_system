function ChangeCouleurJetonSVG(jeton, couleurLettre){
  var couleur;
  switch(couleurLettre){
    case 'J': couleur = '#7A7720'; break;
    case 'R': couleur = '#8A181B'; break;
    case 'B': couleur = '#19688A'; break;
    case 'V': couleur = '#236D2F'; break;
    default: couleurLettre='R'; couleur = '#8A181B'; break;
  }
  for(var iClasse=1; iClasse<6; ++iClasse){
	var classe = 'SVGID_'+iClasse;
	ChangeFillSVG(jeton, classe, 'url(#'+classe+'_'+couleurLettre+')');
  }
  ChangeFillSVG(jeton, 'Couleur', couleur);
}

// {'msg':'swap_grid_token','type':'player','pseudo':connexion.pseudo,'from':evt.detail.from,'to':evt.detail.to,'count':1}
function SwapTokens(json, connexion){
  console.log('swap token');
  console.log(json);
  if(json.type != 'player') return;
  var gridTable = document.getElementById('Grids');
  if(gridTable == null) return;
  var row0 = gridTable.rows[0];
  for (var col_i=0; col_i<row0.cells.length; ++col_i){
    var tdElt = row0.cells[col_i];
    if(tdElt.innerText == json.pseudo){
      var rowFrom_i = json.from + 1;
      var rowTo_i = json.to + 1;
      var scoreFrom = parseInt(gridTable.rows[rowFrom_i].cells[col_i].innerText);
      scoreFrom -= json.count;
      var scoreTo = parseInt(gridTable.rows[rowTo_i].cells[col_i].innerText);
      scoreTo += json.count;
      gridTable.rows[rowFrom_i].cells[col_i].innerHTML = scoreFrom;
      gridTable.rows[rowTo_i].cells[col_i].innerHTML = scoreTo;
      break;
    }
  }
}

function ChangeFillSVG(svg, classe, fill){
  var doc = svg.contentDocument;
  var elts;
  var elt;
  var iElt;
  for(var iClasse in classes){
	var classe = classes[iClasse];
	elts = doc.querySelectorAll('.'+classe);
	for(iElt=0; iElt<elts.length; ++iElt){
	  elt = elts[iElt];
	  elt.style.fill = fill;
	}
  }
}

// {'msg':'deconnexion', 'type':type, 'pseudo':pseudo}
function RemovePersonGrid(json, connexion){
  if(json.type != 'player') return;
  var gridTable = document.getElementById('Grids');
  if(gridTable == null) return;
  var row0 = gridTable.rows[0];
  console.log(row0);
  for (var col_i=0; col_i<row0.cells.length; ++col_i){
    var tdElt = row0.cells[col_i];
    if(tdElt.innerText == json.pseudo){
      for (var row_i=gridTable.rows.length-1; row_i>=0; --row_i){
        var row = gridTable.rows[row_i];
        row.deleteCell(col_i);
      }
      break;
    }
  }
}

function HidePlayerGrid(cell, hide){
  var col_i = cell.cellIndex;
  var gridsRows = cell.parentNode.parentNode.rows;
  if(typeof hide === 'undefined')
    hide = !gridsRows[1].cells[col_i].classList.contains('hidden_player');
  for (var row_i=1; row_i<gridsRows.length; ++row_i){
    var cell = gridsRows[row_i].cells[col_i];
    if (hide)
      cell.classList.add('hidden_player');
    else
      cell.classList.remove('hidden_player');
  }
}

// {'msg':'connexion', 'type':json.type, 'pseudo':pseudo, 'grid':ws.clientData.grid}
function GridNewConnexion(json, connexion){
  console.log('new connexion');
  if(json.type != 'player') return;
  var gridTable = document.getElementById('Grids');
  if(gridTable == null) return;
  for (var row_i=0; row_i<gridTable.rows.length; ++row_i){
    var row = gridTable.rows[row_i];
    var cell = row.insertCell(-1);
    if(row_i == 0){
      cell.innerHTML = json.pseudo;
      cell.addEventListener('click', function (evt) {
        var hide = !evt.target.parentNode.parentNode.rows[1].cells[evt.target.cellIndex].classList.contains('hidden_player');
        CONNEXION.send({'msg':'hide_player','pseudo':evt.target.innerText,'hide':hide});
      });
    }else{
      cell.innerHTML = json.grid.elements[row_i-1].value;
    }
  }
}

//{'msg':'hide_player','pseudo':evt.target.innerText,'hide':!hidden}
function TogglePrivateGrid(json, connexion){
  console.log('hide symbol');
  console.log(json);
  // Player part
  var playerHiddenElt = document.getElementById('grid_stealth');
  if (playerHiddenElt != null){
    playerHiddenElt.classList.toggle('no_display');
  }
  // Dramaturge part
  var playerGridsElt = document.getElementById('Grids');
  if (playerGridsElt != null){
    for (var col_i=0; col_i<playerGridsElt.rows[0].cells.length; ++col_i){
      var cell = playerGridsElt.rows[0].cells[col_i];
      if(cell.innerText == json.pseudo){
        HidePlayerGrid(cell, json.hide);
        break;
      }
    }
  }
}

function InitGrid (json, connexion){
// Create tokens on the grid
  console.log('init grid');
//  console.log(json);
  if(json.clientData.type == 'player'){
    // {'msg':'init','playersPseudos':playersPseudos,'dramaturgesPseudos':dramaturgesPseudos,'clientData':ws.clientData,'gameData':this.data}
    // clientData.grid : {'elements':[{name:'Vigilance', x:180, y:200, value:7},{name:'Precaution', x:600, y:200, value:0},{name:'Audace', x:150, y:600, value:0},{name:'Concentration', x:600, y:600, value:0}], 'tokensCount':7}
    var grille = document.getElementById("Grille");
    if (grille == null) return;
/*    if(grille.contentDocument == null){
    	grille.addEventListener('load', InitGrid(json, connexion));
    	console.log('Wait for svg to fully load!');
    	return;
    }*/
    connexion.grid = json.clientData.grid;
//    console.log(grille);
    grille.contentDocument.initGrid(json.clientData.grid.elements, 0.6);
    var jeton_i = 0;
    for(var gridElt_i in json.clientData.grid.elements){
      var gridElt = json.clientData.grid.elements[gridElt_i];
      for(var token_i=0; token_i<gridElt.value; ++token_i){ 
        grille.contentDocument.createToken('Jeton'+jeton_i++, gridElt_i);
      }
    }
    // Initialize event to manage grid token swaps
    grille.contentDocument.addEventListener('swap', function (evt){
      if(evt.detail.from != evt.detail.to){
        --(connexion.grid.elements[evt.detail.from].value);
        ++(connexion.grid.elements[evt.detail.to].value);
        var json_tmp = {'msg':'swap_grid_token','type':connexion.clientData.type,'pseudo':connexion.clientData.pseudo,'from':evt.detail.from,'to':evt.detail.to,'count':1};
        connexion.send(json_tmp);
        console.log('swap from '+evt.detail.from+' to '+evt.detail.to);
      }
    });
  }else if(json.clientData.type == 'dramaturge'){
    // {'msg':'init','playersPseudos':playersPseudos,'dramaturgesPseudos':dramaturgesPseudos,'grids':grids,'gameData':this.data}
    // grids: [{'pseudo':pseudo, 'elements':elements}]
    var gridsTable = document.getElementById("Grids");
    if (gridsTable == null) return;
    var grids = json.grids;
    for (var grid_i in grids){
      var grid = grids[grid_i];
      GridNewConnexion({'type':'player', 'pseudo':grid.pseudo, 'grid':{'elements':grid.elements}});
    }
    connexion.addMessageListener('connexion', GridNewConnexion);
    connexion.addMessageListener('deconnexion', RemovePersonGrid);
    connexion.addMessageListener('swap_grid_token', SwapTokens);
    console.log(connexion.listeners);
  }
  connexion.addMessageListener('hide_player', TogglePrivateGrid);
}
