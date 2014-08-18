var socket, msg;
var title = $("title").text();
var wall = "default";
var currentPid = undefined;
var noteCount = 1;
var notifCount = 0;

$(document).ready(function () {

    var appElement = document.querySelector('[ng-controller="NotesController"]');
    var $scope = angular.element(appElement).scope();

    $("#newModal").draggable({handle: ".modal-header", opacity: 0.8});

    //buttons event
    $("#btnAdd").on("click", function (e) {
        e.preventDefault();
        resetModal();
        currentPid = undefined;
        $("#newModal").modal({backdrop: 'static'});
    });

    /*$("#content").summernote({
     toolbar: [
     ['style', ['bold', 'italic', 'underline', 'clear']],
     ['font', ['strikethrough']],
     ['fontsize', ['fontsize']],
     ['color', ['color']],
     ['insert', ['link', 'picture']]
     ]
     });*/

    if ($("#userName").text() == "") {
        $("#btnAdd").attr("disabled", "disabled");
    }

    $("#newNote").bind("submit", function (e) {
        e.preventDefault();

        if (currentPid == undefined) { //new note
            noteCount++;
            var data = {
                "pid": noteCount,
                "left": "200px",
                "top": "200px",
                "width": "230px",
                "height": "130px",
                "color": $scope.newNote.color,
                "title": $scope.newNote.title,
                "content": $scope.newNote.content,
                "date": new Date().getTime() / 1000,
                "zindex": getNextZindex(),
                "author": $("#userName").text()
            };
            noteDb("saveNote", data);
        }
        else { //update note
            var data = $scope.getNote(currentPid);
            data.title = $scope.newNote.title;
            data.content = $scope.newNote.content;
            data.color = $scope.newNote.color;
            data.zindex = getNextZindex();
            data.date = new Date().getTime() / 1000;
            noteDb("updateNote", data);
        }
        $("#newModal").modal('hide');
    });

    //update on drag stop
    $("#notes").delegate(".draggable", "dragstop", function (event, ui) {
        var pid = $(this).attr("pid");
        var note = $scope.getNote(pid);
        note.top = $(this).css("top");
        note.left = $(this).css("left");
        noteDb("moveNote", note);
    });

    //remove on button click
    $("#notes").delegate(".remove-note", "click", function () {
        var pid = parseInt($(this).parent().attr("pid"));
        noteDb("deleteNote", pid);
    });

    //edit on double click
    $("#notes").delegate(".draggable", "dblclick", function () {
        currentPid = parseInt($(this).attr("pid"));
        editNote(currentPid);
    });

    //edit on button click
    $("#notes").delegate(".edit-note", "click", function () {
        currentPid = parseInt($(this).parent().attr("pid"));
        editNote(currentPid);
    });

    function editNote(currentPid) {
        var note = $scope.getNote(currentPid);
        $scope.newNote.title = note.title;
        $scope.newNote.content = note.content;
        $scope.newNote.color = note.color;
        $scope.$apply();
        $("#newModal").modal({backdrop: 'static'});
    }

    //show buttons on mouseover/mouseout
    $("#notes").delegate(".draggable", "mouseover", function () {
        $(this).find(".close").show();
    });

    $("#notes").delegate(".draggable", "mouseout", function () {
        $(this).find(".close").hide();
    });

    //resize
    $("#notes").delegate(".draggable", "resizestop", function (event, ui) {
        var pid = $(this).attr("pid");
        var note = $scope.getNote(pid);
        note.width = $(this).css("width");
        note.height = $(this).css("height");
        noteDb("moveNote", note);
    });

    //wall id
    var path = window.location.pathname;
    wall = path.substr(1, path.length);

    //socketio
    socket = io.connect();

    console.log("emit loadNotes " + wall);
    socket.emit("loadNotes", {"wall": wall});

    socket.on('loadNotes', function (notes) {
        $scope.notes = notes;
        $scope.$apply();

        if (notes.length != 0) {
            noteCount = notes[notes.length - 1].pid;
        }
        setDraggableResizable();
    });

    socket.on('saveNote', function (data) {
        console.log("on saveNote " + JSON.stringify(data));
        $scope.addNote(data);
        noteCount = data.pid;
        notifCount++;
        updateNotifCount();
        setDraggableResizable();
    });

    socket.on('updateNote', function (data) {
        console.log("on updateNote " + JSON.stringify(data));
        $scope.updateNote(data);
        setDraggableResizable();
    });

    socket.on('moveNote', function (data) {
        console.log("on moveNote " + JSON.stringify(data));
        $scope.updateNote(data);
    });

    socket.on('deleteNote', function (data) {
        console.log("on deleteNote " + JSON.stringify(data));
        $scope.removeNote(data);
    });

    socket.on('clientsCount', function (data) {
        $("#users").text(data.length);
        $("#users").attr("data-original-title", "");
        var clients = "";
        for (client in data) {
            if (clients == "")
                clients += data[client];
            else
                clients += " - " + data[client];
        }
        $("#users").attr("data-original-title", clients);
        $("#users").tooltip();
    });


    function resetModal() {
        currentPid = undefined;
        $scope.resetForm();

        $("#newNote")[0].reset();
        $("#newModal").css("left", 0);
        $("#newModal").css("top", 0);
        //$("#content").code("");
    }

    function getNextZindex() {
        var zindexMax = 0;
        for (var i = 0; i < $scope.notes.length; i++) {
            var zindex = $scope.notes[i].zindex;
            if (zindex > zindexMax) {
                zindexMax = zindex;
            }
        }
        return zindexMax + 1;
    }

    function setDraggableResizable() {
        $(".draggable").draggable({handle: ".move-note", opacity: 0.8 });
        $(".draggable").resizable();
        $(".draggable").contrastColor();
    }

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

    function noteDb(command, data) {
        console.log("emit " + command + " " + JSON.stringify(data));
        delete data.$$hashKey;
        delete data._id;
        socket.emit(command, data);
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
                $(this).find(".footer").removeClass('light-color');
                $(this).find(".close").removeClass('light-color light-shadow');
            }
            else {
                $(this).find(".title").addClass('light-color');
                $(this).find(".content").addClass('light-color');
                $(this).find(".date").addClass('light-color');
                $(this).find(".footer").addClass('light-color');
                $(this).find(".close").addClass('light-color light-shadow');
            }
        });
    };


});


