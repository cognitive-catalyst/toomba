const express = require('express')
const annotators = require('./annotators')

const router = express.Router();

router.post('/roombamatize', (req, res) => {

    const inputKey      = req.body.inputKey;
    const content       = req.body.content;
    const contentType   = req.body.contentType || 'text';

    const userAnnotators = req.body.annotators; // { alchemy: { apikey: '', url: '' }, relExtract: { username: '', etc}

    let promises = annotators
        .filter(ann => userAnnotators[ann.key] != undefined)
        .map(ann => ann(inputKey, content, contentType, userAnnotators[ann.key]))

    Promise.all(promises)
        .then(values => res.json({
            status: 'OK',
            message: 'You the best',
            transactions: values.reduce((p, c) => p.concat(c))
        }))
        .catch(err => {
            console.log(err);
            res.status(500).json({
                status: "ERROR",
                message: err.message,
                transactions: []
            })
        })
})

module.exports = router;
