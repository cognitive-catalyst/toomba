const constants = require('../../../constants')
const alchemy   = require('../../../lib/alchemy')

alchemy.init(constants.alchemy_key, constants.alchemy_keys);

const redisClean = str => str.replace(/' '/g, '_');

function annotate(inputKey, content, contentType) {
    console.time('alchemy_request')
    return alchemy.getAllTheThings(content, contentType=contentType)
        .then(data => {
            console.timeEnd('alchemy_request')
            return [
                ...conceptize(inputKey, data.concepts),
                ...entitize(inputKey, data.entities),
                ...keywordize(inputKey, data.keywords),
                ...taxonomize(inputKey, data.taxonomy)
            ]
        }).catch(err => { console.log(err); return []; })
}

function conceptize(inputKey, concepts) {
    let transactions = [];
    for(let concept of concepts) {
        if(parseFloat(concept.relevance) < 0.01) {
            continue;
        }

        const conceptId = `alchemy-concept-${concept.text}`;
        transactions.push(
            `HMSET "concept:${conceptId}" label "${concept.text}" types "${concept.knowledgeGraph ? concept.knowledgeGraph.typeHierarchy : ''}"`,

            `HMSET "edges:meta:${inputKey}:${conceptId}" score ${concept.relevance}`,
            `HMSET "edges:meta:${conceptId}:${inputKey}" score ${concept.relevance}`,

            `SADD "edges:${conceptId}" "${inputKey}"`,
            `SADD "edges:${inputKey}" "${conceptId}"`
        )
    }
    return transactions;
}

function entitize(inputKey, entities) {
    let transactions = [];
    for(let entity of entities) {
        if(parseFloat(entity.relevance) < 0.01) {
            continue;
        }

        const entityId = `alchemy-entity-${entity.text}`;
        transactions.push(
            `HMSET "concept:${entityId}" label "${entity.text}" types "${entity.knowledgeGraph ? entity.knowledgeGraph.typeHierarchy : ''}"`,

            `HMSET "edges:meta:${inputKey}:${entityId}" score ${entity.relevance} sentiment ${entity.sentiment.score || 0}`,
            `HMSET "edges:meta:${entityId}:${inputKey}" score ${entity.relevance} sentiment ${entity.sentiment.score || 0}`,

            `SADD "edges:${entityId}" "${inputKey}"`,
            `SADD "edges:${inputKey}" "${entityId}"`
        );
    }

    return transactions;
}

function keywordize(inputKey, keywords) {
    let transactions = [];
    for(let keyword of keywords) {
        if(parseFloat(keyword.relevance) < 0.01) {
            continue;
        }

        const keywordId = `alchemy-keyword-${keyword.text}`;
        transactions.push(
            `HMSET "concept:${keywordId}" label "${keyword.text}" types "${keyword.knowledgeGraph ? keyword.knowledgeGraph.typeHierarchy : ''}"`,

            `HMSET "edges:meta:${inputKey}:${keywordId}" score ${keyword.relevance} sentiment ${keyword.sentiment.score || 0}`,
            `HMSET "edges:meta:${keywordId}:${inputKey}" score ${keyword.relevance} sentiment ${keyword.sentiment.score || 0}`,

            `SADD "edges:${keywordId}" "${inputKey}"`,
            `SADD "edges:${inputKey}" "${keywordId}"`
        )
    }

    return transactions;
}

function taxonomize(inputKey, taxonomies) {

    let transactions = [];
    for(let taxonomy of taxonomies) {
        if(parseFloat(taxonomy.score) < 0.01) {
            continue;
        }

        let labels = taxonomy.label.split('/').slice(1);
        const taxonomyId = `alchemy-taxonomy-${labels[labels.length - 1]}`;

        transactions.push(
            `HMSET "concept:${taxonomyId}" label "${labels[labels.length - 1]}" types "${taxonomy.label}"`,

            `HMSET "edges:meta:${inputKey}:${taxonomyId}" score ${taxonomy.score}`,
            `HMSET "edges:meta:${taxonomyId}:${inputKey}" score ${taxonomy.score}`,

            `SADD "edges:${taxonomyId}" "${inputKey}"`,
            `SADD "edges:${inputKey}" "${taxonomyId}"`
        )
    }

    return transactions;
}

module.exports = annotate;
