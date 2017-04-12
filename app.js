/**
 * Copyright 2016, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// [START app]
'use strict';

let mysqlModule = require('mysql');
let bodyParser = require('body-parser');
let multer = require('multer');
let upload = multer(); // for parsing multipart/form-data
const express = require('express');
const app = express();

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
    extended: true
})); // for parsing multipart/form-Data
app.use((request, response, next) => {
    response.header('Access-Control-Allow-Origin', '*');
    response.header('Access-Control-Allow-Headers', 'Origin, Content-Type, X-Requested-With, Accept')
    next();
})

var mysql = mysqlModule.createConnection({
    // LOCALHOST FOR DEVELOPMENT PURPOSES
    host: "104.199.209.1",
    user: "root",
    password: "sourcestashuq2017",
    database: 'source_stash'
});

mysql.connect(function(err) {
    if (err) {
        console.log('Error connecting to Db');
        throw err;
        return;
    }
    console.log('Database connection established');
});

// mysql.end(function(err) {
//   // The connection is terminated gracefully
//   // Ensures all previously enqueued queries are still
//   // before sending a COM_QUIT packet to the MySQL server.
// });

/**
 * START DEFINING RESTFUL API
 */
app.get('/', (request, res) => {
    res.status(200).send('Hello, from the SourceStash Server Team!');
});

// Login API
app.post('/login/', upload.array(), (request, response) => {
    console.log('Request for login.');
    if (request.body.email == null || request.body.password == null) {
        response.status(400).send('email and password needed');
        return;
    } else {
        console.log('User: ' + request.body.email + ' attempted to log in.')
        mysql.query('SELECT * FROM `user_basic_information` WHERE Email="' + request.body.email + '"',
            (error, rows) => {
                if (rows[0] == undefined) {
                    response.status(404).send('Email does not exist');
                } else {
                    let account = rows[0];
                    // By now the email should be correct
                    if (account.Password === request.body.password) {
                        response.status(200).send('Login successfully');
                        console.log('Login successfully\n')
                    } else {
                        response.status(401).send('Wrong password')
                        console.log('Wrong password\n');
                    }
                }
            }
        )
    }
});

// Check email availability
app.post('/check-email', upload.array(), (request, response) => {
    console.log('New email-checking request.');
    if (request.body.email == null) {
        response.status(400).send('An email is needed');
    } else {
        let email = request.body.email;
        console.log('A request is sent to check availability for: ' + email);

        let checkQuery = 'SELECT * FROM `user_basic_information` WHERE `email` LIKE "' + email + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows[0] == undefined) {
                // email is available
                response.status(200).send({
                    isAvailable: true
                });
            } else {
                // email is not available
                response.status(200).send({
                    isAvailable: false
                });
            }
        })
    }
});

// Sign up a new user API
app.post('/signup/', upload.array(), (request, response) => {
    console.log('New Signup Request.');
    if (
        request.body.account == null ||
        request.body.account.email == null ||
        request.body.account.password == null
    ) {
        response.status(400).send('an account object with at least email and password is needed');
        return;
    } else {
        console.log('Attempt to create a new user for ' + request.body.account.email);
        let account = request.body.account;
        // Fisrt check if the email (email) already exists, based on the hash
        let hashValue = hash(account.email);
        // Now check the database to see if the user already exist. Note that id is casted
        // to a string. 
        let checkQuery = 'SELECT * FROM `user_basic_information` WHERE `userID` LIKE "' + hashValue + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows[0] != undefined) {
                response.status(500).send('Unable to create account for user: ' + account.email);
                console.log('Account already existed\n');
            } else {
                // id is unique. Send the registration details to the database
                let query = 'INSERT INTO `user_basic_information` ' +
                    '(`userID`, `Email`, `Password`, `Firstname`, `Lastname`) VALUES ' + '(' +
                    '\'' + hashValue + '\',' +
                    '\'' + account.email + '\',' +
                    '\'' + account.password + '\',' +
                    '\'' + account.firstname + '\',' +
                    '\'' + account.lastname + '\'' +
                    ')';
                mysql.query(query, (error, rows) => {
                    if (error) throw error;
                    console.log('Account successfully created');
                    response.status(201).send('Successfully created an account for ' + account.email);
                });
            }
        })
    }
});

/**
 * DELETE THE USER - THIS API SHOULD NOT BE DISCLOSED
 */
app.post('/delete/user/:useremail', (request, response) => {
    console.log('Request received to delete a user\n');
    if (request.params.useremail == null) {
        // Note: not much detail is given to prevent attacks (?)
        response.status(404).send('Request invalid.');
    }
    let userid = hash(request.params.useremail);
    let query = 'DELETE FROM `user_basic_information` WHERE `user_basic_information`.`userID` = "' + userid + '"';
    // Point of no return.
    mysql.query(query, (error, rows) => {
        if (error) throw error;
        response.status(200).send('Successful');
    })
});

app.get('/user', (request, response) => {
    // Query the database for the given id
    mysql.query('SELECT * FROM `user_basic_information`', function(err, rows) {
        if (err) throw err;

        response.status(200).send(rows[0]);
    });
});

/**
 * Get all stashes for a given user id
 */
app.get('/stashes/all/:useremail', (request, response) => {
    console.log('Request received to retrieve stashes for a user.');
    if (request.params.useremail == null) {
        response.status(404).send('User with the given ID does not exist');
        return;
    }
    let userID = hash(request.params.useremail);
    console.log('Retrieving stashes for user with id: ' + userID);

    // Now check the database to see if the user already exist. Note that id is casted
    // to a string. 
    let checkQuery = 'SELECT * FROM `user_basic_information` WHERE `userID` LIKE "' + userID + '"';
    mysql.query(checkQuery, (error, checkRows) => {
        if (error) throw error;
        if (checkRows[0] == undefined) {
            response.status(404).send('User requested does not exist');
            console.log('Wrong userID requested\n');
        } else {
            let query = 'SELECT * FROM `stash_basic_information` WHERE `authorID` LIKE "' + userID + '"';
            mysql.query(query, (error, rows) => {
                if (error) throw error;

                // If no error, return the rows to the main app
                response.status(200).send(rows);

                console.log('Retrieval successful\n');
            })
        }
    })


});

/**
 * Get a stash based on the given id
 */
app.get('/stash/:stashid', (request, response) => {
    console.log('Request received to retrieve a stash');
    if (request.params.stashid == null) {
        response.status(404).send('The stash does not exist');
    }
    let stashID = request.params.stashid;
    let query = 'SELECT * FROM `stash_basic_information` WHERE `stashID` LIKE"' + stashID + '"';
    mysql.query(query, (error, rows) => {
        console.log(rows);
        if (error) throw error;

        if (rows[0] == undefined) {
            response.status(404).send('Stash does not exist');
        } else {
            response.status(200).send(rows[0]);
        }
    })
});

/**
 * Create a new stash based on the given information
 */
app.post('/stash/new', (request, response) => {
    console.log('New request to create a stash.');
    if (
        request.body.stash.authorID == null ||
        request.body.stash.title == null ||
        request.body.stash.description == null
    ) {
        response.status(400).send('A Stash needs author id, title and description\n');
        return;
    } else {
        // Check if the stash already exists
        let stashTitle = request.body.stash.title;
        let authorID = request.body.stash.authorID;
        let description = request.body.stash.description;
        let stashID = hash(stashTitle);
        let checkQuery = 'SELECT * FROM `stash_basic_information` WHERE `stashID` LIKE "' + stashID + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;

            if (rows.length != 0) {
                response.status(400).send('Stash already existed.');
                console.log('Stash already existed.\n');
                return;
            } else {
                // Add the stash to the database
                let query = 'INSERT INTO `stash_basic_information` ' +
                    '(`stashID`, `title`, `description`, `authorID`) VALUES ' + '(' +
                    '\'' + stashID + '\',' +
                    '\'' + stashTitle + '\',' +
                    '\'' + description + '\',' +
                    '\'' + authorID + '\'' +
                    ')';
                mysql.query(query, (error, rows) => {
                    if (error) throw error;
                    response.status(201).send('Stash successfully created.');
                    console.log('Stash successfully created.\n');
                })

            }
        })
    }
});

/**
 * Delete a stash based on the given stash information
 */
app.post('/stash/delete', (request, response) => {
    console.log('New request to delete a stash.');
    if (
        request.body.stash.stashID == null ||
        request.body.stash.title == null ||
        request.body.stash.description == null
    ) {
        response.status(400).send('A Stash needs author id, title and description\n');
        return;
    } else {
        // Check if the stash exists
        let stashID = request.body.stash.stashID;
        let checkQuery = 'SELECT * FROM `stash_basic_information` WHERE `stashID` LIKE "' + stashID + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows[0] == undefined) {
                // The stash does not exist
                response.status(400).send('The stash does not exist');
                console.log('The stash does not exist\n');
            } else {
                // Delete the stash
                let query = 'DELETE FROM `stash_basic_information` WHERE ' +
                    '`stash_basic_information`.`stashID` = "' + stashID + '"';
                mysql.query(query, (error, rows) => {
                    if (error) throw error;
                    response.status(201).send('Stash successfully deleted');
                    console.log('Stash successfully deleted.\n');
                })
            }
        })
    }
});

/********************
 * START THE SERVER
 ********************/
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});

/**
 * Hash a string to return a (hopefully) unique id
 */
function hash(string) {
    let h = 0;
    for (let i = 0; i < string.length; i++) {
        h = 3 * h + string.charCodeAt(i)
    }
    return h;
}

// [END app]