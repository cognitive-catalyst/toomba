const alchemy = require('../../../lib/alchemy')

function annotate(nodeType, nodeId, content, contentType, credentials) {
	console.time('alchemy_request');
	return alchemy.getAllTheThings(content, contentType, credentials.apikey, true)
		.then(data => {
			console.timeEnd('alchemy_request');
			return [
				...conceptize(nodeType, nodeId, data.concepts),
				...entitize(nodeType, nodeId, data.entities),
				...keywordize(nodeType, nodeId, data.keywords),
				...taxonimize(nodeType, nodeId, data.taxonomy),
				...emotionalize(nodeType, nodeId, data.emotions)
			]
		}).catch(err => { console.log(err); return []; })
}

function emotionalize(nodeType, nodeId, emotions) {
	let transactions = [];

	for(let emotion in emotions) {
		let score = emotions[emotion];

		transactions.push(`
			MATCH (n:${nodeType} {id: "${nodeId}"})
			MERGE (e:Emotion {id: "${emotion}"})
			MERGE (n)-[:HAS_EMOTION {score: ${score} }]->(e)
		`)
	}

	return transactions;
}

function conceptize(nodeType, nodeId, concepts) {
	let transactions = [];
	for(let concept of concepts) {
		if (parseFloat(concept.relevance) < 0.01 ) {
			continue;
		}
		transactions.push(`
			MATCH (n:${nodeType} {id: "${nodeId}"})
			MERGE (c:Concept {id: "${concept.text}", types: "${concept.knowledgeGraph ? concept.knowledgeGraph.typeHierarchy : ''}"})
			ON CREATE SET
				c.website = "${concept.website || ''}",
				c.geo = "${concept.geo || ''}",
				c.dbpedia = "${concept.dbpedia || ''}",
				c.yago = "${concept.yago || ''}",
				c.opencyc = "${concept.opencyc || ''}",
				c.freebase = "${concept.freebase || ''}",
				c.ciaFactbook = "${concept.ciaFactbook || ''}",
				c.census = "${concept.census || ''}",
				c.geonames = "${concept.geonames || ''}",
				c.musicBrainz = "${concept.musicBrainz || ''}",
				c.crunchbase = "${concept.crunchbase || ''}"

			MERGE (n)-[r:HAS_CONCEPT {score: ${concept.relevance} }]->(c)`);

		if(concept.knowledgeGraph === undefined)
			continue;

		let types = concept.knowledgeGraph.typeHierarchy.split('/').slice(1);
		transactions = transactions.concat(knowledgeGraphize('Concept', concept.text, types))
	}

	return transactions;
}

function entitize(nodeType, nodeId, entities) {

	let transactions = [];
	for(let entity of entities) {
		let disambiguated = entity.disambiguated || {};
		if (parseFloat(entity.relevance) < 0.01) {
			continue;
		}
		transactions.push(`
			MATCH (n:${nodeType} {id: "${nodeId}"})
			MERGE (e:Entity {id: "${entity.text}", types: "${entity.knowledgeGraph ? entity.knowledgeGraph.typeHierarchy : ''}"})
			ON CREATE SET
				e.website = "${disambiguated.website || ''}",
				e.geo = "${disambiguated.geo || ''}",
				e.dbpedia = "${disambiguated.dbpedia || ''}",
				e.yago = "${disambiguated.yago || ''}",
				e.opencyc = "${disambiguated.opencyc || ''}",
				e.freebase = "${disambiguated.freebase || ''}",
				e.ciaFactbook = "${disambiguated.ciaFactbook || ''}",
				e.census = "${disambiguated.census || ''}",
				e.geonames = "${disambiguated.geonames || ''}",
				e.musicBrainz = "${disambiguated.musicBrainz || ''}",
				e.crunchbase = "${disambiguated.crunchbase || ''}"

			MERGE (n)-[r:HAS_ENTITY {
					score: ${entity.relevance},
					sentiment: ${entity.sentiment.score || 0},
					anger:  ${entity.emotions ? entity.emotions.anger || -1},
					disgust: ${entity.emotions ? entity.emotions.disgust || -1},
					fear: ${entity.emotions ? entity.emotions.fear || -1},
					joy: ${entity.emotions ? entity.emotions.joy || -1},
					sadness: ${entity.emotions ? entity.emotions.sadness || -1}
			}]->(e)`)

		if(entity.knowledgeGraph === undefined)
			continue

		let types = entity.knowledgeGraph.typeHierarchy.split('/').slice(1)
		transactions = transactions.concat(knowledgeGraphize('Entity', entity.text, types))
	}

	return transactions;
}

function keywordize(nodeType, nodeId, keywords) {

	let transactions = [];
	for(let keyword of keywords) {
		if (parseFloat(keyword.relevance) < 0.01) {
			continue;
		}
		transactions.push(`
			MATCH (d:${nodeType} {id: "${nodeId}"})
			MERGE (k:Keyword {id: "${keyword.text}", types: "${keyword.knowledgeGraph ? keyword.knowledgeGraph.typeHierarchy : ''}"})
			MERGE (d)-[r:HAS_KEYWORD {
				score: ${keyword.relevance},
				sentiment: ${keyword.sentiment.score || 0}
				anger:  ${keyword.emotions ? entity.emotions.anger || -1},
				disgust: ${keyword.emotions ? entity.emotions.disgust || -1},
				fear: ${keyword.emotions ? entity.emotions.fear || -1},
				joy: ${keyword.emotions ? entity.emotions.joy || -1},
				sadness: ${keyword.emotions ? entity.emotions.sadness || -1}
			}]->(k)`)

		if(keyword.knowledgeGraph === undefined)
			continue

		let types = keyword.knowledgeGraph.typeHierarchy.split('/').slice(1)
		transactions = transactions.concat(knowledgeGraphize('Keyword', keyword.text, types))
	}

	return transactions;
}

function taxonimize(nodeType, nodeId, taxonomies) {

	let transactions = [];
	for(let taxonomy of taxonomies) {
		let labels = taxonomy.label.split('/').slice(1)
		if(parseFloat(taxonomy.score) < 0.01) {
			continue;
		}

		transactions.push(`
			MATCH (d:${nodeType} {id: "${nodeId}"})
			MERGE (t:Taxonomy {id: "${labels[labels.length - 1]}"})
			MERGE (d)-[r:HAS_TAXONOMY {score: ${taxonomy.score}}]->(t)
			`)

		for(let i = 0; i < labels.length - 1; i++) {
			transactions.push(`
				MERGE (j:Taxonomy {id: "${labels[i + 1]}"})
				MERGE (k:Taxonomy {id: "${labels[i]}"})
				MERGE (j)-[r:IS_A]->(k)
			`)
		}
	}

	return transactions;
}

function knowledgeGraphize(rootType, rootId, types) {
	let transactions = [];
	transactions.push(`
		MATCH (n:${rootType} {id: "${rootId}"})
		MERGE (t:Type {id: "${types[types.length - 1]}"})
		MERGE (n)-[r:IS_A]->(t)`);

	for(let i = 1; i < types.length; i++) {
		transactions.push(`
			MERGE (k:Type {id: "${types[i- 1]}"})
			MERGE (j:Type {id: "${types[i]}"})
			MERGE (j)-[r:IS_A]->(k)`);
	}

	return transactions;
 }

module.exports = {
	annotate,
	key: 'alchemy'
}
