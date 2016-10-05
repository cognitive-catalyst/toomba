const conceptInsights = require('../../../lib/concept-insights');
const util = require('./util');

const pgClean = util.pgClean;
function annotate(id, edgeTable, content, contentType) {

    if(contentType !== "text") {
        return new Promise((resolve, reject) => resolve([]));
    }
    console.time('concept_insights_request')
    return conceptInsights.annotateWithMetadata(content)
        .then(annotations => { console.timeEnd('concept_insights_request'); return annotations})
        .then(annotations => convert(annotations, id, edgeTable, content))
        .catch(err => { console.log(err); return []; })
}

function convert(annotations, id, edgeTable, content) {
    let transactions = [];

    for(let annotation of annotations) {

        const text_index = annotation.text_index
        const score  = annotation.score;

        const conceptid = pgClean(`${annotation.id}-ConceptInsights-concept`)
        transactions.push(`
            INSERT INTO concepts (id, type, annotator, label, ontology, description, meta) VALUES (
                '${pgClean(conceptid)}',
                'ConceptInsights-concept',
                'ConceptInsights',
                '${pgClean(annotation.label)}',
                '${annotation.ontology ? pgClean(annotation.ontology.join('/')) : ''}',
                '${annotation.abstract ? pgClean(annotation.abstract) : ''}',
                '${annotation.link ? pgClean(annotation.link) : ''} ${annotation.thumbnail ? pgClean(annotation.thumbnail) : ''}'

            ) ON CONFLICT DO NOTHING;
        `);

        transactions.push(`
            INSERT INTO ${edgeTable} (foreignId, conceptId, score, evidence, meta) VALUES (
                '${id}',
                '${pgClean(conceptid)}',
                ${score},
                '${pgClean(content.substring(...text_index))}',
                ''
            );
        `)
    }

    return transactions;
}

module.exports = annotate;
