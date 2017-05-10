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
    // console.log(req.params.ph);
    str = str.toLowerCase();

    var result = {"arrParsed" : [], "arrAn" : [],
          "arrArea" : [], "arrIndex" : []};
    parseString(str, result, response);

    // response.set({'Content-Type': 'text/html; charset=utf-8'});
    // response.send(JSON.stringify(result));

});

function parseString(str, res, response){

    splitArr = str.split('_', 50);

    // answer init
    res.yearS = 0;
    res.monthS = 0;
    res.dayS = 0;
    res.yearPo = 0;
    res.monthPo = 0;
    res.dayPo = 0;
    res.readPastPeriod = false;
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
      //db.collection("voc").find({word0 : splitArr[0]}).toArray(function(err, vocs){
      db.collection("voc").find({}).toArray(function(err, vocEntire){
        db.close();

        if (vocEntire.length == 0) {
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
      	wordsVocQ = 1000;
      	WordsTermQ = 0;

        //console.log(vocs);

      	while (indCurr < numbWords) {

        wordCurr = splitArr[indCurr];

      	if (indPhraseVoc == 0) {

              // отбираем массив, гле слово0 равно нашему
              var vocs = vocEntire.filter(function(itemEntire) {
                return (itemEntire.word0 == wordCurr);
              });

              vocs.sort(function(a, b) {
                return a.word0.localeCompare(b.word0);
              });

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
    if ((text == 'за') || (text == 'в') || (text == 'на')) {
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

    currNumb = Number(text);
    if (isNaN(currNumb)) {
      currNumb = -1;
    }

    if (res.readPeriodZa || res.readPeriodS || res.readPeriodPo || (currNumb = -1)) {
      readPeriod(text, res, currNumb);
      if (res.periodRead) {
        res.wordRecognized = 'период';
      }
    }
}

function readPeriod(text, res, currNumb){

    isNotNum = false;
    res.periodRead = false;

    var currDate = new Date();

    var currYear 		= currDate.getFullYear();
    var pastYear 		= currYear - 1;
    var nextYear	= currYear + 1;
    var currMonth 	= currDate.getMonth() + 1;
    var tempDate = new Date();
    tempDate.setMonth(currMonth - 2);
    var pastMonth 	= tempDate.getMonth() + 1;
    tempDate = currDate;
    tempDate.setMonth(currMonth)
    var nextMonth	= tempDate.getMonth() + 1;
    var currDay		= currDate.getDate();
    tempDate = currDate;
    tempDate.setDate(currDay - 1);
    var pastDay		= tempDate.getDate();
    tempDate = currDate;
    tempDate.setDate(currDay + 1);
    var nextDay	= tempDate.getDate();

    if (currNumb == -1) {
      isNotNum = true;
    }

    if (isNotNum) {
      getMonthNum(res, text);
      if ((res.month > 0) && (res.month <= 12)) {
        if ((res.readPeriodZa || res.readPeriodS) && res.readPastPeriod) {
          res.yearS = currYear - 1;
        }

        if (!res.readPeriodPo) {
          res.monthS = res.month;
        }

        if ((res.readPeriodZa || res.readPeriodPo) && res.readPastPeriod) {
          res.yearPo = currYear - 1;
        }

        if (!res.readPeriodS) {
          res.monthPo = res.month;
        }

        if (res.readPastPeriod) {
          res.readPastPeriod = false;
        }

        res.periodRead = true;

      } else if ((text == 'год') || (text == 'года') || (text == 'году')) {

        if (res.readPeriodZa) {

          if (res.yearS == 0) {
            res.yearS = currYear - Number(res.readPastPeriod);
          } else {
            res.yearS = res.yearS - Number(res.readPastPeriod);
          }

          if (res.readPastPeriod || (res.monthS == 0)) {
            res.monthS = 1;
          }

          if (res.yearPo == 0) {
            res.yearPo = currYear - Number(res.readPastPeriod);
          } else {
            res.yearPo = res.yearPo - Number(res.readPastPeriod);
          }

          if (res.readPastPeriod || (res.monthPo == 0)) {
            res.monthPo = 12;
          }

          if (res.readPastPeriod) {
            res.readPastPeriod = false;
          }
          res.periodRead = true;

        } else if (res.readPeriodS) {

          if (res.yearS == 0) {
            res.yearS = currYear - Number(res.readPastPeriod);
          } else {
            res.yearS = res.yearS - Number(res.readPastPeriod);
          }

          if (res.readPastPeriod || (res.monthS == 0)) {
            res.monthS = 1;
          }

          if (res.readPastPeriod) {
            res.readPastPeriod = false;
          }
          res.periodRead = true;

        } else if (res.readPeriodPo) {

          if (res.yearPo == 0) {
            res.yearPo = currYear - Number(res.readPastPeriod);
          } else {
            res.yearPo = res.yearPo - Number(res.readPastPeriod);
          }

          if (res.readPastPeriod || (res.monthPo == 0)) {
            res.monthPo = 12;
          }

          if (res.readPastPeriod) {
            res.readPastPeriod = false;
          }
          res.periodRead = true;

        }
      } else if ((text == 'месяц') || (text == 'месяца') || (text == 'месяце')) {

        if (res.readPeriodZa) {

          if (res.yearS == 0) {
            if (res.readPastPeriod && currMonth == 1) {
              res.yearS = pastYear;
            } else {
              res.yearS = currYear;
            }
          }

          if (res.readPastPeriod) {
            res.monthS = pastMonth;
          } else {
            if (res.monthS == 0) {
              res.monthS = currMonth;
            }
          }

          if (res.yearPo == 0) {
            if (res.readPastPeriod && currMonth == 1) {
              res.yearPo = pastYear;
            } else {
              res.yearPo = currYear;
            }
          }

          if (res.readPastPeriod) {
            res.monthPo = pastMonth;
          } else {
            if (res.monthPo == 0) {
              res.monthPo = currMonth;
            }
          }

          if (res.readPastPeriod) {
            res.readPastPeriod = false;
          }
          res.periodRead = true;

        } else if (res.readPeriodS) {

          if (res.yearS == 0) {
            if (res.readPastPeriod && currMonth == 1) {
              res.yearS = pastYear;
            } else {
              res.yearS = currYear;
            }
          }

          if (res.readPastPeriod) {
            res.monthS = pastMonth;
          } else {
            if (res.monthS == 0) {
              res.monthS = currMonth;
            }
          }

          if (res.readPastPeriod) {
            res.readPastPeriod = false;
          }
          res.periodRead = true;

        } else if (res.readPeriodPo) {

          if (res.yearPo == 0) {
            if (res.readPastPeriod && currMonth == 1) {
              res.yearPo = pastYear;
            } else {
              res.yearPo = currYear;
            }
          }

          if (res.readPastPeriod) {
            res.monthPo = pastMonth;
          } else {
            if (res.monthPo == 0) {
              res.monthPo = currMonth;
            }
          }

          if (res.readPastPeriod) {
            res.readPastPeriod = false;
          }
          res.periodRead = true;

        }
      } else if (text == 'сегодня') {

        if (res.readPeriodZa) {

          res.yearS = currYear;
          res.yearPo = currYear;
          res.monthS = currMonth;
          res.monthPo = currMonth;
          res.dayS = currDay;
          res.dayPo = currDay;

          res.periodRead = true;

        } else if (res.readPeriodS) {

          res.yearS = currYear;
          res.monthS = currMonth;
          res.dayS = currDay;

          res.periodRead = true;

        } else if (res.readPeriodPo) {

          res.yearPo = currYear;
          res.monthPo = currMonth;
          res.dayPo = currDay;

          res.periodRead = true;

        }
      } else if (text == 'вчера') {

        tempDate = currDate.setDate(currDay - 1);
        if (res.readPeriodZa) {

          res.yearS = tempDate.getFullYear();
          res.yearPo = tempDate.getFullYear();
          res.monthS = tempDate.getMonth() + 1;
          res.monthPo = tempDate.getMonth() + 1;
          res.dayS = tempDate.getDate();
          res.dayPo = tempDate.getDate();

          res.periodRead = true;

        } else if (res.readPeriodS) {

          res.yearS = tempDate.getFullYear();
          res.monthS = tempDate.getMonth() + 1;
          res.dayS = tempDate.getDate();

          res.periodRead = true;

        } else if (res.readPeriodPo) {

          res.yearPo = tempDate.getFullYear();
          res.monthPo = tempDate.getMonth() + 1;
          res.dayPo = tempDate.getDate();

          res.periodRead = true;

        }
      } else if (text == 'завтра') {

        tempDate = currDate.setDate(currDay + 1);
        if (res.readPeriodZa) {

          res.yearS = tempDate.getFullYear();
          res.yearPo = tempDate.getFullYear();
          res.monthS = tempDate.getMonth() + 1;
          res.monthPo = tempDate.getMonth() + 1;
          res.dayS = tempDate.getDate();
          res.dayPo = tempDate.getDate();

          res.periodRead = true;

        } else if (res.readPeriodS) {

          res.yearS = tempDate.getFullYear();
          res.monthS = tempDate.getMonth() + 1;
          res.dayS = tempDate.getDate();

          res.periodRead = true;

        } else if (res.readPeriodPo) {

          res.yearPo = tempDate.getFullYear();
          res.monthPo = tempDate.getMonth() + 1;
          res.dayPo = tempDate.getDate();

          res.periodRead = true;

        }
      }
    // is not num
    } else {
      if (currNumb > 1900 && currNumb < 2100) {

        if (res.readPeriodS) {

          res.yearS = currNumb;
          if (res.monthS == 0) {
            res.monthS = 1;
          }

        } else if (res.readPeriodPo) {

          res.yearPo = currNumb;
          if (res.monthPo == 0) {
            res.monthS = 12;
          }

        } else {

          res.yearS = currNumb;
          if (res.monthS == 0) {
            res.monthS = 1;
          }
          res.yearPo = currNumb;
          if (res.monthPo == 0) {
            res.monthS = 12;
          }
        }

        res.periodRead = true;

      } else if (currNumb > 0 && currNumb <= 31) {

        if (res.readPeriodS) {

          res.dayS = currNumb;

        } else if (res.readPeriodPo) {

          res.dayPo = currNumb;

        } else {

          res.dayS = currNumb;
          res.dayPo = currNumb;

        }

        res.periodRead = true;
      }
    }
}

function getMonthNum(res, month) {

  if ((month == 'январь') || (month == 'января') || (month == 'январе')){
    res.month = 1;
  } else if ((month == 'февраль') || (month == 'февраля') || (month == 'феврале')){
    res.month = 2;
  } else if ((month == 'март') || (month == 'марта') || (month == 'марте')){
    res.month = 3;
  } else if ((month == 'апрель') || (month == 'апреля') || (month == 'апреле')){
    res.month = 4;
  } else if ((month == 'май') || (month == 'мая') || (month == 'мае')){
    res.month = 5;
  } else if ((month == 'июнь') || (month == 'июня') || (month == 'июне')){
    res.month = 6;
  } else if ((month == 'июль') || (month == 'июля') || (month == 'июле')){
    res.month = 7;
  } else if ((month == 'август') || (month == 'августа') || (month == 'августе')){
    res.month = 8;
  } else if ((month == 'сентябрь') || (month == 'сентября') || (month == 'сентябре')){
    res.month = 9;
  } else if ((month == 'октябрь') || (month == 'октября') || (month == 'октябре')){
    res.month = 10;
  } else if ((month == 'ноябрь') || (month == 'ноября') || (month == 'ноябре')){
    res.month = 11;
  } else if ((month == 'декабрь') || (month == 'декабря') || (month == 'декабре')){
    res.month = 12;
  } else {
    res.month = 0;
  }
}

app.get("/api/voc", function(req, res){

    mongoClient.connect(url, function(err, db){
        db.collection("voc").find({}).toArray(function(err, users){

            users.sort(function(a, b) {
              return a.word0.localeCompare(b.word0);
            });

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

    // arr.sort(function(a, b) {
    //   return a.word0.localeCompare(b.word0);
    // });

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
