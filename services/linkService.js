'use strict';

// External libraries
var _ = require('underscore');

// Internal services
var mysql = require('./mysqlPromise1');
var logic = require('./logic');
var errorService = require('./errorService');

// For testing
var mock = require('./mockParams');

function createLink(req, res) {
    console.log('Request received to create a new link');

    let link = req.body.link;

    // Generate a random id
    let id = logic.generateUID();
    link.link_id = id;

    if (isAnyLinkParamMissing(link)) {
        errorService.handleMissingParam('Missing parameters for adding a link', res);
        return;
    }

    // TODO: CHECK IF THE ID ALREADY EXISTS!
    // FOR NOW: just return an error
    let checkQuery = 'SELECT * FROM link WHERE link_id = ?';
    mysql.query(checkQuery, [id]).then(rows => {
        if (rows.length != 0) {
            return Promise.reject({
                reason: 'Internal error: unable to add link'
            });
        } else {
            return Promise.resolve();
        }
    }).then(() => {
        // Add the link to the database
        let query = `
            INSERT INTO link (link_id, card_id, stacking_order, title, hyperlink) VALUES (?, ?, ?, ?, ?)
        `;
        let queryParams = [
            id, link.card_id, link.stacking_order,
            link.title, link.hyperlink
        ];
        return mysql.query(query, queryParams);
    }).then(() => {
        // Send the link object with an id back to the app
        res.status(201).send(link);
        console.log('Link creation successful.\n');
    }).catch(error => {
        if (error.reason) {
            errorService.handleIncorrectParam(error, res);
        } else {
            errorService.handleServerError(error, res);
        }
    })
}

function updateLink(req, res) {

}

function getLinkForCard(req, res) {

}

function deleteLink(req, res) {

}

/**
 * HELPER FUNCTIONS
 */
function isAnyLinkParamMissing(link, isIdPresent = false) {
    let isParamMissing = false;

    if (
        link == null ||
        link.card_id == null ||
        link.card_id == '' ||
        link.stacking_order == null ||
        link.title == null ||
        link.hyperlink == null
    ) {
        isParamMissing = true;
    }

    if (isIdPresent) {
        if (link.link_id == null || link.link_id == '') {
            isParamMissing = true;
        }
    }

    return isParamMissing;
}

module.exports = {
    createLink: createLink,
    updateLink: updateLink,
    getLinkForCard: getLinkForCard,
    deleteLink: deleteLink
}