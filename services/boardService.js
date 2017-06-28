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
    console.log('Request received to get all boards.');

    let owner_id = req.body.owner_id;

    if (owner_id == null) {
        errorService.handleMissingParam('User ID is missing', res);
        return;
    }

    let query = 'SELECT * FROM board WHERE owner_id = ?';
    mysql.query(query, [owner_id]).then(rows => {
        let rawBoards = rows;
        res.status(200).send(rawBoards);
        console.log(`Boards retrieved for user with id ${owner_id}`);
    }).catch(error => {
        errorService.handleServerError(error, res);
    });
}

function updateBoard(req, res) {
    console.log('Request received to update a board');

    let board = req.body.board;
    let board_id = board.board_id;
    let owner_id = board.owner_id;
    let title = board.title;

    // Check for null params
    if (board.title == null || board.owner_id == null) {
        errorService.handleMissingParam('Title and Owner ID are required.', res);
        return;
    }

    // Check if the id exists
    let checkQuery = `
        SELECT * FROM board WHERE board_id = ?
    `;
    mysql.query(checkQuery, [board_id]).then(rows => {
        if (rows[0] == undefined) {
            return Promise.reject({
                reason: 'The Board does not exist'
            })
        } else {
            // Update the board
            let query = 'UPDATE board SET title = ?, owner_id = ? WHERE board_id = ?'
            return mysql.query(query, [title, owner_id, board_id]);
        }
    }).then(() => {
        res.status(200).send(board);
        console.log('Board successfully updated.\n');
    }).catch(error => {
        if (error.reason) {
            errorService.handleIncorrectParam(error, res);
        } else {
            errorService.handleServerError(error, res);
        }
    });
}

function deleteBoard(req, res) {
    console.log('Request to delete board received.');

    let board = req.body.board;
    let board_id = board.board_id;
    let owner_id = board.owner_id;
    let title = board.title;

    if (board_id == null || owner_id == null || title == null) {
        errorService.handleMissingParam('Board ID is missing.', res);
        return;
    }

    let checkQuery = 'SELECT * FROM board WHERE board_id = ?';
    mysql.query(checkQuery, [board_id]).then(rows => {
        if (rows[0] != undefined) {
            // The board exists. Delete it
            let query = 'DELETE FROM board WHERE board_id = ?';
            return mysql.query(query, [board_id]);
        } else {
            return Promise.reject({
                reason: 'Board not found'
            });
        }
    }).then(() => {
        console.log('Board successfully deleted');
        res.status(200).send('Successfully deleted the board');
    }).catch(error => {
        if (error.reason) {
            errorService.handleIncorrectParam(error, res);
        } else {
            errorService.handleServerError(error, res);
        }
    })
}

module.exports = {
    newBoard: newBoard,
    getAllBoards: getAllBoards,
    updateBoard: updateBoard,
    deleteBoard: deleteBoard
}