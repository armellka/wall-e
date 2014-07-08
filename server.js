var http = require('http');
var https = require('https');
var fs = require('fs');
var net = require('net');
var sio = require('socket.io');
var express = require('express');
var morgan = require('morgan');
var path = require('path');
var swig = require('swig');
var bodyParser = require('body-parser');
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/wall');

var APP_PORT = 8081;

//main
var app = express();
var server = app.listen(APP_PORT);
var io = sio.listen(server);

//body-parser
app.use(bodyParser());

//log
app.use(morgan('dev'));

//static files
app.use("/public", express.static(path.join(__dirname, 'public')));

//swig template engine
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

//disable cache in development
swig.setDefaults({ cache: false });


//GO
console.log('Wall running on port: ' + APP_PORT);

// Make our db accessible to our router
app.use(function (req, res, next) {
    req.db = db;
    next();
});

//main page
app.get('/', function (req, res) {
    res.render('main.html', { title: 'Express' });
});


io.sockets.on('connection', function (socket) {

    //load
    socket.on("loadNotes", function (data) {
        socket.join(data.wall);
        socket.room = data.wall;

        console.log("loadNotes: " + JSON.stringify(data));
        var collection = db.get(data.wall);
        collection.find({}, {sort: { pid: 1 }}, function (err, notes) {
            socket.emit('loadNotes', notes);
        });

        countClients(socket);
    });

    //save
    socket.on('saveNote', function (data) {
        console.log("saveNote:" + JSON.stringify(data));
        var collection = db.get(socket.room);
        collection.insert(data);
        socket.broadcast.to(socket.room).emit('saveNote', data);
    });

    //update
    socket.on('updateNote', function (data) {
        console.log("updateNote: " + JSON.stringify(data));
        var collection = db.get(socket.room);
        collection.update({"pid": data.pid}, {$set: data});
        socket.broadcast.to(socket.room).emit('updateNote', data);
    });

    //delete
    socket.on('deleteNote', function (data) {
        console.log("deleteNote: " + JSON.stringify(data));
        var collection = db.get(socket.room);
        collection.remove({"pid": data.pid});
        socket.broadcast.to(socket.room).emit('deleteNote', data)
    });


    socket.on('disconnect', function () {
        console.log("disconnect: " + socket.room);
        countClients(socket);
    });

    function countClients(socket) {

        var clientsCount = 0;
        var clients = io.sockets.adapter.rooms[socket.room];

        for (var client in clients) {
            clientsCount++;
        }

        io.sockets.in(socket.room).emit('clientsCount', clientsCount);
    }

});

