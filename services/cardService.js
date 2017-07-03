'use strict';

// External libraries
var _ = require('underscore');

// Internal services
var mysql = require('./mysqlPromise1');
var logic = require('./logic');
var errorService = require('./errorService');

// For testing
var mock = require('./mockParams');

// GET ALL CARD FOR A CERTAIN BOARD
function getCardForBoard(req, res, next) {
    console.log('Request received to retrieve cards.');
    let board_id = req.body.board_id;

    if (board_id == null) {
        errorService.handleMissingParam('Missing board id', res);
        return;
    }

    let query = 'SELECT * FROM `card` WHERE ' + '`card`.`board_id` = ?';
    mysql.query(query, board_id).then(rows => {
        let rawCards = rows;
        res.status(200).send(rawCards);

        console.log('Cards retrieved for board with id: ' + board_id + '\n');
    }).catch(error => {
        errorService.handleServerError(error, res);
    })
}

// ADD/CREATE A NEW CARD
function createCard(req, res, next) {
    console.log('Request received to create a new card');
    // A new card must have these values
    let card = req.body.card;

    // Generate a random id
    let id = logic.generateUID();
    card.card_id = id;

    if (isAnyCardParamMissing(card)) {
        errorService.handleMissingParam('Missing parameters for adding a card', res);
    } else {
        // TODO: CHECK IF THE ID ALREADY EXISTS!

        // FOR NOW: just return an error
        let checkQuery = 'SELECT * FROM card WHERE card_id = ?';
        mysql.query(checkQuery, [id]).then(rows => {
            if (rows.length != 0) {
                return Promise.reject({
                    reason: 'Internal error: unable to add card'
                })
            } else {
                return Promise.resolve();
            }
        }).then(() => {
            // When control reaches here, the id must be unique
            // Add the card to the database
            let query = `INSERT INTO card (card_id, board_id, title, x_location, y_location) VALUES (?, ?, ?, ?, ?)`

            let queryParams = [
                id, card.board_id, card.title, card.x_location, card.y_location
            ];
            return mysql.query(query, queryParams);
        }).then(() => {
            // Send the card object with an id back to the app
            res.status(201).send(card);
            console.log('Card creation successful.\n');
        }).catch(error => {
            if (error.reason) {
                errorService.handleIncorrectParam(error, res);
            } else {
                errorService.handleServerError(error, res);
            }
        })
    }
}

// UPDATE
function updateCard(req, res, next) {
    console.log('Request received to updated a card');
    let card = req.body.card;
    let isIDPresent = true;
    if (isAnyCardParamMissing(card, isIDPresent)) {
        errorService.handleMissingParam('Missing parameters for updating a card', res);
    } else {
        // Check if the card exists
        let checkQuery = `SELECT * FROM \`card\` WHERE \`card\`.\`card_id\` = ?`
        mysql.query(checkQuery, [card.card_id]).then(rows => {
            if (rows[0] == undefined) {
                return Promise.reject({
                    reason: 'The card does not exist.'
                })
            } else {
                // Update the source
                let query = `UPDATE card SET board_id = ?, title = ?, x_location = ?, y_location = ? WHERE card_id = ?`;
                let inserts = [
                    card.board_id, card.title, card.x_location, card.y_location, card.card_id
                ]
                return mysql.query(query, inserts)
            }
        }).then(rows => {
            res.status(200).send('Card successfully updated');
            console.log('Card successfully updated.\n')
        }).catch(error => {
            if (error.reason) {
                errorService.handleIncorrectParam(error, res);
            } else {
                errorService.handleServerError(error, res);
            }
        });
    }
}

// DELETE
function deleteCard(req, res, next) {
    console.log('Request to delete card received');

    let card_id = req.body.card_id;
    if (card_id == null) {
        errorService.handleMissingParam('Card ID is missing', res);
    } else {
        // Check if the card exists
        let checkQuery = 'SELECT * FROM `card` WHERE `card`.`card_id` = ?';
        mysql.query(checkQuery, card_id).then(rows => {
            if (rows[0] == undefined) {
                return Promise.reject({
                    reason: 'Card does not exist.\n'
                });
            } else {
                // 
                //
                // NOT SURE
                let query = 'DELETE FROM `card` WHERE `card`.`card_id` = ?';
                return mysql.query(query, card_id);
            }
        }).then(rows => {
            console.log('Card successfully deleted.');
            res.status(200).send('Card successfully delete.\n')
        }).catch(error => {
            if (error.reason) {
                errorService.handleIncorrectParam(error, res);
            } else {
                errorService.handleServerError(error, res);
            }
        });
    }
}

/**
 * HELPER FUNCTIONS
 */
// Check if any field in a card object is missing
function isAnyCardParamMissing(card, isIDPresent = false) {
    let isParamMissing = false;

    if (
        card == null ||
        card.board_id == null ||
        card.board_id == '' ||
        card.title == null ||
        card.title == '' ||
        card.x_location == null ||
        card.y_location == null
    ) {
        isParamMissing = true;
    }

    // Check for id
    if (isIDPresent) {
        if (card.card_id == null) isParamMissing = true;
    }

    return isParamMissing;
}

module.exports = {
    getCardForBoard: getCardForBoard,
    createCard: createCard,
    updateCard: updateCard,
    deleteCard: deleteCard
}