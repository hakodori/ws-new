var express = require("express");
var bodyParser = require("body-parser");
var mongoClient = require("mongodb").MongoClient;
var objectId = require("mongodb").ObjectID;

var app = express();
var jsonParser = bodyParser.json();
//var url = process.env.MONGODB_URI;
var url = "mongodb://sa:123321@ds055875.mlab.com:55875/easyrp";

app.use(express.static(__dirname + "/public"));
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
    // arr.forEach(function(item, i, arr) {
    //   //console.log( i + ": " + item.name + " " + item.age);

    //   var userName = item.name;
    //   var userAge = item.age;
    //   var user = {name: userName, age: userAge};
    //
      mongoClient.connect(url, function(err, db){
          db.collection("voc").insertMany(arr, function(err, result){

              if(err) return res.status(400).send();

              //res.send(user);
              db.close();
           });
       });
    // });
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
