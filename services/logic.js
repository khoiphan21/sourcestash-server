'use strict';

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

function generateUID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

module.exports = {
    hash: hash,
    generateUID: generateUID
}