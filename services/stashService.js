'use strict';

var mysql = require('./mysql');
var logic = require('./logic');

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
        let checkQuery = 'SELECT * FROM `stash_basic_information` WHERE `stash_id` LIKE "' + stash_id + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;

            if (rows.length != 0) {
                res.status(400).send('Stash already existed.');
                console.log('Stash already existed.\n');
                return;
            } else {
                // Add the stash to the database
                let query = 'INSERT INTO `stash_basic_information` ' +
                    '(`stash_id`, `title`, `description`, `author_id`) VALUES ' + '(' +
                    '\'' + stash_id + '\',' +
                    '\'' + stashTitle + '\',' +
                    '\'' + description + '\',' +
                    '\'' + author_id + '\'' +
                    ')';
                mysql.query(query, (error, rows) => {
                    if (error) throw error;
                    res.status(201).send('Stash successfully created.');
                    console.log('Stash successfully created.\n');
                })

            }
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
        let checkQuery = 'SELECT * FROM `stash_basic_information` WHERE `stash_id` LIKE "' + stash_id + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows[0] == undefined) {
                // The stash does not exist
                res.status(400).send('The stash does not exist');
                console.log('The stash does not exist\n');
            } else {
                // Delete the stash
                let query = 'DELETE FROM `stash_basic_information` WHERE ' +
                    '`stash_basic_information`.`stash_id` = "' + stash_id + '"';
                mysql.query(query, (error, rows) => {
                    if (error) throw error;
                    res.status(201).send('Stash successfully deleted');
                    console.log('Stash successfully deleted.\n');
                })
            }
        })
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
    let checkQuery = 'SELECT * FROM `user_basic_information` WHERE `user_id` LIKE "' + user_id + '"';
    mysql.query(checkQuery, (error, checkRows) => {
        if (error) throw error;
        if (checkRows[0] == undefined) {
            res.status(404).send('User reqed does not exist');
            console.log('Wrong user_id reqed\n');
        } else {
            let query = 'SELECT * FROM `stash_basic_information` WHERE `author_id` LIKE "' + user_id + '"';
            mysql.query(query, (error, rows) => {
                if (error) throw error;

                // If no error, return the rows to the main app
                res.status(200).send(rows);

                console.log('Retrieval successful\n');
            })
        }
    });
}

function getStash(req, res, next) {
    console.log('req received to retrieve a stash');
    if (req.params.stash_id == null) {
        res.status(404).send('The stash does not exist');
    }
    let stash_id = req.params.stash_id;
    let query = 'SELECT * FROM `stash_basic_information` WHERE `stash_id` LIKE"' + stash_id + '"';
    mysql.query(query, (error, rows) => {
        console.log(rows);
        if (error) throw error;

        if (rows[0] == undefined) {
            res.status(404).send('Stash does not exist');
        } else {
            res.status(200).send(rows[0]);
        }
    });
}

module.exports = {
    createNewStash: createNewStash,
    deleteStash: deleteStash,
    getStashesForUser: getStashesForUser,
    getStash: getStash
}