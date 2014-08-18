var http = require('http');
var https = require('https');
var fs = require('fs');
var net = require('net');
var sio = require('socket.io');
var express = require('express');
var morgan = require('morgan');
var path = require('path');
var url = require('url');
var swig = require('swig');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cookie = require('cookie');
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/wall');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var session = require('express-session');

var APP_PORT = 8081;

var consumerKey = "***";
var consumerSecret = "***";
var callBackUrl = "http://***/auth/login/callback";
var sessionSecret = "***";

//main
var app = express();
var server = app.listen(APP_PORT);
var io = sio.listen(server);

app.use(cookieParser(sessionSecret));

//body-parser
app.use(bodyParser());

//log
app.use(morgan('dev'));

app.use(session({
    secret: sessionSecret,
    saveUninitialized: true,
    resave: true}));
app.use(passport.initialize());
app.use(passport.session());

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

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});


passport.use(new TwitterStrategy({
        consumerKey: consumerKey,
        consumerSecret: consumerSecret,
        callbackURL: callBackUrl
    },
    function (token, tokenSecret, profile, done) {

        process.nextTick(function () {
            done(null, profile);
        })

    }
));

//google auth
app.get('/auth/login', passport.authenticate('twitter'));

app.get('/auth/login/callback', passport.authenticate('twitter', {
    successRedirect: '/auth/redirect',
    failureRedirect: '/auth/login'
}));

app.get('/auth/redirect', function (req, res) {
    var url = req.session.lastPage; //redirect to last wall
    res.cookie('username', req.session.passport.user["username"], {signed: true});
    res.redirect(url);
});

app.get('/auth/logout', function (req, res) {
    req.logout();

    var url = req.session.lastPage; //redirect to last wall

    req.session.destroy(function () {
        res.clearCookie('connect.sid', { path: '/' });
        res.clearCookie('username', { path: '/' });
        res.redirect(url);
    });
});

//main page

app.get('/', function (req, res) {
    var id = "w" + Math.random().toString(36).substr(2, 15);
    res.redirect('/' + id);
});

app.get('/*', function (req, res) {    //app.get('/*', ensureAuthenticated, function (req, res) {
    req.session.lastPage = req.url;
    res.render('main.html', { user: req.session.passport.user});
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login')
}


/*
 io.set('authorization', function (handshakeData, accept) {

 if (handshakeData.headers.cookie) {

 handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
 handshakeData.sessionID = cookieParser.signedCookie(handshakeData.cookie['connect.sid'], sessionSecret);

 //check if cookie contain a signed username
 if(handshakeData.cookie['username']) {
 handshakeData.username = cookieParser.signedCookie(handshakeData.cookie['username'], sessionSecret);
 if(handshakeData.username == false) {
 return accept('Bad auth.', false);
 }
 }
 else {
 return accept('Not auth.', false);
 }
 }
 else {
 return accept('No cookie transmitted.', false);
 }

 return accept(null, true);
 });
 */

function getUsernameFromSignedCookie(cookies) {
    var username = false;
    var _cookie = cookie.parse(cookies);

    if (_cookie['username']) {
        username = cookieParser.signedCookie(_cookie['username'], sessionSecret);
        if (username != false) {
            return username
        }
    }
    else {
        return false
    }
}

io.sockets.on('connection', function (socket) {

    //load
    socket.on("loadNotes", function (data) {

        var author = getUsernameFromSignedCookie(socket.handshake.headers.cookie);
        if (author) {
            socket.author = author;
        }

        socket.join(data.wall);
        socket.room = data.wall;

        console.log("loadNotes: " + JSON.stringify(data));
        var collection = db.get(socket.room);
        collection.find({}, {sort: { pid: 1 }}, function (err, notes) {
            socket.emit('loadNotes', notes);
        });

        countClients(socket);
    });

    //save
    socket.on('saveNote', function (data) {

        if (socket.author) {
            data["author"] = socket.author;

            console.log("saveNote:" + JSON.stringify(data));
            var collection = db.get(socket.room);
            collection.insert(data);
            //socket.broadcast.to(socket.room).emit('saveNote', data);
            io.sockets.in(socket.room).emit('saveNote', data);
        }
    });

    //update
    socket.on('updateNote', function (data) {
        if (socket.author) {
            console.log("updateNote: " + JSON.stringify(data));
            var collection = db.get(socket.room);
            collection.update({"pid": data.pid}, {$set: data});
            //socket.broadcast.to(socket.room).emit('updateNote', data);
            io.sockets.in(socket.room).emit('updateNote', data);
        }
    });

    //move
    socket.on('moveNote', function (data) {
        if (socket.author) {
            console.log("moveNote: " + JSON.stringify(data));
            var collection = db.get(socket.room);
            collection.update({"pid": data.pid}, {$set: {
                "top": data.top,
                "left": data.left,
                "width": data.width,
                "height": data.height
            }});
            //socket.broadcast.to(socket.room).emit('moveNote', data);
            io.sockets.in(socket.room).emit('moveNote', data);
        }
    });

    //delete
    socket.on('deleteNote', function (data) {
        if (socket.author) {
            console.log("deleteNote: " + JSON.stringify(data));
            var collection = db.get(socket.room);
            collection.remove({"pid": data});
            //socket.broadcast.to(socket.room).emit('deleteNote', data);
            io.sockets.in(socket.room).emit('deleteNote', data);
        }
    });


    socket.on('disconnect', function () {
        console.log("disconnect: " + socket.room);
        countClients(socket);
    });

    function countClients(socket) {

        var clientsCount = [];

        for (var i = 0; i < io.sockets.sockets.length; i++) {
            if (io.sockets.sockets[i].room == socket.room) {
                if (io.sockets.sockets[i].author) {
                    clientsCount.push(io.sockets.sockets[i].author);
                }
                else {
                    clientsCount.push("anonymous");
                }
            }
        }

        io.sockets.in(socket.room).emit('clientsCount', clientsCount);
    }
});
