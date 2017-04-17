'use strict';

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

function getAuthUrl() {
    var oauth2Client = this.getOAuthClient();
    // generate a url that asks permissions for Google+ and Google Calendar scopes
    var scopes = [
        'https://www.googleapis.com/auth/plus.me'
    ];

    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes // If you only need one scope you can pass it as string
    });

    return url;
}

function getOAuthClient() {
    return new OAuth2(
        '205519557302-q4govtrihn5t8ttp0p60q0r93f6fcqmo.apps.googleusercontent.com',
        'MfclUo5PuB0wNwmTO7xuj3aH',
        'http://localhost:8080/oauth2callback'
    );
}
module.exports = {
    getAuthUrl: getAuthUrl,
    getOAuthClient: getOAuthClient
}