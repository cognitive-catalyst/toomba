const alchemy = require('../../../lib/alchemy');
const util = require('./util');

const pgClean = util.pgClean;

function annotate(id, edgeTable, content, contentType, credentials) {
    console.time('alchemy_request')
    return alchemy.getAllTheThings(content, contentType, credentials.apikey, true)
        .then(data => { console.timeEnd('alchemy_request'); return data; })
        .then(data => [
            ...conceptize(id, edgeTable, data.concepts),
            ...entitize(id, edgeTable, data.entities),
            ...keywordize(id, edgeTable, data.keywords),
            ...taxonomize(id, edgeTable, data.taxonomy),
            ...emotionalize(id, edgeTable, data.emotions)
        ]).catch(err => { console.log(err); return []; })
}

function emotionalize(id, edgeTable, emotions) {
    let transactions = [];

    for(let emotion in emotions) {
        let score = emotions[emotion];
        let emotionid = `${emotion}-alchemy-emotion`
        transactions.push(`
            INSERT INTO concepts (id, type, annotator, label) VALUES (
                '${emotionid}',
                'alchemy-emotion',
                'AlchemyAPI',
                '${emotion}'
            ) ON CONFLICT DO NOTHING;`)

        transactions.push(`
            INSERT INTO ${edgeTable} (foreignId, conceptId, score) VALUES (
                '${id}',
                '${emotionid}',
                '${score}'
            );
        `)
    }

    return transactions;

}

function conceptize(id, edgeTable, concepts) {

    let transactions = [];
    for(let concept of concepts) {
        if(parseFloat(concept.relevance) < 0.01)
            continue;

        // for each concept, make sure it's in concept table. constraint on id, and also check?
        // note that we need universal id for concept -- so id should be string id-alchemy-concept
        const kg = concept.knowledgeGraph ? pgClean(concept.knowledgeGraph.typeHierarchy) : ''
        const conceptid = `${pgClean(concept.text)}-${kg}-alchemy-concept`

        transactions.push(`
            INSERT INTO concepts (id, type, annotator, label, ontology) VALUES (
                '${conceptid}',
                'alchemy-concept',
                'AlchemyAPI',
                '${pgClean(concept.text)}',
                '${kg}'
            ) ON CONFLICT DO NOTHING;`)

        // duplicate same edge with same relevance? probably not. efficient writes priority - not for prototyping.
        // so you need to be careful with 'reingesting'
        transactions.push(`
            INSERT INTO ${edgeTable} (foreignId, conceptId, score, evidence, meta) VALUES (
                '${id}',
                '${conceptid}',
                ${concept.relevance},
                '',
                ''
        );`)
    }

    return transactions;
}


function entitize(id, edgeTable, entities) {
    let transactions = [];
    for(let entity of entities) {
        let disambiguated = entity.disambiguated || {};
        if (parseFloat(entity.relevance) < 0.01 ) {
            continue;
        }

        const kg = entity.knowledgeGraph ? pgClean(entity.knowledgeGraph.typeHierarchy) : ''
        const entityid = `${pgClean(entity.text)}-${kg}-alchemy-entity`

        transactions.push(`
            INSERT INTO concepts (id, type, annotator, label, ontology, description) VALUES (
                '${entityid}',
                'alchemy-entity',
                'AlchemyAPI',
                '${pgClean(entity.text)}',
                '${kg}',
                ''
            ) ON CONFLICT DO NOTHING;
        `);

        transactions.push(`
            INSERT INTO ${edgeTable} (foreignId, conceptId, score, sentiment) VALUES (
                '${id}',
                '${entityid}',
                ${entity.relevance},
                ${entity.sentiment.score || 0}
            );
        `)
    }

    return transactions;
}

function keywordize(id, edgeTable, keywords) {
    let transactions = [];
    for(let keyword of keywords) {
        if ( parseFloat(keyword.relevance) < 0.01 ) {
            continue;
        }

        const kg = keyword.knowledgeGraph ? pgClean(keyword.knowledgeGraph.typeHierarchy) : ''
        const keywordid = `${pgClean(keyword.text)}-${kg}-alchemy-keyword`

        transactions.push(`
            INSERT INTO concepts (id, type, annotator, label, ontology) VALUES (
                '${keywordid}',
                'alchemy-keyword',
                'AlchemyAPI',
                '${pgClean(keyword.text)}',
                '${kg}'
            ) ON CONFLICT DO NOTHING;
        `);

        transactions.push(`
            INSERT INTO ${edgeTable} (foreignId, conceptId, score, sentiment) VALUES (
                '${id}',
                '${keywordid}',
                ${keyword.relevance},
                ${keyword.sentiment.score || 1}
            );
        `)
    };

    return transactions;
}

function taxonomize(id, edgeTable, taxonomies) {

    let transactions = [];

    for(let taxonomy of taxonomies) {
        if(parseFloat(taxonomy.score) < 0.01) {
            continue;
        }
        let labels = taxonomy.label.split('/').slice(1);
        const taxonomyid = `${pgClean(labels[labels.length - 1])}-alchemy-taxonomy`;

        transactions.push(`
            INSERT INTO concepts (id, type, annotator, label, ontology) VALUES (
                '${taxonomyid}',
                'alchemy-taxonomy',
                'AlchemyAPI',
                '${pgClean(labels[labels.length - 1])}',
                '${pgClean(taxonomy.label)}'
            ) ON CONFLICT DO NOTHING;
        `)

        transactions.push(`
            INSERT INTO ${edgeTable} (foreignId, conceptId, score) VALUES (
                '${id}',
                '${taxonomyid}',
                ${taxonomy.score}
            );
        `)
    }

    return transactions;
}

module.exports = {
    annotate,
    key: 'alchemy'
}
