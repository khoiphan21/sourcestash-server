let request = {
    body: {
        stash_id: '24039641',
        user_id: '1693158545179',
        collaborators: [
            '1693158545179',
            '185839818004'
        ],
        email: 'john4@example.com'
    }
}
let response = {
    status: function() {
        return {
            send: function(value) {
                console.log('Message sent back: ');
                console.log(value)
            }
        }
    }
};
module.exports = {
    request: request,
    response: response
}