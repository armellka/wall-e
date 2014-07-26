var socket;
var msg;
var title = $("title").text();
var wall = "default";
var currentPid = undefined;
var noteCount = 1;
var notifCount = 0;


$(document).ready(function () {

    $("#newModal").draggable({handle: ".modal-header", opacity: 0.8});

    //buttons event
    $("#btnAdd").on("click", function (e) {
        e.preventDefault();
        resetModal();
        currentPid = undefined;
        $("#newModal").modal({backdrop: 'static'});
    });

    $("#content").summernote({
        toolbar: [
            ['style', ['bold', 'italic', 'underline', 'clear']],
            ['font', ['strikethrough']],
            ['fontsize', ['fontsize']],
            ['color', ['color']],
            ['insert', ['link', 'picture']]
        ]
    });

    if($("#userName").text() == "") {
        $("#btnAdd").attr("disabled", "disabled");
    };


    $("#newNote").bind("submit", function (e) {
        e.preventDefault();

        //new note
        if (currentPid == undefined) {
            noteCount++;
            var jsonData = modalToJson();
            jsonData.pid = noteCount;
            jsonData.zindex = getNextZindex();
            jsonData.date = new Date().getTime() / 1000;
            jsonData.author = $("#userName").text();
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
            dataJson.zindex = getNextZindex();
            dataJson.date = new Date().getTime() / 1000;

            updateNoteFromJson(dataJson);
            updateNoteDb(noteToJson(note));
        }

        $("#newModal").modal('hide');
    });

    //update on drag stop
    $("#notes").delegate(".draggable", "dragstop", function (event, ui) {
        moveNoteDb(noteToJson($(this)));
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
    $("#notes").delegate(".draggable", "resizestop", function (event, ui) {
        moveNoteDb(noteToJson($(this)));
    });

    //wall id
    var path = window.location.pathname;
    wall = path.substr(1, path.length);

    //socketio
    socket = io.connect();

    console.log("emit loadNotes " + wall);
    socket.emit("loadNotes", {"wall": wall});

    socket.on('loadNotes', function (notes) {

        for (var note in notes) {
            createNoteFromJson(notes[note]);
            noteCount = notes[note].pid;
        }

    });

    socket.on('saveNote', function (data) {
        console.log("on saveNote " + JSON.stringify(data));
        createNoteFromJson(data);
        noteCount = data.pid;
        notifCount++;
        updateNotifCount();
    });

    socket.on('updateNote', function (data) {
        console.log("on updateNote " + JSON.stringify(data));
        updateNoteFromJson(data);
    });

    socket.on('moveNote', function (data) {
        console.log("on moveNote " + JSON.stringify(data));
        moveNoteFromJson(data);
    });

    socket.on('deleteNote', function (data) {
        console.log("on deleteNote " + JSON.stringify(data));
        $(".draggable[pid=" + data + "]").remove();
    });

    socket.on('clientsCount', function (data) {
        $("#users").text(data.length);
        $("#users").attr("data-original-title","");
        var clients = "";
        for(client in data) {
            if(clients == "")
                clients +=  data[client];
            else
                clients += " - " + data[client];
        }
        $("#users").attr("data-original-title", clients);
        $("#users").tooltip();
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


function moveNoteDb(jsonData) {
    var data = {
	"pid": jsonData.pid,
	"top": jsonData.top,
	"left": jsonData.left,
	"width": jsonData.width,
	"height": jsonData.height
    };
    console.log("emit moveNote " + JSON.stringify(data));
    socket.emit("moveNote", data);
}

function saveNoteDb(jsonData) {
    console.log("emit saveNote " + JSON.stringify(jsonData));
    socket.emit("saveNote", jsonData);
}

function deleteNoteDb(jsonData) {
    console.log("emit deleteNote " + JSON.stringify(jsonData.pid));
    socket.emit("deleteNote", jsonData.pid);
}


function noteToJson(note) {
    var dataJson = {
        "pid": parseInt(note.attr("pid")),
        "left": note.css("left"),
        "top": note.css("top"),
        "width": note.css("width"),
        "height": note.css("height"),
        "color": note.css("background-color"),
        "title": note.find(".title").text(),
        "content": note.find(".content").html(),
        "date": note.find(".date").attr("data-unix"),
        "zindex": parseInt(note.css("z-index")),
        "author": note.find(".author").text()
    };

    return dataJson;
}

function createNoteFromJson(dataJson) {
    var note = jQuery('<div/>');

    note.html('<span class="close remove-note" pid=' + dataJson.pid + '><span class="glyphicon glyphicon-remove"></span></span>')
        .append('<span class="close edit-note" pid=' + dataJson.pid + '><span class="glyphicon glyphicon-pencil"></span></span>')
        .append('<span class="close move-note" pid=' + dataJson.pid + '><span class="glyphicon glyphicon-move"></span></span>')
        .attr("class", "draggable")
        .attr("pid", dataJson.pid)
        .css("background-color", dataJson.color)
        .css("left", dataJson.left)
        .css("top", dataJson.top)
        .css("width", dataJson.width)
        .css("height", dataJson.height)
        .css("z-index", dataJson.zindex)
        .append('<p class="title"></p>')
        .append('<p class="content"></p>')
        .append('<p class="footer"><span class="author"></span> - <span class="date" data-unix="' + dataJson.date + '">' + moment.unix(dataJson.date).format('MMMM Do YYYY, h:mm:ss a') + '</span></p>');

    //set data
    note.find(".title").text(dataJson.title);
    $("#content").code(dataJson.content); //remove javascript
    note.find(".content").html($("#content").code());
    note.find(".author").text(dataJson.author);

    //add note
    $("#notes").append(note);
    $("#notes").find(".close").hide();

    //compute color contrast
    note.contrastColor();

    //attach events
    note.draggable({handle: ".move-note", opacity: 0.8 }); //stack: ".draggable"
    note.resizable();

    if($("#userName").text() == "") {
        note.draggable('disable');
        note.resizable('disable');
        note.unbind();
        $("#notes").unbind();
    };


    return note;
}

function updateNoteFromJson(dataJson) {

    var note = $(".draggable[pid=" + dataJson.pid + "]");

    note.css("top", dataJson.top)
    note.css("left", dataJson.left)
    note.css("width", dataJson.width)
    note.css("height", dataJson.height)
    note.css("z-index", dataJson.zindex)
    note.css("background-color", dataJson.color)
    note.find(".title").text(dataJson.title)
    $("#content").code(dataJson.content); //remove javascript
    note.find(".content").html($("#content").code());
    note.find(".date").attr("data-unix", dataJson.date);
    note.find(".date").text(moment.unix(dataJson.date).format('MMMM Do YYYY, h:mm:ss a'));
    note.find(".author").text(dataJson.author);
    $('.draggable').contrastColor();
}

function moveNoteFromJson(dataJson) {
    var note = $(".draggable[pid=" + dataJson.pid + "]");

    note.css("top", dataJson.top)
    note.css("left", dataJson.left)
    note.css("width", dataJson.width)
    note.css("height", dataJson.height)
}


function jsonToModal(dataJson) {
    $("#title").val(dataJson.title);
    $("#content").code(dataJson.content);
    $("#color").val(rgb2hex(dataJson.color));
    $("#newModal").modal({backdrop: 'static'});
}

function modalToJson() {
    var dataJson = {
        "color": $("#color").val(),
        "title": $("#title").val(),
        "content": $("#content").code()
    };
    return dataJson;
}

function resetModal() {
    //currentPid = undefined;
    $("#newNote")[0].reset();
    $("#newModal").css("left", 0);
    $("#newModal").css("top", 0);
    $("#content").code("");
}

function getNextZindex() {
    var zindexMax = 0;
    $(".draggable").each(function () {
        var zindex = parseInt($(this).css("z-index"));
        if (zindex > zindexMax) {
            zindexMax = zindex;
        }
    });

    return zindexMax + 1;
}

//from http://wowmotty.blogspot.fr/2009/06/convert-jquery-rgb-output-to-hex-color.html
function rgb2hex(rgb) {
    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    return "#" +
        ("0" + parseInt(rgb[1], 10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[2], 10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[3], 10).toString(16)).slice(-2);
}

//from http://codeitdown.com/jquery-color-contrast/
$.fn.contrastColor = function () {
    return this.each(function () {
        var bg = $(this).css('background-color');
        //use first opaque parent bg if element is transparent
        if (bg == 'transparent' || bg == 'rgba(0, 0, 0, 0)') {
            $(this).parents().each(function () {
                bg = $(this).css('background-color')
                if (bg != 'transparent' && bg != 'rgba(0, 0, 0, 0)') return false;
            });
            //exit if all parents are transparent
            if (bg == 'transparent' || bg == 'rgba(0, 0, 0, 0)') return false;
        }
        //get r,g,b and decide
        var rgb = bg.replace(/^(rgb|rgba)\(/, '').replace(/\)$/, '').replace(/\s/g, '').split(',');
        var yiq = ((rgb[0] * 299) + (rgb[1] * 587) + (rgb[2] * 114)) / 1000;
        if (yiq >= 128) {
            $(this).find(".title").removeClass('light-color ');
            $(this).find(".content").removeClass('light-color');
            $(this).find(".date").removeClass('light-color');
            $(this).find(".close").removeClass('light-color light-shadow');
        }
        else {
            $(this).find(".title").addClass('light-color');
            $(this).find(".content").addClass('light-color');
            $(this).find(".date").addClass('light-color');
            $(this).find(".close").addClass('light-color light-shadow');
        }
    });
};
