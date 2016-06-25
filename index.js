document.addEventListener("DOMContentLoaded", script, false);


function script(){
    
    console.log("bienvenue dans ccimport");

	var cozyEvents = [];

	//liste des strings pour les messages de statut
	var statusMsg = ["chargement","fichier invalide","fichier chargé","sélectionnez un fichier","erreur de lecture","OK"];

	//récupération des éléments du DOM
	var status = document.querySelector("#status"),
		fileform = document.querySelector("#file-form"),
		fileInput = document.querySelector("#file-input");
    var dummy = document.querySelector("#dummy");

    dummy.addEventListener("click", function(e){
        e.preventDefault();
        var event = {
            docType         : "event",
                start           : "2016-06-28",
                end             : "2016-06-29T00:01:00.000",
                place           : "dans ton cul",
                details         : "évènement test",
                description     : "test d'export d évènement",
                rrule           : "",
                tags            : ["TEST1","TEST2"], //apparemment seul le premier tag définit le calendrier
                attendees       : [],
                related         : "",
                timezone        : "Europe/Paris",
                alarms          : [],
                created         : new Date().toDateString(),
                lastModification: "",
        };
        
        //exporter l'évènement
        cozysdk.create("Event", event, function(err, res){
            if(err !== null) return alert(err);
        });
    }, false);
    
    
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
		if (fileInput.files[0] === undefined){//si aucun fichier n'est sélectionné
			status.textContent = statusMsg[3];//afficher une erreur
			status.classList.add("error");
		} else {//sinon lire le fichier en mode texte
			reader.readAsText(fileInput.files[0]);//déclenchera fileLoaded, ou fileError
			status.textContent = statusMsg[0];
			status.classList.remove("error");
		}
	}, false);
    
    


	function fileLoaded(){//quand le fichier est chargé
		status.textContent = statusMsg[2];
		status.classList.remove("error");
		window.filecontent = reader.result;//debug

		var parser = new DOMParser();//createion d'un DOM à partir de la string xml
		var xmlDoc = parser.parseFromString(reader.result, "text/xml");

		window.xml = xmlDoc;//debug

		if (checkXML(xmlDoc)){//vérification du xml
			status.textContent = statusMsg[5];
			status.classList.remove("error");
            
			debug();
            //createPlanning(xmlDoc);//création du planning
		} else {//si non affiche fichier invalide
			status.textContent = statusMsg[1];
			status.classList.add("error");
		}


	}

	function fileError(){//erreur de lecture du fichier
		status.textContent = statusMsg[4];
		status.classList.add("error");

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
		//var planning = xmlToJson(xmlDoc);
		//check erreurs ?

		//planning = planning.planning;//structure du fichier xml

		//le problème avec ce xmlToJson est que il renvoie un object s'il y a un seul
		//élement (vol par ex.) et un tableau si plusieurs...ce sera peut-être plus
		//simple avec un querySelectorAll

	//	window.planning = planning;
        
        
     

		window.planningXml = xmlDoc;
		var planningXml = xmlDoc;

		var year = planningXml.querySelector("planning").getAttribute("mois").slice(3);
        var month = planningXml.querySelector("planning").getAttribute("mois").slice(0,2);
      
           //TODO , effacer le planning précédent
        eraseEvents(month);
        
        var sols = planningXml.querySelectorAll("sol");
        var rotations = planningXml.querySelectorAll("rotation");
        
        rotations.forEach(function(rotation){
            
            cozyEvents = cozyEvents.concat(extractFlights(rotation, year));
            
            var startDay = year + "-" + firstSvDate(rotation),
                endDay = year + "-" + lastSvDate(rotation);
            var rotation = JSON.parse(xml2json(rotation,"")).rotation;
            var cozyrot = {
                docType         : "event",
                start           : startDay,
                end             : endDay,
                place           : "",
                details         : rotation.rotationId,
                description     : "Rotation",
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
            
            cozyEvents.push(extractSol(sol, year));
            
        });
        
        
        importInCozy();
    }
    
    function extractSol(sol, year){
        var year = year;
        var sol = JSON.parse(xml2json(sol,"")).sol;
        var tag, place, details, description, start, end;
        
        switch(sol.code){
            case "PAC":
            case "RPC":
            case "PRB":
            case "MAD":
                //repos
                tag = "repos";
                place = "";
                description = "Repos";
                details = sol.intitule;
                start = end = year + "-" + sol.date.split("/")[1] + "-" + sol.date.split("/")[0];
                break;
            case "MCA":
            case "MCE":
                //congé
                tag = "conges";
                place = "";
                description = "Congés";
                details = sol.intitule;
                start = end = year + "-" + sol.date.split("/")[1] + "-" + sol.date.split("/")[0];
                break;
            case "DSP":
                //dispersion
                tag = "dispersions";
                place = "";
                description = "Dispersion";
                details = sol.intitule;
                start = end = year + "-" + sol.date.split("/")[1] + "-" + sol.date.split("/")[0];
                break;
                
            
            case "SST":
            case "MCI":
            case "RBR":
                //ECP
                tag = "Activités sol";
                description = sol.intitule;
                details = "faire qqch pour les détails";
                place = sol.lieu ? sol.lieu : "" + "\n" + sol.salle ? sol.salle : "";
                var day = year + "-" + sol.date.split("/")[1] + "-" + sol.date.split("/")[0];
                start = day + "T" + sol.debut.split("h")[0] + ":" + sol.debut.split("h")[1] + ":00.000";
                end = day + "T" + sol.fin.split("h")[0] + ":" + sol.fin.split("h")[1] + ":00.000";
                break;
            default:
                tag = "Autres"
                place = "";
                start = end = year + "-" + sol.date.split("/")[1] + "-" + sol.date.split("/")[0];
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
    
    function extractFlights(rotation, year){
        var year = year;
        var svs = rotation.querySelectorAll("sv");
        var flights = [];
        
        svs.forEach(function(sv){
            var dateString = sv.querySelector("date").textContent.split("/"),
                month = dateString[1],
                day = dateString[0];
            
            var vols = sv.querySelectorAll("vol");
            vols.forEach(function(vol){
                var vol = JSON.parse(xml2json(vol,"")).vol;
                window.vol = vol;
                var hour = vol.dep.split("h")[0],
                    min = vol.dep.split("h")[1],
                    startTime = [year,month,day].join("-") + "T" + [hour,min,"00.000Z"].join(":");
                
                var hour = vol.arr.split("h")[0],
                    min = vol.arr.split("h")[1],
                    endTime = [year,month,day].join("-") + "T" + [hour,min,"00.000Z"].join(":");
                
                var description = [vol.numVol,"|",vol.from,"-",vol.to,"|",vol.type].join(" ");
                
                var details = ["tout","un","tas","de","trucs"].join(" ");
               
                
                var cozyflight = {
                    docType         : "event",
                    start           : startTime,
                    end             : endTime,
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
        return dateString[1] + "-" + dateString[0];
    }
    
    function lastSvDate(rotation){
        var rotation = rotation,
            svs = rotation.querySelectorAll("sv");
        var dateString = svs[svs.length - 1].querySelector("date").textContent.split("/");
        var vols = svs[svs.length - 1].querySelectorAll("vol"),
            lastflight = vols[vols.length -1];
        var dep = lastflight.querySelector("dep").textContent.split("h").join(),
            arr = lastflight.querySelector("arr").textContent.split("h").join();
        
        if (arr < dep){
            //arrivée le jour suivant
            return dateString[1] + "-0" + (parseInt(dateString[0])+2).toString(); 
            //il faut rajouter 1 jour car le dernier est exclu
            //par cozy calendar apparemment
        } 
        return dateString[1] + "-0" + (parseInt(dateString[0])+1).toString();
        
    }
    
    
    
    
    function rotationTemplate(rot){
        var rot = rot;
        return("Départ UTC: " );
    }

    
    
    function importInCozy(){
        
        console.log(cozyEvents);
        
        
        //à décommenter pour cozy
        for (var i=0; i<cozyEvents.length; i++){
            cozysdk.create("Event", cozyEvents[i], function(err, res){
                if(err !== null) return alert(err);
            }, false)
        }
       
    }
    
    function eraseEvents(month){
        
        var bydate = function(doc){if(doc.start)emit(doc.start);}
        
        cozysdk.defineView("Event","all",bydate,function(err){
            if(!err){
                console.log("la vue a été créée");
                cozysdk.run("Event","all",{},function(err,res){
                   if(!err){
                       console.log(res);
                   } 
                });
            }
        });
    }
  
    
    
    function debug(){
        
        var year="2016-"
        var month = "01-"
        var thismonth = function(doc){
            if(doc.start && doc.tags && doc.tags.forEach){
                doc.tags.forEach(function(tag){
                    if(tag === "af"){
                        doc.emit(doc.start,doc.tags);
                    }
                });
            }
        }
        
        cozysdk.defineView("Event","all",thismonth,function(err){
            if(!err){
                //console.log("la vue a été créée");
                var params = {startkey:year+month+"00", endkey:year+month+"31"}
                console.log(params);
                cozysdk.run("Event","all",params,function(err,res){
                   if(!err){
                       console.log(res);
                   } 
                });
            }
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
