'use strict';

// External libraries
var _ = require('underscore');

// Internal services
var mysql = require('./mysqlPromise');
var logic = require('./logic');
var errorService = require('./errorService');


// For testing
var mock = require('./mockParams');

function newBoard (req, res) {
    console.log('Request received to create a new board');

    // A new board must have these values
    let board = req.body.board;

    // Generate a random id
    let id = logic.generateUID();
    board.board_id = id;


}

function getAllBoards(req, res) {

}

function updateBoard(req, res) {

}

function deleteBoard(req, res) {

}

module.exports = {

}