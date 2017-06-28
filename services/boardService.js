'use strict';

// External libraries
var _ = require('underscore');

// Internal services
var mysql = require('./mysqlPromise1');
var logic = require('./logic');
var errorService = require('./errorService');


// For testing
var mock = require('./mockParams');

function newBoard(req, res) {
    console.log('Request received to create a new board');

    // A new board must have these values
    let board = req.body.board;

    // Generate a random id
    let id = logic.generateUID();
    board.board_id = id;

    // Check for null params
    if (board.title == null || board.owner_id == null) {
        errorService.handleMissingParam('Title and Owner ID are required.', res);
        return;
    }

    // Check if the id exists
    let checkQuery = `
        SELECT * FROM board WHERE board_id = ?
    `;
    mysql.query(checkQuery, [id]).then(rows => {
        if (rows.length != 0) {
            return Promise.reject({
                reason: 'Internal error: unable to add new board'
            })
        } else {
            return Promise.resolve();
        }
    }).then(() => {
        // Add the board to the database
        let query = `
            INSERT INTO board (board_id, owner_id, title) VALUES
            (?, ?, ?)
        `;
        return mysql.query(query, [board.board_id, board.owner_id, board.title]);
    }).then(() => {
        // Send a board object with an id back to the client
        res.status(201).send(board);
        console.log('Board creation successful\n');
    }).catch(error => {
        if (error.reason) {
            errorService.handleIncorrectParam(error, res);
        } else {
            errorService.handleServerError(error, res);
        }
    });
}

function getAllBoards(req, res) {
    res.status(404).send();

}

function updateBoard(req, res) {
    res.status(404).send();
    
}

function deleteBoard(req, res) {
    res.status(404).send();

}

module.exports = {
    newBoard: newBoard,
    getAllBoards: getAllBoards,
    updateBoard: updateBoard,
    deleteBoard: deleteBoard
}