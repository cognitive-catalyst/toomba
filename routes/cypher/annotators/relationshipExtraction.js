const re = require('../../../lib/relationship-extraction');
const axios = require('axios')

function annotate(nodeType, nodeId, content, contentType) {

    if(contentType !== "text") {
        return new Promise((resolve, reject) => resolve([]));
    }

    console.time('sire_request');
    return re.annotate(content).then(mentions => {
        console.timeEnd('sire_request');
        return convert(mentions, nodeType, nodeId, content);
    })
    .catch(err => { console.log(err); return []; })
}

function convert(output, nodeType, nodeId, content) {
    let transactions = [];
    for(let annotation of output) {
        const begin = annotation.begin;
        const role = annotation.role;
        const score = annotation.score;
        const term = annotation.text;
        const end = annotation.end;

        const escaped = term.replace(/"/g, '').replace(/\\/g, '')

        transactions.push(`
            MATCH (n:${nodeType} {id: "${nodeId}"})
            MERGE (c:REMention {id: "${escaped}"})
            ON CREATE SET c.type = "${role}"
            MERGE (n)-[r:HAS_REMention {
                score: ${score}
            }]->(c)
        `);
    }

    return transactions;
}

module.exports = annotate;
