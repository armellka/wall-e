var socket;
var msg;
var title = $("title").text();
var wall = "notecollection";
var currentPid = undefined;
var noteCount = 1;
var notifCount = 0;

$(window).focus(function () {
    notifCount = 0;
    updateNotifCount();
});

function updateNotifCount() {
    if (notifCount == 0) {
        $("title").text(title);
    }
    else {
        $("title").text(title + " (" + notifCount + ")");
    }
}


$(document).ready(function () {

    //buttons event
    $("#btnAdd").on("click", function () {
        currentPid = undefined;
        $("#newModal").modal();
    });

    $("#btnSave").on("click", function () {
        noteCount++;
        var data = {
            "pid": noteCount,
            "left": "100px",
            "top": "100px",
            "color": $("#color").val(),
            "title": $("#title").val(),
            "content": $("#content").val(),
            "url": $("#url").val()
        };


        if (currentPid == undefined) {
            var note = createNote(data);
            saveNote(note);
        }
        else {
            var note = $(".draggable[pid=" + currentPid + "]");
            note.find(".title").text($("#title").val());
            note.find(".content").text($("#content").val());
            note.find(".url").attr("src", $("#url").val());

            updateNote(note);
        }

        $(".draggable").draggable();
        $("#newModal").modal('hide');

    });


    //modal hide, reset
    $('#newModal').on('hidden.bs.modal', function () {
        currentPid = undefined;
        $("#newNote")[0].reset();
    });

    //wall id
    if (QueryString.wall != undefined)
        wall = QueryString.wall;

    //socketio
    socket = io.connect();

    console.log("emit loadNotes " + wall);
    socket.emit("loadNotes", {"wall": wall});

    socket.on('loadNotes', function (notes) {
        for (var note in notes) {
            createNote(notes[note]);
            noteCount = notes[note].pid;
        }

        $(".draggable").draggable();

        //drag
        $("#notes").delegate(".draggable", "dragstop", function (event, ui) {
            updateNote($(this));
        });

        //close
        $("#notes").delegate(".close-note", "click", function () {
            deleteNote($(this));
        });

        //double click
        $("#notes").delegate(".draggable", "dblclick", function () {
            currentPid = $(this).attr("pid");
            var note = $(".draggable[pid=" + currentPid + "]");
            $("#title").val(note.find(".title").text());
            $("#content").val(note.find(".content").text());
            $("#url").val(note.find(".url").attr("src"));
            $("#newModal").modal();

        });

    });

    socket.on('saveNote', function (data) {
        console.log("on saveNote " + JSON.stringify(data));
        createNote(data);
        $(".draggable").draggable();
        notifCount++;
        updateNotifCount();
    });

    socket.on('updateNote', function (data) {
        console.log("on updateNote " + JSON.stringify(data));
        var note = $(".draggable[pid=" + data.pid + "]");
        note.css("top", data.top).css("left", data.left);
        note.find(".title").text(data.title);
        note.find(".content").text(data.content);
        note.find(".url").attr("src", data.url);
    });

    socket.on('deleteNote', function (data) {
        console.log("on deleteNote " + JSON.stringify(data));
        $(".draggable[pid=" + data.pid + "]").remove();
    });

    socket.on('clientsCount', function (data) {
        console.log("on clientsCount " + JSON.stringify(data));
        $("#users").text(data);
    });
});


function updateNote(note) {
    var req = {
        "pid": note.attr("pid"),
        "left": note.css("left"),
        "top": note.css("top"),
        "title": note.find(".title").text(),
        "content": note.find(".content").text(),
        "url": note.find(".url").attr("src"),
        "color": note.css("background-color")
    };
    console.log("emit updateNote " + JSON.stringify(req));
    socket.emit("updateNote", req);
}

function saveNote(note) {
    var req = {
        "pid": note.attr("pid"),
        "left": note.css("left"),
        "top": note.css("top"),
        "title": note.find(".title").text(),
        "content": note.find(".content").text(),
        "url": note.find(".url").attr("src"),
        "color": note.css("background-color")
    };
    console.log("emit saveNote " + JSON.stringify(req));
    socket.emit("saveNote", req);
}

function deleteNote(note) {
    var req = {
        "pid": note.attr("pid")
    };
    console.log("emit deleteNote " + JSON.stringify(req));
    socket.emit("deleteNote", req);
    note.parent().remove();
}

function createNote(data) {
    var note = jQuery('<div/>', {});
    note.html('<span class="close close-note" pid=' + data.pid + '>&times;</span>');
    note.attr("class", "draggable")
        .css("background-color", data.color)
        .css("left", data.left)
        .css("top", data.top)
        .attr("pid", data.pid)
        .append('<p class="title">' + data.title + '</p>')
        .append('<p class="content">' + data.content + '</p>');
    if (data.url) {
        note.append('<a href="' + data.url + '"><img class="url" src="' + data.url + '" width="100%"/></a>');
    }

    $("#notes").append(note);
    return note;
}


var QueryString = function () {
    // This function is anonymous, is executed immediately and
    // the return value is assigned to QueryString!
    var query_string = {};
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        // If first entry with this name
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = pair[1];
            // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
            var arr = [ query_string[pair[0]], pair[1] ];
            query_string[pair[0]] = arr;
            // If third or later entry with this name
        } else {
            query_string[pair[0]].push(pair[1]);
        }
    }
    return query_string;
}();
