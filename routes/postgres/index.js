const express = require('express');
const annotators = require('./annotators');

let router = express.Router();

router.post('/roombamatize', (req, res) => {

    const SourceId = req.body.sourceId;
    const Content = req.body.content;
    const EdgeTable = req.body.edgeTable;
    const ContentType = req.body.contentType || 'text';

    const userAnnotators = req.body.annotators; // { alchemy: 'apikey', }

    if(SourceId == undefined || Content == undefined || EdgeTable == undefined || ContentType == undefined) {
        res.status(500).json({
            status: 'ERROR',
            message: 'need sourceId, content, edgeTable and contentType in post body.',
            transactions: []
        })
        return;
    }

    let promises = annotators
        .filter(ann => userAnnotators[ann.key] != undefined)
        .map(ann => ann.annotate(SourceId, EdgeTable, Content, ContentType, userAnnotators[ann.key]))

    Promise.all(promises)
        .then(values => res.json({
            status: 'OK',
            message: 'You did good!',
            transactions: values.reduce((p, c) => p.concat(c))
        }))
        .catch(err => {
            console.log(err);
            res.status(500).json({
                status: 'ERROR',
                message: err.message,
                transactions: []
            })
        })
})


module.exports = router;
