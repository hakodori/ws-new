var express = require("express");
var bodyParser = require("body-parser");
var mongoClient = require("mongodb").MongoClient;
var objectId = require("mongodb").ObjectID;

var app = express();
var jsonParser = bodyParser.json();
//var url = process.env.MONGODB_URI;
var url = "mongodb://sa:123321@ds055875.mlab.com:55875/easyrp";

app.use(express.static(__dirname + "/public"));

app.get("/api/easyrp/:ph", function(req, response){

    //console.log(req.params.ph);
    str = decodeURI(req.params.ph);
    //console.log(req.params.ph);
    str = str.toLowerCase();

    var result = {"arrParsed" : [], "arrAn" : [],
          "arrArea" : [], "arrIndex" : []};
    parseString(str, result, response);

    // response.set({'Content-Type': 'text/html; charset=utf-8'});
    // response.send(JSON.stringify(result));

});

function parseString(str, res, response){

    splitArr = str.split('_', 50);

    // splitArr.forEach(function(item, i, splitArr) {
    //   //console.log(item);
    //
    // });

    readByPhrase(splitArr, res, response);

}

function readByPhrase(splitArr, res, response) {

  if (splitArr.length == 0) {
    res = {};
    return;
  }

  mongoClient.connect(url, function(err, db){
      db.collection("voc").find({word0 : splitArr[0]}).toArray(function(err, vocs){
        //db.close();

        if (vocs.length == 0) {
          res = {};
          return;
        }

        indCurr = 0;
      	numbWords = splitArr.length;
      	strFound = '';
      	indPhraseVoc = 0;
      	indVoc = 0;
      	indVocFound = 0;
      	indPhraseBeg = 0;
      	indExactMatch = 0;
      	wordsTermsQ = 20; // пока оставляем так, потом надо перебрать и взять Object.keys(JSON).length
      	wordsVocQ = vocs.length;
      	WordsTermQ = 0;

        //console.log(vocs);

      	while (indCurr < numbWords) {

      		wordCurr = splitArr[indCurr];
          // console.log(wordCurr);

      	if (indPhraseVoc == 0) {

      				term = vocs[0];
              // console.log(term);
      				if (term != undefined) {
        					strFound = wordCurr;
        					indPhraseVoc = 1;
        					indVoc = 0;
        					indVocFound = indVoc;

                  if (term.word1 == undefined) {             		//в словаре есть термин совпадающий с ТекСловом
        						indExactMatch = indVoc;

        					} else {
        						indExactMatch = -1;                //в словаре пока не нашли совпадающий термин
        					}
        					indPhraseBeg = indCurr;
        					WordsTermQ = 1;
        					indCurr++;
                  if (indCurr == numbWords) {
                    addTerm(term, res);
        					}
      				} else {
      					analyzeText(wordCurr, res);

      					if (res.wordRecognized != '') {
                  res.arrParsed.push(res.wordRecognized);
      					} else {
      						res.arrParsed.push(wordCurr);
      					}
                indCurr++;
      				}

      	} else {
      			indChanged = false;
      			while ((indCurr < numbWords) && (indPhraseVoc < wordsTermsQ)) {
      				wordCurr = splitArr[indCurr];
      				currWordVoc = vocs[indVoc]['word' + indPhraseVoc];
              //console.log(indPhraseVoc + ' ' + vocs[indVoc] + ' ' + indVoc + '---' + currWordVoc + '---' + indPhraseVoc);

      				searchInd = 0;
      				inVoc = true;
      				while ((searchInd < indPhraseVoc) && (indChanged)) {
      					if (splitArr[indPhraseBeg + searchInd] != vocs[indVoc]['word' + searchInd]) {
      						inVoc = false;
      						break;
      					}
      					searchInd++;
      				}

      				indChanged = false;

      	 			if ((currWordVoc != undefined) && (currWordVoc.localeCompare(wordCurr) == -1) && (inVoc)) {  	//сравнение слов
      					indVoc++;
      					indChanged = true;
      					if (indVoc == wordsVocQ) {    //дошли до последнего слова словаря
      						if (indExactMatch >= 0) {
                    addTerm(vocs[indExactMatch], res);
      							strFound = "";
      							indPhraseVoc = 0;
      							//ТекИндекс = ТекИндекс + 1;
      						} else {
                    res.arrParsed.push(splitArr[indPhraseBeg]);
      							indPhraseVoc = 0;
      							indCurr = indPhraseBeg + 1;
      						}
                }

      					break;

      	 			} else if (currWordVoc == wordCurr) {
      					strFound = strFound + " " + wordCurr;
      					indPhraseVoc++;
      					indCurr++;
      					if ((indPhraseVoc == wordsTermsQ)  	//дошли до конца термина (достигли максимальной длины терминов)
      							|| (indCurr = numbWords)) {		//дошли до конца фразы
      						addTerm(vocs[indVoc], res);
      						strFound = '';
      						indPhraseVoc = 0;
      						break;
      					} else if (vocs[indVoc]['word' + indPhraseVoc] == undefined) {   //дошли до последнего слова термина
      						indExactMatch = indVoc;
      						indVocFound = indVoc;
      						WordsTermQ = indPhraseVoc;
      					}
      	 			} else {
                if (indExactMatch >= 0) {
                  addTerm(vocs[indExactMatch], res);
      						strFound = '';
      						indPhraseVoc = 0;
      						indCurr = indPhraseBeg + WordsTermQ;
      					} else {
                  analyzeText(splitArr[indPhraseBeg], res);

        					if (res.wordRecognized != '') {
                    res.arrParsed.push(res.wordRecognized);
        					} else {
        						res.arrParsed.push(splitArr[indPhraseBeg]);
                  }
      						indPhraseVoc = 0;
      						indCurr = indPhraseBeg + 1;
      					}
      					break;
      	  			}
      	 		}
      	 }
      }

      response.set({'Content-Type': 'text/html; charset=utf-8'});
      response.send(JSON.stringify(res));

  //         res.send(users)
    });
  });
  //
}

function addTerm(term, res) {

    res.arrParsed.push(term.ethalon);

    // console.log(term.object);
    // console.log(term.area);
    // console.log(term.analitics);
    // console.log(term.index);

    if ((term.object != null) && (term.object != undefined) && (term.object != '')) {
        res.arrIndex.push(term.index);
    }

    if ((term.area != null) && (term.area != undefined) && (term.area != '')) {
        area = {};
        area.area = term.area;
        area.rate = 1 + term.object * 0.1;
        res.arrArea.push(area);
    }

    if ((term.analitics != null) && (term.analitics != undefined) && (term.analitics != ''))  {
        res.arrAn.push(term.analitics);
        res.analytics = res.analytics + term.ethalon + " ";
    }

    if ((term.index != null) && (term.index != undefined) && (term.index != ''))  {
        res.arrIndex.push(term.index);
    }

    res.readPeriodPo = false;
    res.readPeriodS = false;
    res.readPeriodZa  = false;

}

function analyzeText(text, res){
    res.wordRecognized = '';
    if (text == 'за') {
      res.readPeriodPo = false;
      res.readPeriodS = false;
      res.readPeriodZa  = true;
      res.wordRecognized = text;
    } else if (text == 'с') {
      res.readPeriodPo = false;
      res.readPeriodS = true;
      res.readPeriodZa  = false;
      res.wordRecognized = text;
    } else if (text == 'по') {
      res.readPeriodPo = true;
      res.readPeriodS = false;
      res.readPeriodZa  = false;
      res.wordRecognized = text;
    }

    if ((text == 'прошлый') || (text == 'прошлого') || (text == 'прошлой') || (text == 'прошлую') || (text == 'прошлом')) {
      res.readPastPeriod = true;
      res.wordRecognized = 'прошлый';
    }

    if ((text == 'следующий') || (text == 'следующего') || (text == 'следующем') || (text == 'следующей') || (text == 'следующую')) {
      res.readNextPeriod = true;
      res.wordRecognized = 'следующий';
    }

    if (res.wordRecognized != '') {
      return;
    }

    if (res.readPeriodZa || res.readPeriodS || res.readPeriodPo) {
      readPeriod(text, res);
    }
}

function readPeriod(text, res){

    if (text == 'январь' || text == 'января'){
      res.month = 1;
    } else if (text == 'февраль' || text == 'февраля'){
      res.month = 2;
    } else if (text == 'март' || text == 'марта'){
      res.month = 3;
    } else if (text == 'апрель' || text == 'апреля'){
      res.month = 4;
    } else if (text == 'май' || text == 'мая'){
      res.month = 5;
    } else if (text == 'июнь' || text == 'июня'){
      res.month = 6;
    } else if (text == 'июль' || text == 'июля'){
      res.month = 7;
    } else if (text == 'август' || text == 'августа'){
      res.month = 8;
    } else if (text == 'сентябрь' || text == 'сентября'){
      res.month = 9;
    } else if (text == 'октябрь' || text == 'октября'){
      res.month = 10;
    } else if (text == 'ноябрь' || text == 'ноября'){
      res.month = 11;
    } else if (text == 'декабрь' || text == 'декабря'){
      res.month = 12;
    }

}

app.get("/api/voc", function(req, res){

    mongoClient.connect(url, function(err, db){
        db.collection("voc").find({}).toArray(function(err, users){
            res.send(users)
            db.close();
        });
    });
});

app.get("/api/voc/:id", function(req, res){

    var id = new objectId(req.params.id);
    mongoClient.connect(url, function(err, db){
        db.collection("voc").findOne({_id: id}, function(err, user){

            if(err) return res.status(400).send();

            res.send(user);
            db.close();
        });
    });
});

app.post("/api/voc", jsonParser, function (req, res) {

    //console.log(req.body);

    if(!req.body) return res.sendStatus(400);

    arr = req.body;
    arr.forEach(function(item, i, arr) {

      phrase = item.phrase;
      splitArr = phrase.split(' ', 50);

      splitArr.forEach(function(itemw, iw, splitArr) {
        //console.log(item);
        item['word' + iw] = itemw;
      });

      //console.log(item);

    });

    arr.sort(function(a, b) {
      return a.phrase.localeCompare(b.phrase);
    });

      mongoClient.connect(url, function(err, db){

          db.collection("voc").remove({});

          db.collection("voc").insertMany(arr, function(err, result){

              if(err) return res.status(400).send();

              //res.send(user);
              db.close();
           });
       });
});

app.delete("/api/voc/:id", function(req, res){

    var id = new objectId(req.params.id);
    mongoClient.connect(url, function(err, db){
        db.collection("voc").findOneAndDelete({_id: id}, function(err, result){

            if(err) return res.status(400).send();

            var user = result.value;
            res.send(user);
            db.close();
        });
    });
});

app.put("/api/voc", jsonParser, function(req, res){

    if(!req.body) return res.sendStatus(400);
    var id = new objectId(req.body.id);
    var userName = req.body.name;
    var userAge = req.body.age;

    mongoClient.connect(url, function(err, db){
        db.collection("voc").findOneAndUpdate({_id: id}, { $set: {age: userAge, name: userName}},
             {returnOriginal: false },function(err, result){

            if(err) return res.status(400).send();

            var user = result.value;
            res.send(user);
            db.close();
        });
    });
});

app.listen(process.env.PORT || 3000, function(){
    console.log("Сервер ожидает подключения...");
});
