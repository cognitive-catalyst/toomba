const axios = require('axios');


function annotate(text, credentials) {
    const session = axios.create({
        baseURL: 'https://gateway.watsonplatform.net/relationship-extraction-beta/api',
        // baseURL: 'http://localhost:4034',
        auth: {
            username: credentials.username,
            password: credentials.password
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    return session.post('',`sid=ie-en-news&rt=json&txt=${encodeURIComponent(text)}`).then(rsp => rsp.data.doc.mentions.mention)
}

module.exports = {
    annotate
};
