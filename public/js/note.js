var mod = angular.module('walleApp', [], function ($interpolateProvider) {
    $interpolateProvider.startSymbol('[[');
    $interpolateProvider.endSymbol(']]');
});

var ctrl = mod.controller('NotesController', ['$scope', function ($scope) {
    $scope.newNote = {};
    $scope.notes = [];

    $scope.getNote = function (pid) {
        for (var i = 0; i < $scope.notes.length; i++) {
            if ($scope.notes[i].pid == pid) {
                return $scope.notes[i];
            }
        }
    }

    $scope.addNote = function (data) {
        $scope.notes.push(data);
        $scope.$apply();
    }

    $scope.removeNote = function (pid) {
        for (var i = $scope.notes.length - 1; i >= 0; i--) {
            if ($scope.notes[i].pid == pid) {
                $scope.notes.splice(i, 1);
                $scope.$apply();
            }
        }
    }

    $scope.updateNote = function (data) {
        for (var i = 0; i < $scope.notes.length; i++) {
            if ($scope.notes[i].pid == data.pid) {
                $scope.notes[i].title = data.title;
                $scope.notes[i].content = data.content;
                $scope.notes[i].color = data.color;
                $scope.notes[i].top = data.top;
                $scope.notes[i].left = data.left;
                $scope.notes[i].width = data.width;
                $scope.notes[i].height = data.height;
                $scope.notes[i].zindex = data.zindex;
                $scope.$apply();
            }
        }
    }

    $scope.resetForm = function () {
        $scope.newNote.title = "";
        $scope.newNote.content = "";
        $scope.$apply();
    }

}]);

mod.directive('ngNote', function() {
    return {
        scope: {
            note: '='
        },
        restrict: 'E',
        templateUrl: 'public/partial/_note.html'
    }
});