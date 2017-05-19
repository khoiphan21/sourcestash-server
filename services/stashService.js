'use strict';

var mysql = require('./mysqlPromise');
var logic = require('./logic');
var errorService = require('./errorService');
var sourceService = require('./sourceService');

function createNewStash(req, res, next) {
    console.log('New req to create a stash.');
    if (
        req.body.stash.author_id == null ||
        req.body.stash.title == null ||
        req.body.stash.description == null
    ) {
        res.status(400).send('A Stash needs author id, title and description\n');
        console.log('Bad request.\n');
        return;
    } else {
        // Check if the stash already exists
        let stashTitle = req.body.stash.title;
        let author_id = req.body.stash.author_id;
        let description = req.body.stash.description;
        let stash_id = logic.hash(stashTitle);
        let checkQuery = 'SELECT * FROM `stash_basic_information` WHERE `stash_id` = ? ';
        mysql.query(checkQuery, [stash_id]).then(rows => {
            if (rows.length != 0) {
                return Promise.reject({ reason: 'Stash already existed.' })
            } else {
                // Add the stash to the database
                let query = 'INSERT INTO `stash_basic_information` ' +
                    '(`stash_id`, `title`, `description`, `author_id`) VALUES ' + '(' +
                    '\'' + stash_id + '\',' +
                    '\'' + stashTitle + '\',' +
                    '\'' + description + '\',' +
                    '\'' + author_id + '\'' +
                    ')';
                return mysql.query(query, [stash_id, stashTitle, description, author_id])
            }
        }).then(rows => {
            res.status(201).send('Stash successfully created.');
            console.log('Stash successfully created.');
            console.log('Adding root source for the new stash.');
            sourceService.createRootSource(stashTitle, stash_id, author_id);
            console.log('All operations finished.\n');
        }).catch(error => {
            errorService.handleError(error);
        })
    }
}

function deleteStash(req, res, next) {
    console.log('New req to delete a stash.');
    if (
        req.body.stash.stash_id == null ||
        req.body.stash.title == null ||
        req.body.stash.description == null
    ) {
        res.status(400).send('A Stash needs author id, title and description\n');
        return;
    } else {
        // Check if the stash exists
        let stash_id = req.body.stash.stash_id;
        let checkQuery = 'SELECT * FROM `stash_basic_information` WHERE `stash_id` = ?';
        mysql.query(checkQuery, [stash_id]).then(rows => {
            if (rows[0] == undefined) {
                // The stash does not exist
                return Promise.reject({ reason: 'The stash does not exist.' });
            } else {
                // Delete the stash
                let query = 'DELETE FROM `stash_basic_information` WHERE ' +
                    '`stash_basic_information`.`stash_id` = ?';
                return mysql.query(query, [stash_id])
            }
        }).then(() => {
            res.status(201).send('Stash successfully deleted');
            console.log('Stash successfully deleted.\n');
        }).catch(error => errorService.handleError(error));
    }
}

function getStashesForUser(req, res, next) {
    console.log('req received to retrieve stashes for a user.');
    if (req.params.useremail == null) {
        res.status(404).send('User with the given ID does not exist');
        return;
    }
    let user_id = logic.hash(req.params.useremail);
    console.log('Retrieving stashes for user with id: ' + user_id);

    // Now check the database to see if the user already exist. Note that id is casted
    // to a string. 
    let checkQuery = 'SELECT * FROM `user_basic_information` WHERE `user_id` = ?';
    mysql.query(checkQuery, [user_id]).then(rows => {
        if (rows[0] == undefined) {
            return Promise.reject({ reason: 'User does not exist' });
        } else {
            let query = 'SELECT * FROM `stash_basic_information` WHERE `author_id` = ?';
            return mysql.query(query, [user_id])
        }
    }).then(() => {
        // If no error, return the rows to the main app
        res.status(200).send(rows);
        console.log('Retrieval successful\n');
    }).catch(error => errorService.handleError(error));
}

function getStash(req, res, next) {
    console.log('Request received to retrieve a stash');
    if (req.params.stash_id == null) {
        res.status(404).send('The stash does not exist');
    }
    let stash_id = req.params.stash_id;
    let query = 'SELECT * FROM `stash_basic_information` WHERE `stash_id` = ?';
    mysql.query(query, [stash_id]).then(rows => {
        if (rows[0] == undefined) {
            return Promise.reject('Stash does not exist');
        } else {
            res.status(200).send(rows[0]);
            console.log('Stash retrieval successful.\n');
        }
    }).catch(error => errorService.handleError(error));
}

// UPDATE THE CONTENT OF A STASH
function updateStash(req, res, next) {
    console.log('Request received to update a stash.');
    let stash = req.body.stash;
    if (
        stash.author_id == null ||
        stash.stash_id == null ||
        stash.title == null ||
        stash.description == null
    ) {
        res.status(400).send('Missing parameters.');
        console.log('Stash update failed: Missing parameters.\n');
    } else {
        // Check if the stash exists
        let query = `
            SELECT * FROM \`stash_basic_information\` 
            WHERE \`stash_basic_information\`.\`stash_id\` = ?
        `;
        mysql.query(query, [stash_id]).then(rows => {
            if (rows[0] == undefined) {
                return Promise.reject({ reason: 'The stash does not exist.' });
            } else {
                // Update the content of the stash
                let query = `
                    UPDATE \`stash_basic_information\` SET 
                    \`stash_id\` = ? , \`title\` = ? ,
                    \`description\` = ? ,\`author_id\` = ?  
                    WHERE \`stash_basic_information\`.\`stash_id\` = ?
                `;
                return mysql.query(query, [
                    stash.stash_id,
                    stash.title,
                    stash.description,
                    stash.author_id,
                    stash.stash_id
                ])
            }
        }).then(() => {
            res.status(200).send('Stash successfully updated');
            console.log('Stash successfully updated.\n');
        }).catch(error => errorService.handleError(error));
    }
}

module.exports = {
    createNewStash: createNewStash,
    deleteStash: deleteStash,
    getStashesForUser: getStashesForUser,
    getStash: getStash,
    updateStash: updateStash
}