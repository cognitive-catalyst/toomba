const conceptInsights = require('../../../lib/concept-insights');

function annotate(nodeType, nodeId, content, contentType) {

    if(contentType !== "text") {
        return new Promise((resolve, reject) => resolve([]));
    }

    console.time('concept_insights_request')
    return conceptInsights.annotateWithMetadata(content).then(annotations => {
        console.timeEnd('concept_insights_request');
        return convert(annotations, nodeType, nodeId, content);
    }).catch(err => {
        console.log(err);
        return [];
    })
}

function convert(annotations, nodeType, nodeId, content) {
    let transactions = [];
    for(let annotation of annotations) {
        const text_index = annotation.text_index;
        const score = annotation.score;

        transactions.push(`
            MATCH (n:${nodeType} {id: "${nodeId}"})
            MERGE (c:CIConcept {id: "${annotation.id}"})
            ON CREATE SET
                c.label = "${annotation.label}",
                c.link = "${annotation.link}",
                c.type = "${annotation.type}",
                c.abstract = "${annotation.abstract != undefined ? annotation.abstract.replace(/"/g,'\\"' ) : ''}",
                c.thumbnail = "${annotation.thumbnail || ''}"

            MERGE (n)-[r:HAS_CIConcept {
                score: ${score},
                evidence: "${content.substring(...text_index)}"
            }]->(c)
        `);

        if(annotation.ontology) {
            const ontology = annotation.ontology;

            transactions.push(`
                MATCH (c:CIConcept {id: "${annotation.id}"})
                MERGE (o:CIOntology {id: "${ontology[0]}"})
                MERGE (c)-[r:IS_A]->(o)
            `);

            for(let i = 1; i < ontology.length; i++) {
                transactions.push(`
                    MERGE (j:CIOntology {id: "${ontology[i - 1]}"})
                    MERGE (k:CIOntology {id: "${ontology[i]}"})
                    MERGE (j)-[r:IS_A]->(k)
                `);
            }
        }
    }

    return transactions;
}

module.exports = annotate;
