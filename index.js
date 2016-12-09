document.addEventListener("DOMContentLoaded", script, false);


function script(){
    
    console.log("bienvenue dans ccimport");

	var cozyEvents = [];
    var year, month;
    
	//liste des strings pour les messages de statut
	var statusMsg = ["Chargement","Fichier invalide","Fichier chargé","Choisir un fichier","Erreur de lecture","Importation réussie","Erreur d'importation"];

	
    //récupération des éléments du DOM
	var status = document.querySelector("#status"),
        status2 = document.querySelector("#status2"),
        status3 = document.querySelector("#status3"),
		fileform = document.querySelector("#file-form"),
		fileInput = document.querySelector("#file-input");
   
    
    
	//API File HTML5
	var reader = new FileReader();
	reader.addEventListener("load", fileLoaded);
	reader.addEventListener("error", fileError);


	//message de statut initial
	status.textContent = statusMsg[3];

	
    //écouteur d'évènement submit sur le <form>
	fileform.addEventListener("submit", function(e){
		e.preventDefault();
		window.fileInput = fileInput;//debug
		if (fileInput.files.length === 0){//si aucun fichier n'est sélectionné
			status.textContent = statusMsg[3];//afficher une erreur
			//status.classList.add("error");
            warning_sts();
		} else {//sinon lire le fichier en mode texte
			reader.readAsText(fileInput.files[0]);//déclenchera fileLoaded, ou fileError
			status.textContent = statusMsg[0];
			//status.classList.remove("error");
            ok_sts();
		}
	}, false);
    
    

    function warning_sts(){
        status.removeAttribute("class");
        status.classList.add("alert");
        status.classList.add("alert-warning");
    }
    
    function ok_sts(){
        status.removeAttribute("class");
        status.classList.add("alert");
        status.classList.add("alert-success");
    }
    

	function fileLoaded(){//quand le fichier est chargé
		status.textContent = statusMsg[2];
		//status.classList.remove("error");
        ok_sts();
		window.filecontent = reader.result;//debug

		var parser = new DOMParser();//createion d'un DOM à partir de la string xml
		var xmlDoc = parser.parseFromString(reader.result, "text/xml");

		window.xml = xmlDoc;//debug

		if (checkXML(xmlDoc)){//vérification du xml
			//status.textContent = statusMsg[5];
			//status.classList.remove("error");
            //ok_sts();            
			//debug();
            createPlanning(xmlDoc);//création du planning
		} else {//sinon affiche fichier invalide
			status.textContent = statusMsg[1];
			//status.classList.add("error");
            warning_sts();
           
		}


	}

	function fileError(){//erreur de lecture du fichier
		status.textContent = statusMsg[4];
		//status.classList.add("error");
        warning_sts();

	}

	function checkXML(xmlDoc){//fonction de vérif du xml chopeCrew
		var xmlDoc = xmlDoc;
		//quand le parseXMl s'est mal passé, la fonction renvoie un doc Xml avec
		//une balise <parsererror>
		if (xmlDoc.querySelector("parsererror") !== null){
			return false;
		} else if (xmlDoc.querySelector("planning") === null){//vérif de la présence de la balise <planning> --> xml chopeCrew
			return false;
		} else {
			return true;
		}
	}

	function createPlanning(xmlDoc){

		window.planningXml = xmlDoc;
		var planningXml = xmlDoc;

		year = planningXml.querySelector("planning").getAttribute("mois").slice(3);
        month = planningXml.querySelector("planning").getAttribute("mois").slice(0,2);
        year = parseInt(year);
        month = parseInt(month) - 1;
      
       
        var sols = planningXml.querySelectorAll("sol");
        var rotations = planningXml.querySelectorAll("rotation");
        
        rotations.forEach(function(rotation){
            
            cozyEvents = cozyEvents.concat(extractFlights(rotation));
            
            var startDay = firstSvDate(rotation),
                endDay = lastSvDate(rotation);
            var details = extractDetails(rotation);
            var rotation = JSON.parse(xml2json(rotation,"")).rotation;
         
            
            var cozyrot = {
                docType         : "event",
                start           : startDay.format().slice(0,10),
                end             : endDay.format().slice(0,10),
                place           : "",
                details         : details,
                description     : "Rotation " + rotation.rotationId,
                rrule           : "",
                tags            : ["vol","af"],
                attendees       : [],
                related         : "",
                timezone        : "UTC",
                alarms          : [],
                created         : new Date().toDateString(),
                lastModification: "",
            };
                
            //console.log(cozyrot);
            cozyEvents.push(cozyrot);
            
        });
        
        sols.forEach(function(sol){
            
            cozyEvents.push(extractSol(sol));
            
        });
        
        console.log(cozyEvents);
        //décommenter avant de commit
        eraseEvents().then(function(){
            importInCozy();
        });
    }
    
    
    function extractDetails(xmlDoc){
        var type = xmlDoc.nodeName.toLowerCase();
        var details_str = "";
        
        switch(type){
            case "rotation":
                var rotation = JSON.parse(xml2json(xmlDoc,"")).rotation;
                var equipage = "";
                if (rotation.listPeqRot.peqRot){
                	if (rotation.listPeqRot.peqRot.forEach){//s'il y a plusieurs nom (table)
	            	    rotation.listPeqRot.peqRot.forEach(function(peq){
	                	    equipage += peq.fab.toUpperCase() + ": " + peq.nom + " " + peq.prenom + "\n";
	                	});
	                } else {//s'il y a un seul nom
                        var peq = rotation.listPeqRot.peqRot;
	                	equipage += peq.fab.toUpperCase() + ": " + peq.nom + " " + peq.prenom + "\n";
	                }
            	}
                details_str += "Equipage de la rotation: \n" + equipage;
                return details_str;
                
            case "vol":
                var vol = JSON.parse(xml2json(xmlDoc,"")).vol;
                window.vol = vol;
                details_str += "Départ UTC: " + vol.from + " à " + vol.dep + " (" + vol.lagFrom + ")";
                details_str += "\nArrivée UTC: " + vol.to + " à " + vol.arr + " (" + vol.lagTo + ")";
                details_str += "\n\nAvion: \n type: " + vol.type + "\n version: " + vol.version; 
                
                var equipage = "";
                if (vol.listPeq.peq.forEach){
	                vol.listPeq.peq.forEach(function(peq){
	                    if(peq.fab  !== null){
	                        equipage += peq.fab + ": " + peq.nom + " " + peq.prenom + "\n";
	                    } else {
	                       equipage += "XXX: " + peq.nom + " " + peq.prenom + "\n";
	                    }
	                });
	            }//s'il n'y qu'un seul nom laisser tomber
                details_str += "\n\n" + equipage;
                
                details_str += "\n\nReconnaissances Terrain: \n";
                if(vol.recoDest){
                    details_str += "Destination: " + vol.recoDest + "\n\n"
                }
                if(vol.listRecoDeg){
                    details_str += "Dégagements: ";
                    if(vol.listRecoDeg.recoDeg.forEach){
                        vol.listRecoDeg.recoDeg.forEach(function(recoDeg){
                            details_str += "\n" + recoDeg.deg + " : " + recoDeg.categorie;
                        });
                    } else {
                        details_str += "\n" + vol.listRecoDeg.recoDeg.deg + " : " + vol.listRecoDeg.recoDeg.categorie;
                    }
                } 
              
                
                if(vol.indemTo){
                    details_str += "\n\nIndemnités: \n";
                    details_str += "\nMonnaie: " + vol.indemTo.monnaie;
                    details_str += "\nChange: " + vol.indemTo.change;
                    details_str += "\nIR: " + vol.indemTo.ir;
                    details_str += "\nMF: " + vol.indemTo.mf
                }
                
                
                return details_str;
            
            case "sol":
                var sol = JSON.parse(xml2json(xmlDoc,"")).sol;
                Object.keys(sol).forEach(function(key){
                    if(key != "listParticipant"){
                        details_str += key + ": " + sol[key] + "\n";
                    }
                });
                
                if(sol.listParticipant){
                    sol.listParticipant.participant.forEach(function(participant){
                        details_str += "\n"
                       Object.keys(participant).forEach(function(key){
                          details_str += key + ": " + participant[key] + "\n" 
                       });
                    });
                }
                return details_str;
        }
        
    }
    
    
    function extractSol(sol){
        var details = extractDetails(sol);
        var sol = JSON.parse(xml2json(sol,"")).sol;
        var tag, place, details, description, start, end;
        var mois = parseInt(sol.date.split("/")[1]) - 1,
            jour = parseInt(sol.date.split("/")[0]);
        
        switch(sol.code){
            case "PAC":
            case "RPC":
            case "PRB":
            case "MAD":
                //repos
                tag = "repos";
                place = "";
                description = "Repos";
                details = details;
                start = end = moment.utc([year,mois,jour]).format().slice(0,10);
                break;
            case "MCA":
            case "MCE":
                //congé
                tag = "conges";
                place = "";
                description = "Congés";
                details = details;
                start = end = moment.utc([year,mois,jour]).format().slice(0,10);
                break;
            case "DSP":
                //dispersion
                tag = "dispersions";
                place = "";
                description = "Dispersion";
                details = details;
                start = end = moment.utc([year,mois,jour]).format().slice(0,10);
                break;
                
            
            case "SST":
            case "MCI":
            case "RBR":
                //ECP
                tag = "Activités sol";
                description = sol.intitule;
                details = details;
                place = sol.lieu ? sol.lieu : "" + "\n" + sol.salle ? sol.salle : "";
                var mois = parseInt(sol.date.split("/")[1]) - 1;
                var jour = parseInt(sol.date.split("/")[0]);
                var heure = parseInt(sol.debut.split("h")[0]);
                var min = parseInt(sol.debut.split("h")[1]);
                start = moment.utc([year,mois,jour,heure,min]).format();
                heure = parseInt(sol.fin.split("h")[0]);
                min = parseInt(sol.fin.split("h")[1]);
                end = moment.utc([year,mois,jour,heure,min]).format();
                break;
            default:
                tag = "Autres"
                place = "";
                start = end = moment.utc([year,mois,jour]).format().slice(0,10);
                //peut-il y avoir des activités sol de plusieurs jour ? klif ??
        }
        
     
  
        return {
            docType         : "event",
            start           : start,
            end             : end,
            place           : place,
            details         : details,
            description     : description,
            rrule           : "",
            tags            : [tag,"af"],
            attendees       : [],
            related         : "",
            timezone        : "Europe/Paris",
            alarms          : [],
            created         : new Date().toDateString(),
            lastModification: "",
        };
            
        
    }
    
    function extractFlights(rotation){
        var svs = rotation.querySelectorAll("sv");
        var flights = [];
        
        svs.forEach(function(sv){
            var dateString = sv.querySelector("date").textContent.split("/"),
                mois = parseInt(dateString[1]) - 1,
                jour = parseInt(dateString[0]);
            
            var vols = sv.querySelectorAll("vol");
            vols.forEach(function(vol){
                
                var details = extractDetails(vol);
                
                var vol = JSON.parse(xml2json(vol,"")).vol;
                window.vol = vol;
                var hour = parseInt(vol.dep.split("h")[0]),
                    min = parseInt(vol.dep.split("h")[1]),
                    startTime = moment.utc([year,mois,jour,hour,min]);
                
                    hour = parseInt(vol.arr.split("h")[0]);
                    min = parseInt(vol.arr.split("h")[1]);
                var endTime = moment.utc([year,mois,jour,hour,min]);
                
                if(endTime < startTime){
                    //c'est une arrivée le jour suivant
                    endTime.add(1, "days");
                }
                
                var description = [vol.numVol,"|",vol.from,"-",vol.to,"|",vol.type].join(" ");
                
                
                var cozyflight = {
                    docType         : "event",
                    start           : startTime.format(),
                    end             : endTime.format(),
                    place           : "",
                    details         : details,
                    description     : description,
                    rrule           : "",
                    tags            : ["vol","af"],
                    attendees       : [],
                    related         : "",
                    timezone        : "UTC",
                    alarms          : [],
                    created         : new Date().toDateString(),
                    lastModification: "",
                };
                
                flights.push(cozyflight);
            });
        });
        
        return flights;
    }
    
    function firstSvDate(rotation){
        var dateString = rotation.querySelector("sv").querySelector("date").textContent.split("/");
        var mois = parseInt(dateString[1])-1;
        var jour = parseInt(dateString[0]);
        return moment.utc([year,mois,jour]);
    }
    
    function lastSvDate(rotation){
        var rotation = rotation,
            svs = rotation.querySelectorAll("sv");
        var dateString = svs[svs.length - 1].querySelector("date").textContent.split("/");
        var vols = svs[svs.length - 1].querySelectorAll("vol"),
            lastflight = vols[vols.length -1];
        var dep = lastflight.querySelector("dep").textContent.split("h").join(""),
            arr = lastflight.querySelector("arr").textContent.split("h").join("");

        var jour = parseInt(dateString[0]),
        	mois = parseInt(dateString[1])-1;
        
        var m = moment.utc([year,mois,jour]);
        
        if(mois === 0 && month === 11){//mois du vol retour janvier, et mois du planning décembre
            m.add(1,"years")
        } 
     
        if (arr < dep){
            //arrivée le jour suivant
           m.add(2,"days");
           return m;
            //il faut rajouter 1 ou 2 jours car le dernier est exclu
            //par cozy calendar apparemment
        } 
         m.add(1,"days");
        return m;
    }
    
    

    
    function importInCozy(){
        
        console.log(cozyEvents);
        
        var j = 0;
        //à décommenter pour cozy
        for (var i=0; i<cozyEvents.length; i++){
            cozysdk.create("Event", cozyEvents[i], function(err, res){
                if(err !== null){
                    status.textContent = statusMsg[6];
                    warning_sts();
                    return;
                } ;
            }, false)
            j++
        }
        
        status.textContent = statusMsg[5];
        ok_sts();
        status3.textContent = j + " éléments importés dans Calendrier."        
        
        cozyEvents = [];
       
    }
    
    function eraseEvents(){//effacement des évènements précédents, sur la période du fichier xml
    	

    	return new Promise(function(resolve, reject){//il faut une promesse pour effacer les evts
                                                    //avant	de créer les nouveaux

            //pour couvrir la période il faut récupérer le premier et le dernier évt (en date).
            var firstEvent = cozyEvents[0],
                lastEvent = cozyEvents[0];
            for(var i=0; i<cozyEvents.length; i++){
                if (cozyEvents[i].start < firstEvent.start) firstEvent = cozyEvents[i];
                if (cozyEvents[i].end > lastEvent.end) lastEvent = cozyEvents[i];
            }
            
            
    		var thismonth = function(doc){//view qui renvoie les docs ayant le tag 'af'
	            if(doc.start && doc.tags && doc.tags.forEach){
	                doc.tags.forEach(function(tag){
	                    if(tag === "af"){
	                        emit(doc.start,doc.tags);
	                    }
	                });
	            }
        	}

	        cozysdk.defineView("Event","all",thismonth,function(err){
	            if(!err){
	                
	                var params = {startkey:firstEvent.start.slice(0,10), endkey:lastEvent.end.slice(0,10)}
	                console.log(params);
	                cozysdk.run("Event","all",params,function(err,res){
                        console.log(res);
	                   if(!err){
	                       var i = 0;
	                       res.forEach(function(evt){
	                           cozysdk.destroy("Event",evt.id);
	                           i++;
	                       });
	                       
	                       console.log(i + " éléments effacés");
                           status2.textContent = i + " éléments effacés";
	                       resolve();
	                   } 
	                });
	            }
	        });
    	});
    }
  
    
   
  
    
    
    
    /*	This work is licensed under Creative Commons GNU LGPL License.

	License: http://creativecommons.org/licenses/LGPL/2.1/
   Version: 0.9
	Author:  Stefan Goessner/2006
	Web:     http://goessner.net/ 
*/
    function xml2json(xml, tab) {
       var X = {
          toObj: function(xml) {
             var o = {};
             if (xml.nodeType==1) {   // element node ..
                if (xml.attributes.length)   // element with attributes  ..
                   for (var i=0; i<xml.attributes.length; i++)
                      o["@"+xml.attributes[i].nodeName] = (xml.attributes[i].nodeValue||"").toString();
                if (xml.firstChild) { // element has child nodes ..
                   var textChild=0, cdataChild=0, hasElementChild=false;
                   for (var n=xml.firstChild; n; n=n.nextSibling) {
                      if (n.nodeType==1) hasElementChild = true;
                      else if (n.nodeType==3 && n.nodeValue.match(/[^ \f\n\r\t\v]/)) textChild++; // non-whitespace text
                      else if (n.nodeType==4) cdataChild++; // cdata section node
                   }
                   if (hasElementChild) {
                      if (textChild < 2 && cdataChild < 2) { // structured element with evtl. a single text or/and cdata node ..
                         X.removeWhite(xml);
                         for (var n=xml.firstChild; n; n=n.nextSibling) {
                            if (n.nodeType == 3)  // text node
                               o["#text"] = X.escape(n.nodeValue);
                            else if (n.nodeType == 4)  // cdata node
                               o["#cdata"] = X.escape(n.nodeValue);
                            else if (o[n.nodeName]) {  // multiple occurence of element ..
                               if (o[n.nodeName] instanceof Array)
                                  o[n.nodeName][o[n.nodeName].length] = X.toObj(n);
                               else
                                  o[n.nodeName] = [o[n.nodeName], X.toObj(n)];
                            }
                            else  // first occurence of element..
                               o[n.nodeName] = X.toObj(n);
                         }
                      }
                      else { // mixed content
                         if (!xml.attributes.length)
                            o = X.escape(X.innerXml(xml));
                         else
                            o["#text"] = X.escape(X.innerXml(xml));
                      }
                   }
                   else if (textChild) { // pure text
                      if (!xml.attributes.length)
                         o = X.escape(X.innerXml(xml));
                      else
                         o["#text"] = X.escape(X.innerXml(xml));
                   }
                   else if (cdataChild) { // cdata
                      if (cdataChild > 1)
                         o = X.escape(X.innerXml(xml));
                      else
                         for (var n=xml.firstChild; n; n=n.nextSibling)
                            o["#cdata"] = X.escape(n.nodeValue);
                   }
                }
                if (!xml.attributes.length && !xml.firstChild) o = null;
             }
             else if (xml.nodeType==9) { // document.node
                o = X.toObj(xml.documentElement);
             }
             else
                alert("unhandled node type: " + xml.nodeType);
             return o;
          },
          toJson: function(o, name, ind) {
             var json = name ? ("\""+name+"\"") : "";
             if (o instanceof Array) {
                for (var i=0,n=o.length; i<n; i++)
                   o[i] = X.toJson(o[i], "", ind+"\t");
                json += (name?":[":"[") + (o.length > 1 ? ("\n"+ind+"\t"+o.join(",\n"+ind+"\t")+"\n"+ind) : o.join("")) + "]";
             }
             else if (o == null)
                json += (name&&":") + "null";
             else if (typeof(o) == "object") {
                var arr = [];
                for (var m in o)
                   arr[arr.length] = X.toJson(o[m], m, ind+"\t");
                json += (name?":{":"{") + (arr.length > 1 ? ("\n"+ind+"\t"+arr.join(",\n"+ind+"\t")+"\n"+ind) : arr.join("")) + "}";
             }
             else if (typeof(o) == "string")
                json += (name&&":") + "\"" + o.toString() + "\"";
             else
                json += (name&&":") + o.toString();
             return json;
          },
          innerXml: function(node) {
             var s = ""
             if ("innerHTML" in node)
                s = node.innerHTML;
             else {
                var asXml = function(n) {
                   var s = "";
                   if (n.nodeType == 1) {
                      s += "<" + n.nodeName;
                      for (var i=0; i<n.attributes.length;i++)
                         s += " " + n.attributes[i].nodeName + "=\"" + (n.attributes[i].nodeValue||"").toString() + "\"";
                      if (n.firstChild) {
                         s += ">";
                         for (var c=n.firstChild; c; c=c.nextSibling)
                            s += asXml(c);
                         s += "</"+n.nodeName+">";
                      }
                      else
                         s += "/>";
                   }
                   else if (n.nodeType == 3)
                      s += n.nodeValue;
                   else if (n.nodeType == 4)
                      s += "<![CDATA[" + n.nodeValue + "]]>";
                   return s;
                };
                for (var c=node.firstChild; c; c=c.nextSibling)
                   s += asXml(c);
             }
             return s;
          },
          escape: function(txt) {
             return txt.replace(/[\\]/g, "\\\\")
                       .replace(/[\"]/g, '\\"')
                       .replace(/[\n]/g, '\\n')
                       .replace(/[\r]/g, '\\r');
          },
          removeWhite: function(e) {
             e.normalize();
             for (var n = e.firstChild; n; ) {
                if (n.nodeType == 3) {  // text node
                   if (!n.nodeValue.match(/[^ \f\n\r\t\v]/)) { // pure whitespace text node
                      var nxt = n.nextSibling;
                      e.removeChild(n);
                      n = nxt;
                   }
                   else
                      n = n.nextSibling;
                }
                else if (n.nodeType == 1) {  // element node
                   X.removeWhite(n);
                   n = n.nextSibling;
                }
                else                      // any other node
                   n = n.nextSibling;
             }
             return e;
          }
       };
       if (xml.nodeType == 9) // document node
          xml = xml.documentElement;
       var json = X.toJson(X.toObj(X.removeWhite(xml)), xml.nodeName, "\t");
       return "{\n" + tab + (tab ? json.replace(/\t/g, tab) : json.replace(/\t|\n/g, "")) + "\n}";
    }
    
    
    
    
    
    
	


}
