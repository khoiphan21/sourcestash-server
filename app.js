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

var google = require('googleapis');
var plus = google.plus('v1');
var authClient = require('./authClient');

let mysqlModule = require('mysql');
var Session = require('express-session');
let bodyParser = require('body-parser');
let multer = require('multer');
let upload = multer(); // for parsing multipart/form-data
const express = require('express');
const app = express();

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
    extended: true
})); // for parsing multipart/form-Data
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, X-reqed-With, Accept')
    next();
});
//using session in express
app.use(Session({
    secret: 'your-random-secret-19890913007',
    resave: true,
    saveUninitialized: true
}));

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
app.get('/', (req, res) => {
    var url = authClient.getAuthUrl();
    // res.status(200).send('Hello, from the SourceStash Server Team!');
    res.send(`
        <h1>Authentication using google oAuth</h1>
        <a href=${url}>Login</a>
    `)
});

// Oauth callback
app.get('/oauth2callback', upload.array(), (req, res) => {
    var oauth2Client = authClient.getOAuthClient();
    var session = req.session;
    var code = req.query.code; // the query param code
    oauth2Client.getToken(code, function(err, tokens) {
        // Now tokens contains an access_token and an optional refresh_token. Save them.
        console.log(tokens);

        if (!err) {
            oauth2Client.setCredentials(tokens);
            //saving the token to current session
            session["tokens"] = tokens;
            res.send(`
            <h3>Login successful!!</h3>
            <a href="/details">Go to details page</a>
        `);
        } else {
            res.send(`
            <h3>Login failed!!</h3>
        `);
        }
    });
})

// TESTING
app.get("/details", function(req, res) {
    var oauth2Client = authClient.getOAuthClient();
    oauth2Client.setCredentials(req.session["tokens"]);

    var p = new Promise(function(resolve, reject) {
        plus.people.get({ userId: 'me', auth: oauth2Client }, function(err, res) {
            resolve(res || err);
        });
    }).then(function(data) {
        console.log('\nData received:');
        console.log(data)
        res.send(`
            <h3>Hello ${data.displayName}</h3>
        `);
    })
});


// Login API
app.post('/login/', upload.array(), (req, res) => {
    console.log('req for login.');
    if (req.body.email == null || req.body.password == null) {
        res.status(400).send('email and password needed');
        return;
    } else {
        console.log('User: ' + req.body.email + ' attempted to log in.')
        mysql.query('SELECT * FROM `user_basic_information` WHERE Email="' + req.body.email + '"',
            (error, rows) => {
                if (rows[0] == undefined) {
                    res.status(404).send('Email does not exist');
                } else {
                    let account = rows[0];
                    // By now the email should be correct
                    if (account.Password === req.body.password) {
                        res.status(200).send('Login successfully');
                        console.log('Login successfully\n')
                    } else {
                        res.status(401).send('Wrong password')
                        console.log('Wrong password\n');
                    }
                }
            }
        )
    }
});

/**
 * LOGIN API WITH GOOGLE
 */
app.post('/login/google', upload.array(), (req, res) => {
    console.log('Code to be used is: ');
    console.log(req.params.code);
    res.status(200).send('Code received');
})

/**
 * SIGN UP API WITH GOOGLE
 */
app.post('/signup/google', upload.array(), (req, res) => {

})

// Check email availability
app.post('/check-email', upload.array(), (req, res) => {
    console.log('New email-checking req.');
    if (req.body.email == null) {
        res.status(400).send('An email is needed');
    } else {
        let email = req.body.email;
        console.log('A req is sent to check availability for: ' + email);

        let checkQuery = 'SELECT * FROM `user_basic_information` WHERE `email` LIKE "' + email + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows[0] == undefined) {
                // email is available
                res.status(200).send({
                    isAvailable: true
                });
            } else {
                // email is not available
                res.status(200).send({
                    isAvailable: false
                });
            }
        })
    }
});

// Sign up a new user API
app.post('/signup/', upload.array(), (req, res) => {
    console.log('New Signup req.');
    if (
        req.body.account == null ||
        req.body.account.email == null ||
        req.body.account.password == null
    ) {
        res.status(400).send('an account object with at least email and password is needed');
        return;
    } else {
        console.log('Attempt to create a new user for ' + req.body.account.email);
        let account = req.body.account;
        // Fisrt check if the email (email) already exists, based on the hash
        let hashValue = hash(account.email);
        // Now check the database to see if the user already exist. Note that id is casted
        // to a string. 
        let checkQuery = 'SELECT * FROM `user_basic_information` WHERE `userID` LIKE "' + hashValue + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows[0] != undefined) {
                res.status(500).send('Unable to create account for user: ' + account.email);
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
                    res.status(201).send('Successfully created an account for ' + account.email);
                });
            }
        })
    }
});

/**
 * DELETE THE USER - THIS API SHOULD NOT BE DISCLOSED
 */
app.post('/delete/user/:useremail', (req, res) => {
    console.log('req received to delete a user\n');
    if (req.params.useremail == null) {
        // Note: not much detail is given to prevent attacks (?)
        res.status(404).send('req invalid.');
    }
    let userid = hash(req.params.useremail);
    let query = 'DELETE FROM `user_basic_information` WHERE `user_basic_information`.`userID` = "' + userid + '"';
    // Point of no return.
    mysql.query(query, (error, rows) => {
        if (error) throw error;
        res.status(200).send('Successful');
    })
});

app.get('/user', (req, res) => {
    // Query the database for the given id
    mysql.query('SELECT * FROM `user_basic_information`', function(err, rows) {
        if (err) throw err;

        res.status(200).send(rows[0]);
    });
});

/**
 * Get all stashes for a given user id
 */
app.get('/stashes/all/:useremail', (req, res) => {
    console.log('req received to retrieve stashes for a user.');
    if (req.params.useremail == null) {
        res.status(404).send('User with the given ID does not exist');
        return;
    }
    let userID = hash(req.params.useremail);
    console.log('Retrieving stashes for user with id: ' + userID);

    // Now check the database to see if the user already exist. Note that id is casted
    // to a string. 
    let checkQuery = 'SELECT * FROM `user_basic_information` WHERE `userID` LIKE "' + userID + '"';
    mysql.query(checkQuery, (error, checkRows) => {
        if (error) throw error;
        if (checkRows[0] == undefined) {
            res.status(404).send('User reqed does not exist');
            console.log('Wrong userID reqed\n');
        } else {
            let query = 'SELECT * FROM `stash_basic_information` WHERE `authorID` LIKE "' + userID + '"';
            mysql.query(query, (error, rows) => {
                if (error) throw error;

                // If no error, return the rows to the main app
                res.status(200).send(rows);

                console.log('Retrieval successful\n');
            })
        }
    })


});

/**
 * Get a stash based on the given id
 */
app.get('/stash/:stashid', (req, res) => {
    console.log('req received to retrieve a stash');
    if (req.params.stashid == null) {
        res.status(404).send('The stash does not exist');
    }
    let stashID = req.params.stashid;
    let query = 'SELECT * FROM `stash_basic_information` WHERE `stashID` LIKE"' + stashID + '"';
    mysql.query(query, (error, rows) => {
        console.log(rows);
        if (error) throw error;

        if (rows[0] == undefined) {
            res.status(404).send('Stash does not exist');
        } else {
            res.status(200).send(rows[0]);
        }
    })
});

/**
 * Create a new stash based on the given information
 */
app.post('/stash/new', (req, res) => {
    console.log('New req to create a stash.');
    if (
        req.body.stash.authorID == null ||
        req.body.stash.title == null ||
        req.body.stash.description == null
    ) {
        res.status(400).send('A Stash needs author id, title and description\n');
        return;
    } else {
        // Check if the stash already exists
        let stashTitle = req.body.stash.title;
        let authorID = req.body.stash.authorID;
        let description = req.body.stash.description;
        let stashID = hash(stashTitle);
        let checkQuery = 'SELECT * FROM `stash_basic_information` WHERE `stashID` LIKE "' + stashID + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;

            if (rows.length != 0) {
                res.status(400).send('Stash already existed.');
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
                    res.status(201).send('Stash successfully created.');
                    console.log('Stash successfully created.\n');
                })

            }
        })
    }
});

/**
 * Delete a stash based on the given stash information
 */
app.post('/stash/delete', (req, res) => {
    console.log('New req to delete a stash.');
    if (
        req.body.stash.stashID == null ||
        req.body.stash.title == null ||
        req.body.stash.description == null
    ) {
        res.status(400).send('A Stash needs author id, title and description\n');
        return;
    } else {
        // Check if the stash exists
        let stashID = req.body.stash.stashID;
        let checkQuery = 'SELECT * FROM `stash_basic_information` WHERE `stashID` LIKE "' + stashID + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows[0] == undefined) {
                // The stash does not exist
                res.status(400).send('The stash does not exist');
                console.log('The stash does not exist\n');
            } else {
                // Delete the stash
                let query = 'DELETE FROM `stash_basic_information` WHERE ' +
                    '`stash_basic_information`.`stashID` = "' + stashID + '"';
                mysql.query(query, (error, rows) => {
                    if (error) throw error;
                    res.status(201).send('Stash successfully deleted');
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
    console.log('hashed string: ' + hash('%Eh0BEBoFBxcZCRUIFCIlHC4CCg0MCwMTEhEPDgQYBiIMTTd2NWRHUGtyVk09'));
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