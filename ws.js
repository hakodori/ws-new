var express = require("express");
var bodyParser = require("body-parser");
var mongoClient = require("mongodb").MongoClient;
var objectId = require("mongodb").ObjectID;

var app = express();
var jsonParser = bodyParser.json();
//var url = process.env.MONGODB_URI;
var url = "mongodb://sa:123321@ds055875.mlab.com:55875/easyrp";

app.use(express.static(__dirname + "/public"));

app.get("/api/easyrp/:solution/:developer/:version/:easyRP_ID/:ph", function(req, response){

    //console.log(req.params);
    str = decodeURI(req.params.ph);

    var reqParams = {};
    reqParams.solution = decodeURI(req.params.solution);
    reqParams.developer = decodeURI(req.params.developer);
    reqParams.version = decodeURI(req.params.version);
    reqParams.easyRP_ID = decodeURI(req.params.easyRP_ID);

    if (reqParams.solution == 'any') {
      reqParams.solution = '';
    }
    if (reqParams.developer == 'any') {
      reqParams.developer = '';
    }
    if (reqParams.version == 'any') {
      reqParams.version = '';
    }
    if (reqParams.easyRP_ID == 'any') {
      reqParams.easyRP_ID = '';
    }

    // console.log(req.params.ph);
    str = str.toLowerCase();

    var result = {"arrParsed" : [], "arrAn" : [],
          "arrArea" : [], "arrIndex" : [], "arrNotParsed" : []};
    parseString(str, result, response, reqParams);

    // response.set({'Content-Type': 'text/html; charset=utf-8'});
    // response.send(JSON.stringify(result));

});

function parseString(str, res, response, reqParams){

    splitArr = str.split(' ', 50);

    // answer init
    res.yearS = 0;
    res.monthS = 0;
    res.dayS = 0;
    res.yearPo = 0;
    res.monthPo = 0;
    res.dayPo = 0;
    res.readPastPeriod = false;
    res.typeReport = 0;
    res.typeList = 0;
    res.typeObj = 0;
    res.obj = '';
    res.arrArea = [];
    res.defs = [];
    res.sets = [];
    res.readObjNum = false;
    res.objNum = 0;
    res.objWeight = 0;
    res.phPlan = 0;
    res.phFact = 0;
    res.phPlanFact = undefined;
    res.sortType = '';
    res.filterOwn = false;

    // splitArr.forEach(function(item, i, splitArr) {
    //   //console.log(item);
    //
    // });

    readByPhrase(splitArr, res, response, reqParams);

}

function readByPhrase(splitArr, res, response, reqParams) {

  if (splitArr.length == 0) {
    res = {};
    return;
  }

  mongoClient.connect(url, function(err, db){
      //db.collection("voc").find({word0 : splitArr[0]}).toArray(function(err, vocs){
      db.collection("voc").find({}).toArray(function(err, vocEntire){
        //db.close();

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
      	wordsTermsQ = 3; // пока оставляем так, потом надо перебрать и взять Object.keys(JSON).length
      	//wordsVocQ = 1000;
      	WordsTermQ = 0;

        //console.log(vocs);

      	while (indCurr < numbWords) {

        wordCurr = splitArr[indCurr];
        // console.log(wordCurr);
        // console.log(indPhraseVoc);

      	if (indPhraseVoc == 0) {

              if (wordCurr.substr(0, 7) == '[param~') {
                var vocsParam = vocEntire.filter(function(itemEntire) {
                  return (itemEntire.phrase == wordCurr);
                });
                if (vocsParam.length > 0) {
                  addTerm(vocsParam[0], res, vocEntire);
                }

                indCurr++;
              } else {
                // отбираем массив, гле слово0 равно нашему
                var vocs = vocEntire.filter(function(itemEntire) {
                  return (itemEntire.word0 == wordCurr);
                });

                vocs.sort(function(a, b) {
                  return a.word0.localeCompare(b.word0);
                });

                // console.log(vocs);

                wordsVocQ = vocs.length;

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
                      addTerm(term, res, vocEntire);
          					}
        				} else {
        					analyzeText(wordCurr, res);

        					if (res.wordRecognized != '') {
                    res.arrParsed.push(res.wordRecognized);
        					} else {
        						res.arrParsed.push(wordCurr);
                    if (wordCurr.length > 2) {
                      res.arrNotParsed.push(wordCurr);
                    }
        					}
                  indCurr++;
        				}
              }
      	} else {
      			indChanged = false;
            // console.log(wordCurr);
            // console.log(indCurr);
            // console.log(numbWords);
            // console.log(indPhraseVoc);
            // console.log(wordsTermsQ);
            // console.log(indVoc);
      			while ((indCurr < numbWords) && (indPhraseVoc < wordsTermsQ)) {
      				wordCurr = splitArr[indCurr];
              // console.log('cycle');
              // console.log(wordCurr);
              // console.log(vocs[indVoc]);
              // console.log(indVoc);
              currWordVoc = vocs[indVoc]['word' + indPhraseVoc];
              if (currWordVoc == undefined) {
                currWordVoc = '';
              }
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

              // console.log(indCurr);
              // console.log(currWordVoc);
              // console.log(wordCurr);
              // console.log(currWordVoc.localeCompare(wordCurr));
              // console.log(inVoc);
              // console.log(indExactMatch);

      	 			if ((currWordVoc.localeCompare(wordCurr) == -1) && (inVoc)) {  	//сравнение слов
                // console.log('1111111111111111111111111');
                indVoc++;
      					indChanged = true;
                // console.log('------------------------------');
                // console.log(indVoc);
                // console.log(wordsVocQ);
                // console.log(indExactMatch);
                // console.log('------------------------------');
      					if (indVoc == wordsVocQ) {    //дошли до последнего слова словаря
      						if (indExactMatch >= 0) {
                    addTerm(vocs[indExactMatch], res, vocEntire);
      							strFound = "";
      							indPhraseVoc = 0;
      							//ТекИндекс = ТекИндекс + 1;
                    // ЭКСПЕРИМЕНТ!!!!!!!!!!!!!!!!
                    indCurr = indPhraseBeg + WordsTermQ;
                    // КОНЕЦ ЭКСПЕРИМЕНТА
      						} else {
                    res.arrParsed.push(splitArr[indPhraseBeg]);
                    if (splitArr[indPhraseBeg].length > 2) {
                      res.arrNotParsed.push(splitArr[indPhraseBeg]);
                    }
      							indPhraseVoc = 0;
      							indCurr = indPhraseBeg + 1;
      						}
                  // console.log('break');
                  // console.log(indPhraseVoc);
                  break;
                }

      	 			} else if (currWordVoc == wordCurr) {
                // console.log('2222222222222222222222222222222');
      					strFound = strFound + " " + wordCurr;
      					indPhraseVoc++;
      					indCurr++;
                // console.log(indPhraseVoc);
                // console.log(wordsTermsQ);
                // console.log(indCurr);
                // console.log(numbWords);
                // // console.log(vocs[indVoc]['word' + indPhraseVoc]);
                // console.log(vocs);
      					if ((indPhraseVoc == wordsTermsQ)  	//дошли до конца термина (достигли максимальной длины терминов)
      							|| (indCurr == numbWords)) {		//дошли до конца фразы
                  addTerm(vocs[indVoc], res, vocEntire);
      						strFound = '';
      						indPhraseVoc = 0;
      						break;
      					} else if (vocs[indVoc]['word' + indPhraseVoc] == undefined) {   //дошли до последнего слова термина
      						indExactMatch = indVoc;
      						indVocFound = indVoc;
      						WordsTermQ = indPhraseVoc;
      					}
      	 			} else {
                // console.log('3333333333333333333333333');
                // console.log(vocs[indExactMatch]);
                if (indExactMatch >= 0) {
                  addTerm(vocs[indExactMatch], res, vocEntire);
      						strFound = '';
      						indPhraseVoc = 0;
      						indCurr = indPhraseBeg + WordsTermQ;
      					} else {
                  analyzeText(splitArr[indPhraseBeg], res);

        					if (res.wordRecognized != '') {
                    res.arrParsed.push(res.wordRecognized);
        					} else {
        						res.arrParsed.push(splitArr[indPhraseBeg]);
                    if (splitArr[indPhraseBeg].length > 2) {
                      res.arrNotParsed.push(splitArr[indPhraseBeg]);
                    }
                  }
      						indPhraseVoc = 0;
      						indCurr = indPhraseBeg + 1;
      					}
      					break;
      	  			}
      	 		}
      	 }

      }

      db.collection("def").find({}).toArray(function(err, defsEntire){

            //console.log(defsEntire);

            //возвращаем вид объекта
            // console.log(res.typeReport);
            // console.log(res.typeObj);
            // console.log(res.typeList);

            currType = '';
            if (res.typeReport > res.typeObj && res.typeReport > res.typeList) {
          		currType = "отчет";
          	} else if (res.typeObj > res.typeList && res.typeObj > res.typeReport) {
          		currType = "объект";
          	} else if (res.typeList > res.typeObj && res.typeList > res.typeReport) {
          		currType = "список";
          	} else {
          		currType = 'undefined';
          	}

            if (res.phPlan > res.phFact) {
              res.phPlanFact = 'plan';
            } else if (res.phPlan < res.phFact) {
              res.phPlanFact = 'fact';
            } else {
              res.phPlanFact = 'undefined';
            }

            currArea = returnArea(res);

            if (res.obj == '' && currArea != '' && currType != '') {		//попробуем определить объект по таблице соответствий
          		res.obj = returnObjByAttribute(res, currType, currArea, defsEntire);
          	}

            // console.log(res.obj);
            // console.log(currType);
            // console.log(res.phPlanFact);
            // console.log(currArea);

            res.area = currArea;
            res.type = currType;

            // var defsFilter = defsEntire.filter(function(itemEntire) {
            //   return ((itemEntire.obj == res.obj)
            //      && (itemEntire.objType == currType || itemEntire.objType == 'any')
            //      && (itemEntire.pf == res.phPlanFact || itemEntire.pf == 'any')
            //      && (itemEntire.area == currArea || itemEntire.area == 'any')
            //      && (itemEntire.solution == reqParams.solution || isEmpty(itemEntire.solution))
            //      && (itemEntire.developer == reqParams.developer || isEmpty(itemEntire.developer))
            //      && (itemEntire.version == reqParams.version || isEmpty(itemEntire.version))
            //      && (itemEntire.easyRP_ID == reqParams.easyRP_ID || isEmpty(itemEntire.easyRP_ID))
            //   );
            //   //return (res.obj.localeCompare(itemEntire.obj) && currType.localeCompare(itemEntire.objType));
            // });
            bestRating = 0;
            foundDefs = undefined

            for (var i = 0; i < defsEntire.length; i++) {
              itemEntire = defsEntire[i];

              if (itemEntire.obj != res.obj) {
                continue;
              }

              currRating = 0;

              if (itemEntire.objType == currType) {
                currRating++;
              } else if (itemEntire.objType != 'any') {
                continue;
              }

              if (itemEntire.pf == res.phPlanFact) {
                currRating++;
              } else if (itemEntire.pf != 'any') {
                continue;
              }

              if (itemEntire.area == currArea) {
                currRating++;
              } else if (itemEntire.area != 'any') {
                continue;
              }

              if (itemEntire.solution == reqParams.solution) {
                currRating++;
              } else if (!isEmpty(itemEntire.solution)) {
                continue;
              }

              if (itemEntire.developer == reqParams.developer) {
                currRating++;
              } else if (!isEmpty(itemEntire.developer)) {
                continue;
              }

              if (itemEntire.version == reqParams.version) {
                currRating++;
              } else if (!isEmpty(itemEntire.version)) {
                continue;
              }

              if (itemEntire.easyRP_ID == reqParams.easyRP_ID) {
                currRating++;
              } else if (!isEmpty(itemEntire.easyRP_ID)) {
                continue;
              }

              if (currRating > bestRating) {
          			bestRating = currRating;
          			foundDefs = itemEntire;
          		}

            }

            // if (defsFilter.length > 0) {
            //   res.defs = defsFilter[0];
            // }

            if (foundDefs != undefined) {
              res.defs = foundDefs;
              defsResult = foundDefs.result.toLowerCase();

            db.collection("set").find({}).toArray(function(err, setsEntire){

              var setsFilter = setsEntire.filter(function(itemEntire) {
                return ((itemEntire.obj.toLowerCase() == defsResult)
                  && (itemEntire.solution == reqParams.solution || isEmpty(itemEntire.solution))
                  && (itemEntire.developer == reqParams.developer || isEmpty(itemEntire.developer))
                  && (itemEntire.version == reqParams.version || isEmpty(itemEntire.version))
                  && (itemEntire.easyRP_ID == reqParams.easyRP_ID || isEmpty(itemEntire.easyRP_ID))
                );
              });

              if (setsFilter.length > 0) {
                res.sets = setsFilter[0];
              }

              response.set({'Content-Type': 'text/html; charset=utf-8'});
              response.send(JSON.stringify(res));
            });
          } else {
            response.set({'Content-Type': 'text/html; charset=utf-8'});
            response.send(JSON.stringify(res));
          }
      });
  //         res.send(users)
    });
  });
  //
}

function returnObjByAttribute(res, currType, currArea, defsEntire) {

  var defsFilter = defsEntire.filter(function(itemEntire) {
    return (itemEntire.area == currArea && itemEntire.objType == currType);
  });
  // console.log(currArea);
  // console.log(currType);
  // console.log(defsFilter);

  objectFound = '';
  for (var i = 0; i < defsFilter.length; i++) {
    item = defsFilter[i];
    if (item.result != null && item.result != undefined && item.result != '' && item.result != 0) {
        return item.result;
    }
  }

  return objectFound;

}

function isEmpty(element) {
  if (element != null && element != undefined && element != '' && element != 0) {
    return false;
  } else {
    return true;
  }
}

function returnArea(res) {

    if (res.arrArea.length == 0) {
      return 'undefined';
    }

    res.arrArea.sort(function(a, b) {
      return b.rate - a.rate;
    });

    if (res.arrArea.length > 1) {
      if (res.arrArea[0].rate == res.arrArea[1].rate) {
          return 'undefined';
        //return res.arrArea[0].area;
      } else {
        return res.arrArea[0].area;
      }
    } else {
      return res.arrArea[0].area;
    }

}

function addTerm(term, res, vocEntire) {

    //console.log(term);
    var currEthalon;

     currEthalon = term.ethalon;

    while (currEthalon.substr(0, 6) == '[term~') {
        indexEndTerm = currEthalon.indexOf(']');
        currTerm = currEthalon.substr(6, indexEndTerm - 6);

        var vocCurrTerm = vocEntire.filter(function(itemEntire) {
          return (itemEntire.phrase == currTerm);
        });

        if (vocCurrTerm.length > 0) {
          addTerm(vocCurrTerm[0], res, vocEntire);
        }

        currEthalon = currEthalon.substr(indexEndTerm + 2);
    }

    res.readPeriodPo = false;
    res.readPeriodS = false;
    res.readPeriodZa  = false;

    res.typeReport = res.typeReport + Number(term.report);
    res.typeList = res.typeList + Number(term.list);
    res.typeObj = res.typeObj + Number(term.object);

    //if ((term.obj_type != null && term.obj_type != undefined && term.obj_type != '' && term.obj_type != 0) && (res.obj == '')) {
    // if ((term.obj_type != null && term.obj_type != undefined && term.obj_type != '' && term.obj_type != 0) && (res.obj == '')) {
    //   res.obj = term.ethalon;
    // }
    if (currEthalon == '') {
      return undefined;
    }

    res.arrParsed.push(term.ethalon);

    // console.log(term.obj_type);
    // console.log(res.obj);
    // console.log(currEthalon);

    //if ((term.obj_type != null) && (term.obj_type != undefined) && (term.obj_type != '')) {
    if (term.obj_type > 0) {
        if (res.obj == '') {
          res.obj = currEthalon;
          res.objWeight = term.obj_type * 1.1;
        } else if (res.obj == 'продажи' && currEthalon == 'вд') {
          res.obj = 'вд';
        } else if (term.obj_type > res.objWeight) {
          res.obj = currEthalon;
          res.objWeight = term.obj_type;
        }
        //res.arrIndex.push(term.index);
    }

    if ((term.area != null) && (term.area != undefined) && (term.area != '')) {

        currIndex = -1;
        for (var i = 0; i < res.arrArea.length; i++) {
            if (res.arrArea[i].area == term.area) {
              currIndex = i;
              break;
            }
        }

        if (currIndex != -1) {
          res.arrArea[currIndex].rate = res.arrArea[currIndex].rate + 1 + term.obj_type * 0.1;
        } else {
          area = {};
          area.area = term.area;
          area.rate = 1 + term.obj_type * 0.1;
          res.arrArea.push(area);
        }
    }

    if ((term.analitics != null) && (term.analitics != undefined) && (term.analitics != ''))  {
        res.arrAn.push(term.analitics);
        res.analytics = res.analytics + term.ethalon + ' ';
    }

    // console.log(term);
    // console.log(term.index);
    if ((term.index != null) && (term.index != undefined) && (term.index != ''))  {
        res.arrIndex.push(term.index);
    }

    if ((term.sort != null) && (term.sort != undefined) && (term.sort != ''))  {
        if (term.sort == 'убывание') {
          res.sortType = 'DESC';
        } else {
          res.sortType = 'ASC';
        }
    }

    if ((term.filter != null) && (term.filter != undefined) && (term.filter != '') && (currEthalon = 'собственный'))  {
      res.filterOwn = true;
    }

    if (term.ethalon == 'план') {
      res.phPlan++;
    } else if (term.ethalon == 'факт') {
      res.phFact++;
    }

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
    } else if ((text == 'прошлый') || (text == 'прошлого') || (text == 'прошлой') || (text == 'прошлую') || (text == 'прошлом')) {
      res.readPastPeriod = true;
      res.wordRecognized = 'прошлый';
    } else if ((text == 'следующий') || (text == 'следующего') || (text == 'следующем') || (text == 'следующей') || (text == 'следующую')) {
      res.readNextPeriod = true;
      res.wordRecognized = 'следующий';
    } else if (text == 'номер') {
      res.readObjNum = true;
      res.wordRecognized = 'номеробъекта';
    }

    if (res.wordRecognized != '') {
      return;
    }

    currNumb = Number(text);
    if (isNaN(currNumb)) {
      currNumb = -1;
    }

    if (res.readObjNumber) {
      res.objNum = text;
      res.readObjNum = false;
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

app.get("/api/def", function(req, res){

    mongoClient.connect(url, function(err, db){
        db.collection("def").find({}).toArray(function(err, users){

            // users.sort(function(a, b) {
            //   return a.word0.localeCompare(b.word0);
            // });

            res.send(users)
            db.close();
        });
    });
});

app.get("/api/set", function(req, res){

    mongoClient.connect(url, function(err, db){
        db.collection("set").find({}).toArray(function(err, users){

            // users.sort(function(a, b) {
            //   return a.word0.localeCompare(b.word0);
            // });

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

app.post("/api/def", jsonParser, function (req, res) {

    //console.log(req.body);

    if(!req.body) return res.sendStatus(400);

    arr = req.body;
    // arr.forEach(function(item, i, arr) {
    //
    //   phrase = item.phrase;
    //   splitArr = phrase.split(' ', 50);
    //
    //   splitArr.forEach(function(itemw, iw, splitArr) {
    //     //console.log(item);
    //     item['word' + iw] = itemw;
    //   });
    //
    //   //console.log(item);
    //
    // });

    // arr.sort(function(a, b) {
    //   return a.word0.localeCompare(b.word0);
    // });

      mongoClient.connect(url, function(err, db){

          db.collection("def").remove({});

          db.collection("def").insertMany(arr, function(err, result){

              if(err) return res.status(400).send();

              //res.send(user);
              db.close();
           });
       });
});

app.post("/api/set", jsonParser, function (req, res) {

    //console.log(req.body);

    if(!req.body) return res.sendStatus(400);

    arr = req.body;
    // arr.forEach(function(item, i, arr) {
    //
    //   phrase = item.phrase;
    //   splitArr = phrase.split(' ', 50);
    //
    //   splitArr.forEach(function(itemw, iw, splitArr) {
    //     //console.log(item);
    //     item['word' + iw] = itemw;
    //   });
    //
    //   //console.log(item);
    //
    // });

    // arr.sort(function(a, b) {
    //   return a.word0.localeCompare(b.word0);
    // });

      mongoClient.connect(url, function(err, db){

          db.collection("set").remove({});

          db.collection("set").insertMany(arr, function(err, result){

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
