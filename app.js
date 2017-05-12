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

// Google API
var google = require('googleapis');
var plus = google.plus('v1');

// App Services
var authClient = require('./services/authClient');
var authService = require('./services/authService');
var sourceService = require('./services/sourceService');
var stashService = require('./services/stashService');
var mysql = require('./services/mysql');
var logic = require('./services/logic');

var Session = require('express-session');
let bodyParser = require('body-parser');
let multer = require('multer');
let upload = multer(); // for parsing multipart/form-data
const express = require('express');
const app = express();

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
    extended: true
})); // for parsing multipart/form-data
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, X-reqed-With, Accept')
    next();
});
//using session in express
// app.use(Session({
//     secret: 'your-random-secret-19890913007',
//     resave: true,
//     saveUninitialized: true
// }));

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

/**
 * API FOR SOURCE SERVICES
 */
// app.post('/source/*', sourceService.handlePostRequest);
app.post('/source/new', sourceService.createNewSource);
app.post('/source/all/:stash_id', sourceService.getSourcesForStash);
app.post('/source/delete/:source_id', sourceService.deleteSource);
app.post('/source/update/position', sourceService.updatePosition);

/**
 * API FOR STASH SERVICES
 */
app.get('/stashes/all/:useremail', stashService.getStashesForUser); // Get all stashes for a given user id
app.get('/stash/:stash_id', stashService.getStash); // Get a stash based on the given id
app.post('/stash/new', stashService.createNewStash); // Create a new stash
app.post('/stash/delete', stashService.deleteStash); // Delete a stash

/**
 * API FOR AUTH SERVICES
 */
app.post('/user/id', authService.getUserID);

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
        mysql.query('SELECT * FROM `user_basic_information` WHERE email="' + req.body.email + '"',
            (error, rows) => {
                if (rows[0] == undefined) {
                    res.status(404).send('email does not exist');
                } else {
                    let account = rows[0];
                    // By now the email should be correct
                    if (account.password === req.body.password) {
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
 * 
 * This doubles up as a signup call, if the user has not been registered
 */
app.post('/login/google/', upload.array(), (req, res) => {
    console.log('Request received for Google login');
    // The request object needs: social id, email, firstname, lastname
    // Password will be the social id
    if (
        req.body.account == null ||
        req.body.account.email == null ||
        req.body.account.social_id == null ||
        req.body.account.firstname == null ||
        req.body.account.lastname == null
    ) {
        console.log('Parameters missing from request');
        res.status(400).send('Email, ID, Firstname and Lastname are all required');
    } else {
        let account = {
            email: req.body.account.email,
            social_id: req.body.account.social_id,
            firstname: req.body.account.firstname,
            lastname: req.body.account.lastname
        };
        let hashValue = logic.hash(account.email);

        // Check if the user is already signed up
        let checkQuery = 'SELECT * FROM `user_basic_information` WHERE `email` LIKE "' + account.email + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows[0] == undefined) {
                // The user has not been signed up. Sign up the user
                let query = 'INSERT INTO `user_basic_information` ' +
                    '(`user_id`, `email`, `password`, `firstname`, `lastname`) VALUES ' + '(' +
                    '\'' + hashValue + '\',' +
                    '\'' + account.email + '\',' +
                    '\'' + account.social_id + '\',' +
                    '\'' + account.firstname + '\',' +
                    '\'' + account.lastname + '\'' +
                    ')';
                mysql.query(query, (err, rows) => {
                    if (err) throw err;
                    console.log('Login successful');
                    res.status(200).send('Login successful');
                });
            } else {
                // Check if the social_id matches the password
                let password = rows[0].password;
                if (account.social_id == password) {
                    console.log('Login successful');
                    res.status(200).send('Login successful');
                } else {
                    console.log('social_id does not match password');
                    res.status(400).send('social id does not match the stored value');
                }
            }
        })

    }
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
        let hashValue = logic.hash(account.email);
        // Now check the database to see if the user already exist. Note that id is casted
        // to a string. 
        let checkQuery = 'SELECT * FROM `user_basic_information` WHERE `user_id` LIKE "' + hashValue + '"';
        mysql.query(checkQuery, (error, rows) => {
            if (error) throw error;
            if (rows[0] != undefined) {
                res.status(500).send('Unable to create account for user: ' + account.email);
                console.log('Account already existed\n');
            } else {
                // id is unique. Send the registration details to the database
                let query = 'INSERT INTO `user_basic_information` ' +
                    '(`user_id`, `email`, `password`, `firstname`, `lastname`) VALUES (' +
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
    let userid = logic.hash(req.params.useremail);
    let query = 'DELETE FROM `user_basic_information` WHERE `user_basic_information`.`user_id` = "' + userid + '"';
    // Point of no return.
    mysql.query(query, (error, rows) => {
        if (error) throw error;
        res.status(200).send('Successful');
    });
});

app.post('/test', (req, res) => {
    console.log('request for server test received');
    // For testing server connection
    res.status(200).send('Server Available');
});

/********************
 * START THE SERVER
 ********************/
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});



// [END app]