var socket;
var msg;
var title = $("title").text();
var wall = "default";
var currentPid = undefined;
var noteCount = 1;
var notifCount = 0;


$(document).ready(function () {

    //buttons event
    $("#btnAdd").on("click", function (e) {
        e.preventDefault();
        currentPid = undefined;
        $("#newModal").modal();
    });

    $("#newNote").bind("submit", function (e) {
        e.preventDefault();
        noteCount++;

        //new note
        if (currentPid == undefined) {
            var jsonData = modalToJson();
            jsonData.pid = noteCount;

            var note = createNoteFromJson(jsonData);
            saveNoteDb(noteToJson(note));
        }
        else { //update note

            var dataJson = modalToJson();

            var note = $(".draggable[pid=" + currentPid + "]");
            var old = noteToJson(note);
            dataJson.pid = old.pid;
            dataJson.left = old.left;
            dataJson.top = old.top;

            updateNoteFromJson(dataJson);
            updateNoteDb(noteToJson(note));
        }

        $(".draggable").draggable();
        $(".draggable").resizable();
        $("#newModal").modal('hide');

    });


    //modal hide, reset
    $('#newModal').on('hidden.bs.modal', function () {
        currentPid = undefined;
        $("#newNote")[0].reset();
    });

    //wall id
    var path = window.location.pathname;

    if (path == "/") {
        var id = idGenerator();
        window.location.replace("/"+id);
    }
    else {
        wall = path.substr(1, path.length);
    }


    //socketio
    socket = io.connect();

    console.log("emit loadNotes " + wall);
    socket.emit("loadNotes", {"wall": wall});

    socket.on('loadNotes', function (notes) {
        for (var note in notes) {
            createNoteFromJson(notes[note]);
            noteCount = notes[note].pid;
        }

        $(".draggable").draggable();
        $(".draggable").resizable();

        //update on drag stop
        $("#notes").delegate(".draggable", "dragstop", function (event, ui) {
            updateNoteDb(noteToJson($(this)));
        });

        //remove on button click
        $("#notes").delegate(".remove-note", "click", function () {
            deleteNoteDb(noteToJson($(this).parent()));
            $(this).parent().remove();
        });

        //edit on double click
        $("#notes").delegate(".draggable", "dblclick", function () {
            currentPid = $(this).attr("pid");
            jsonToModal(noteToJson($(this)));
        });

        //edit on button click
        $("#notes").delegate(".edit-note", "click", function () {
            currentPid = $(this).attr("pid");
            jsonToModal(noteToJson($(this).parent()));
        });

        //show buttons on mouseover/mouseout
        $("#notes").delegate(".draggable", "mouseover", function () {
            $(this).find(".close").show();
        });

        $("#notes").delegate(".draggable", "mouseout", function () {
            $(this).find(".close").hide();
        });
        
        //resize
        $("#notes").delegate(".draggable","resizestop", function (event, ui) {
            updateNoteDb(noteToJson($(this)));
        });
    });

    socket.on('saveNote', function (data) {
        console.log("on saveNote " + JSON.stringify(data));
        createNoteFromJson(data);
        $(".draggable").draggable();
        $(".draggable").resizable();
        notifCount++;
        updateNotifCount();
    });

    socket.on('updateNote', function (data) {
        console.log("on updateNote " + JSON.stringify(data));
        updateNoteFromJson(data);
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

function updateNoteDb(jsonData) {
    console.log("emit updateNote " + JSON.stringify(jsonData));
    socket.emit("updateNote", jsonData);
}

function saveNoteDb(jsonData) {
    console.log("emit saveNote " + JSON.stringify(jsonData));
    socket.emit("saveNote", jsonData);
}

function deleteNoteDb(jsonData) {
    console.log("emit deleteNote " + JSON.stringify(jsonData));
    socket.emit("deleteNote", jsonData);
}


function noteToJson(note) {
    var dataJson = {
        "pid": note.attr("pid"),
        "left": note.css("left"),
        "top": note.css("top"),
        "width": note.css("width"),
        "height": note.css("height"),
        "title": note.find(".title").text(),
        "content": note.find(".content").text(),
        "url": note.find(".url").attr("src"),
        "color": note.css("background-color")
    };
    return dataJson;
}

function createNoteFromJson(dataJson) {
    var note = jQuery('<div/>');
    note.html('<span class="close remove-note" pid=' + dataJson.pid + '><span class="glyphicon glyphicon-remove"></span></span>')
        .append('<span class="close edit-note" pid=' + dataJson.pid + '><span class="glyphicon glyphicon-pencil"></span></span>')
        .attr("class", "draggable")
        .css("background-color", dataJson.color)
        .css("left", dataJson.left)
        .css("top", dataJson.top)
        .css("width", dataJson.width)
        .css("height", dataJson.height)
        .attr("pid", dataJson.pid)
        .append('<p class="title">' + dataJson.title + '</p>')
        .append('<p class="content">' + dataJson.content + '</p>');

    if (dataJson.url) {
        note.append('<a href="' + dataJson.url + '"><img class="url" src="' + dataJson.url + '" width="100%"/></a>');
    }

    $("#notes").append(note);
    $("#notes").find(".close").hide();
    return note;
}

function updateNoteFromJson(dataJson) {

    var note = $(".draggable[pid=" + dataJson.pid + "]");

    note.css("top", dataJson.top)
    note.css("left", dataJson.left)
    note.css("width", dataJson.width)
    note.css("height", dataJson.height)
    note.find(".title").text(dataJson.title)
    note.find(".content").text(dataJson.content)
    note.find(".url").attr("src", dataJson.url)
    note.css("background-color", dataJson.color);
}

function jsonToModal(dataJson) {
    $("#title").val(dataJson.title);
    $("#content").val(dataJson.content);
    $("#url").val(dataJson.url);
    $("#color").val(rgb2hex(dataJson.color));
    $("#newModal").modal();
}

function modalToJson() {
    var dataJson = {
        "color": $("#color").val(),
        "title": $("#title").val(),
        "content": $("#content").val(),
        "url": $("#url").val()
    };
    return dataJson;
}


//from http://wowmotty.blogspot.fr/2009/06/convert-jquery-rgb-output-to-hex-color.html
function rgb2hex(rgb) {
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    return "#" +
        ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2);
}

//from http://stackoverflow.com/a/105074
function guidGenerator() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

//from https://gist.github.com/gordonbrander/2230317
var idGenerator = function () {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return '_' + Math.random().toString(36).substr(2, 9);
};
