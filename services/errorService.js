'use strict';

function handleError(error, response) {
    if (error.reason) {
        // Predicted error
        response.status(400).send(error.reason);
        console.log(`${error.reason}\n`);
    } else {
        // Internal error, maybe SQL injection
        response.status(500).send('Unknwon Server Error');
        throw error;
    }
}

module.exports = {
    handleError: handleError
}