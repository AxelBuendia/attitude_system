function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function DisplayContent(json, connexion) {
	var url = json.url;
	if (url.indexOf('https://drive.google.com/')==0){	// google drive link, tranform to public view https://drive.google.com/file/d/0B2Vh9fyhczjbVlJqT25aSWdYY28 => https://lh3.googleusercontent.com/d/0B2Vh9fyhczjbVlJqT25aSWdYY28
		var id = url.substr(url.lastIndexOf('?id=')+4);	// => https://drive.google.com/uc?export=view&id=DRIVE_FILE_ID => <iframe src="https://drive.google.com/file/d/0B2Vh9fyhczjbWDVnc0dZTmdzdjg/preview" width="640" height="480"></iframe>
//		console.log('id:'+id);
		url = 'https://drive.google.com/file/d/'+id+'/preview';
	}
	var eltId = "Content_";
	if(connexion.clientData.type != 'dramaturge')
		eltId += "player";
	else
		eltId += "dramaturge";
//	console.log(eltId);
	var contentElt = document.getElementById(eltId);
	if (contentElt !== null) contentElt.src = url;
	var lastContentElt = document.getElementById("url_actuelle");
	if (lastContentElt !== null) lastContentElt.innerHTML = url;
  console.log('Page '+url+' chargée !');
}

function InitContent(json, connexion) {
	connexion.addMessageListener('receive_content', DisplayContent);
	var pseudoElt = document.getElementById('Pseudo');
	if (pseudoElt !== null && typeof json.clientData.pseudo != 'undefined'){
		pseudoElt.innerHTML = json.clientData.pseudo;
	}
	var pseudoElt = document.getElementById('Type');
	if (pseudoElt !== null){
		pseudoElt.innerHTML = json.clientData.type;
	}
	if (typeof json.gameData !== 'undefined' && typeof json.gameData.currentContentURL !== 'undefined'){
		DisplayContent({'url':json.gameData.currentContentURL}, connexion);
	}
}

function SendContentURL(elt) {
	console.log('Send content...');
  var nouvelleURLElt = document.getElementById('url_nouvelle');
  if (typeof nouvelleURLElt !== 'undefined'){
    var url = nouvelleURLElt.value;
    CONNEXION.send({'msg':'push_content', 'url':url});
  }
}
