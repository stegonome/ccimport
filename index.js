document.addEventListener("DOMContentLoaded", script, false);


function script(){

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
                start           : "20160628",
                end             : "20160629",
                place           : "dans ton cul",
                details         : "évènement test",
                description     : "test d'export d évènement",
                rrule           : "",
                tags            : ["test"],
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
			createPlanning(xmlDoc);//création du planning
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
        var today = new Date();
        
        var sols = planningXml.querySelectorAll("sol");
        var rotations = planningXml.querySelectorAll("rotation");
        
        rotations.forEach(function(rotation){
            var startDay = year + firstSvDate(rotation),
                endDay = year + lastSvDate(rotation);
            var rotation = xmlToJson(rotation);
            var cozyrot = {
                docType         : "event",
                start           : startDay,
                end             : endDay,
                place           : "",
                details         : rotation.rotationId,
                description     : "Rotation",
                rrule           : "",
                tags            : ["vol"],
                attendees       : [],
                related         : "",
                timezone        : "Europe/Paris",
                alarms          : [],
                created         : new Date().toDateString(),
                lastModification: "",
            };
                
            console.log(cozyrot);    
        });
    }
    
    
    function firstSvDate(rotation){
        return rotation.querySelector("sv").querySelector("date").textContent.split("/").join();
    }
    
    function lastSvDate(rotation){
        var rotation = rotation,
            svs = rotation.querySelectorAll("sv");
        return svs[svs.length - 1].querySelector("date").textContent.split("/").join();
    }
    
    
    function createCozyRot(rotationXml, year){
        var cozyRot = {};
        var year = year;
        var rotation = rotationXml;
        var svs = rotation.querySelectorAll("sv");
        var startDate = svs[0].querySelector("date").textContent;
        var endDate = svs[svs.length -1].querySelector("date").textContent;
    
        
        var start = startDate.split("/").join() + year;
        var end = endDate.split("/").join() + year;
        
        rotation = xmlToJson(rotation);//conversion en json pour plus de facilité, pas fait avant car il pourrait n'y avoir qu'un seul sv,
        //donc un objet au lieu d'un tableau avec la fonction xmlToJson
        
        
        //description c'est le titre
         cozyRot = {
            docType         : "event",
            start           : start,
            end             : end,
            place           : "",
            details         : rotation.rotationId,
            description     : rotationTemplate(rotation),
            rrule           : "",
            tags            : ["sol"],
            attendees       : [],
            related         : "",
            timezone        : "Europe/Paris",
            alarms          : [],
            created         : new Date().toDateString(),
            lastModification: "",
        }
        
    }
    
    function rotationTemplate(rot){
        var rot = rot;
        return("Départ UTC: " );
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
	//librairie extérieure
	// Changes XML to JSON
	function xmlToJson(xml) {

		// Create the return object
		var obj = {};

		if (xml.nodeType == 1) { // element
			// do attributes
			if (xml.attributes.length > 0) {
			obj["@attributes"] = {};
				for (var j = 0; j < xml.attributes.length; j++) {
					var attribute = xml.attributes.item(j);
					obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
				}
			}
		} else if (xml.nodeType == 3) { // text
			obj = xml.nodeValue;
		}

		// do children
		if (xml.hasChildNodes()) {
			for(var i = 0; i < xml.childNodes.length; i++) {
				var item = xml.childNodes.item(i);
				var nodeName = item.nodeName;
				if (typeof(obj[nodeName]) == "undefined") {
					obj[nodeName] = xmlToJson(item);
				} else {
					if (typeof(obj[nodeName].push) == "undefined") {
						var old = obj[nodeName];
						obj[nodeName] = [];
						obj[nodeName].push(old);
					}
					obj[nodeName].push(xmlToJson(item));
				}
			}
		}
		return obj;
	};


}
