const alchemy = require('../../../lib/alchemy')

function annotate(nodeType, nodeId, content, contentType) {
	console.time('alchemy_request');
	return alchemy.getAllTheThings(content, contentType = contentType)
		.then(data => {
			console.timeEnd('alchemy_request');
			return [
				...conceptize(nodeType, nodeId, data.concepts),
				...entitize(nodeType, nodeId, data.entities),
				...keywordize(nodeType, nodeId, data.keywords),
				...taxonimize(nodeType, nodeId, data.taxonomy),
				...emotionalize(nodeType, nodeId, data.emotions)
			]
		}).catch(err => {
			console.log(err);
			return [];
		})
}

function emotionalize(nodeType, nodeId, emotions) {
	let transactions = [];

	for (let emotion in emotions) {
		let score = emotions[emotion];
		let query = {};

		query.gremlin = `
			def g = graph.traversal();
			def n = g.V().hasLabel(nodeType).has("id", nodeId).next();
			def e = g.V().hasLabel("Emotion").has("id", emotion).tryNext().orElseGet({
				g.addV(T.label, "Emotion")
          .property("id", emotion)
					.next();
			});

			g.V(n).outE().hasLabel("HAS_EMOTION").has("score", score)
	      .otherV().filter({
	        it.get() == e
	      }).tryNext().orElseGet({
	        n.addEdge("HAS_EMOTION", e, "score", score)
	    });
		`;

		query.bindings = {
			nodeType: nodeType,
			nodeId: nodeId,
			emotion: emotion,
			score: Number(score) || 0
		};

		transactions.push(query);
	}

	return transactions;
}

function conceptize(nodeType, nodeId, concepts) {
	let transactions = [];
	for (let concept of concepts) {
		if (parseFloat(concept.relevance) < 0.01) {
			continue;
		}

		let query = {};

		query.gremlin = `
			def g = graph.traversal();
			def n = g.V().hasLabel(nodeType).has("id", nodeId).next();

      def c = g.V().hasLabel("Concept").has("id", conceptId).has("types", conceptTypes).tryNext().orElseGet({
        g.addV(T.label, "Concept")
          .property("id", conceptId)
          .property("types", conceptTypes)
          .property("website", conceptWebsite)
          .property("geo", conceptGeo)
          .property("dbpedia", conceptDbpedia)
          .property("yago", conceptYago)
          .property("opencyc", conceptOpencyc)
          .property("freebase", conceptFreebase)
          .property("ciaFactbook", conceptCiaFactbook)
          .property("census", conceptCensus)
          .property("geonames", conceptGeonames)
          .property("musicBrainz", conceptMusicBrainz)
          .property("crunchbase", conceptCrunchbase)
          .next()
      });

      def r = g.V(n).outE().hasLabel("HAS_CONCEPT").has("score", conceptRelevance)
	      .otherV().filter({
	        it.get() == c
	      }).tryNext().orElseGet({
	        n.addEdge("HAS_CONCEPT", c, "score", conceptRelevance)
	    });
    `;

		query.bindings = {
			nodeType: nodeType,
			nodeId: nodeId,
			conceptId: concept.text,
			conceptTypes: concept.knowledgeGraph ? concept.knowledgeGraph.typeHierarchy : '',
			conceptWebsite: concept.website || '',
			conceptGeo: concept.geo || '',
			conceptDbpedia: concept.dbpedia || '',
			conceptYago: concept.yago || '',
			conceptOpencyc: concept.opencyc || '',
			conceptFreebase: concept.freebase || '',
			conceptCiaFactbook: concept.ciaFactbook || '',
			conceptCensus: concept.census || '',
			conceptGeonames: concept.geonames || '',
			conceptMusicBrainz: concept.musicBrainz || '',
			conceptCrunchbase: concept.crunchbase || '',
			conceptRelevance: Number(concept.relevance) || 0,

		};

		transactions.push(query);

		if (concept.knowledgeGraph === undefined)
			continue;

		let types = concept.knowledgeGraph.typeHierarchy.split('/').slice(1);
		transactions = transactions.concat(knowledgeGraphize('Concept', concept.text, types))
	}

	return transactions;
}

function entitize(nodeType, nodeId, entities) {

	let transactions = [];
	for (let entity of entities) {
		let disambiguated = entity.disambiguated || {};
		if (parseFloat(entity.relevance) < 0.01) {
			continue;
		}

		let query = {};

		query.gremlin = `
			def g = graph.traversal();
      def n = g.V().hasLabel(nodeType).has("id", nodeId).next();

      def e = g.V().hasLabel("Entity").has("id", entityId).has("types", entityTypes).tryNext().orElseGet({
        g.addV(T.label, "Entity")
          .property("id", entityId)
          .property("types", entityTypes)
          .property("website", entityWebsite)
          .property("geo", entityGeo)
          .property("dbpedia", entityDbpedia)
          .property("yago", entityYago)
          .property("opencyc", entityOpencyc)
          .property("freebase", entityFreebase)
          .property("ciaFactbook", entityCiaFactbook)
          .property("census", entityCensus)
          .property("geonames", entityGeonames)
          .property("musicBrainz", entityMusicBrainz)
          .property("crunchbase", entityCrunchbase)
          .next()
      });

      def r_ne = g.V(n).outE().hasLabel("HAS_ENTITY").has("score", entityRelevance).has("sentiment", entitySentimentScore)
        .otherV().filter({
          it.get() == e
        }).tryNext().orElseGet({
          n.addEdge("HAS_ENTITY", e, "score", entityRelevance, "sentiment", entitySentimentScore)
      });
    `;

		query.bindings = {
			nodeType: nodeType,
			nodeId: nodeId,
			entityId: entity.text,
			entityTypes: entity.knowledgeGraph ? entity.knowledgeGraph.typeHierarchy : '',
			entityWebsite: disambiguated.website || '',
			entityGeo: disambiguated.geo || '',
			entityDbpedia: disambiguated.dbpedia || '',
			entityYago: disambiguated.yago || '',
			entityOpencyc: disambiguated.opencyc || '',
			entityFreebase: disambiguated.freebase || '',
			entityCiaFactbook: disambiguated.ciaFactbook || '',
			entityCensus: disambiguated.census || '',
			entityGeonames: disambiguated.geonames || '',
			entityMusicBrainz: disambiguated.musicBrainz || '',
			entityCrunchbase: disambiguated.crunchbase || '',
			entityRelevance: Number(entity.relevance) || 0,
			entitySentimentScore: Number(entity.sentiment.score) || 0
		};

		transactions.push(query);

		if (entity.knowledgeGraph === undefined)
			continue

		let types = entity.knowledgeGraph.typeHierarchy.split('/').slice(1)
		transactions = transactions.concat(knowledgeGraphize('Entity', entity.text, types))
	}

	return transactions;
}

function keywordize(nodeType, nodeId, keywords) {

	let transactions = [];
	for (let keyword of keywords) {
		if (parseFloat(keyword.relevance) < 0.01) {
			continue;
		}

		let query = {};

		query.gremlin = `
			def g = graph.traversal();
      def d = g.V().hasLabel(nodeType).has("id", nodeId).next();

      def k = g.V().hasLabel("Keyword").has("id", keywordId).has("types", keywordTypes).tryNext().orElseGet({
        g.addV(T.label, "Keyword")
          .property("id", keywordId)
          .property("types", keywordTypes)
          .next()
      });

      def r = g.V(d).outE().hasLabel("HAS_KEYWORD").has("score", keywordRelevance).has("sentiment", keywordSentimentScore)
        .otherV().filter({
          it.get() == k
        }).tryNext().orElseGet({
          d.addEdge("HAS_KEYWORD", k, "score", keywordRelevance, "sentiment", keywordSentimentScore)
      });

    `;

		query.bindings = {
			nodeType: nodeType,
			nodeId: nodeId,
			keywordId: keyword.text,
			keywordTypes: keyword.knowledgeGraph ? keyword.knowledgeGraph.typeHierarchy : '',
			keywordRelevance: Number(keyword.relevance) || 0,
			keywordSentimentScore: Number(keyword.sentiment.score) || 0
		}

		transactions.push(query);

		if (keyword.knowledgeGraph === undefined)
			continue

		let types = keyword.knowledgeGraph.typeHierarchy.split('/').slice(1)
		transactions = transactions.concat(knowledgeGraphize('Keyword', keyword.text, types))
	}

	return transactions;
}

function taxonimize(nodeType, nodeId, taxonomies) {

	let transactions = [];
	for (let taxonomy of taxonomies) {
		let labels = taxonomy.label.split('/').slice(1)
		if (parseFloat(taxonomy.score) < 0.01) {
			continue;
		}

		let query = {};

		query.gremlin = `
			def g = graph.traversal();
      def d = g.V().hasLabel(nodeType).has("id", nodeId).next();

      def t = g.V().hasLabel("Taxonomy").has("id", taxonomyId).tryNext().orElseGet({
        g.addV(T.label, "Taxonomy")
          .property("id", taxonomyId)
          .next()
      });

      def r = g.V(d).outE().hasLabel("HAS_TAXONOMY").has("score", taxonomyScore)
        .otherV().filter({
          it.get() == t
        }).tryNext().orElseGet({
          d.addEdge("HAS_TAXONOMY", t, "score", taxonomyScore)
      });
    `;

		query.bindings = {
			nodeType: nodeType,
			nodeId: nodeId,
			taxonomyId: labels[labels.length - 1],
			taxonomyScore: Number(taxonomy.score) || 0
		}

		transactions.push(query);

		for (let i = 0; i < labels.length - 1; i++) {

			let query = {};

			query.gremlin = `
				def g = graph.traversal();
				def j = g.V().hasLabel("Taxonomy").has("id", taxonomyId).tryNext().orElseGet({
					g.addV(T.label, "Taxonomy")
						.property("id", taxonomyId)
						.next()
				});

				def k = g.V().hasLabel("Taxonomy").has("id", taxonomyId2).tryNext().orElseGet({
					g.addV(T.label, "Taxonomy")
						.property("id", taxonomyId2)
						.next()
				});

				def r = g.V(j).outE().hasLabel("IS_A")
					.otherV().filter({
						it.get() == k
					}).tryNext().orElseGet({
						j.addEdge("IS_A", k)
				});
			`;

			query.bindings = {
				taxonomyId: labels[i + 1],
				taxonomyId2: labels[i]
			};

			transactions.push(query);
		}
	}

	return transactions;
}

function knowledgeGraphize(rootType, rootId, types) {
	let transactions = [];

	let query = {};

	query.gremlin = `
		def g = graph.traversal();
		def n = g.V().hasLabel(rootType).has("id", rootId).next();

		def t = g.V().hasLabel("Type").has("id", typeId).tryNext().orElseGet({
			g.addV(T.label, "Type")
				.property("id", typeId)
				.next()
		});

		def r = g.V(n).outE().hasLabel("IS_A")
			.otherV().filter({
				it.get() == t
			}).tryNext().orElseGet({
				n.addEdge("IS_A", t)
		});
	`;

	query.bindings = {
		rootType: rootType,
		rootId: rootId,
		typeId: types[types.length - 1]
	};

	transactions.push(query);

	for (let i = 1; i < types.length; i++) {

		let query = {};

		query.gremlin = `
			def g = graph.traversal();
			def k = g.V().hasLabel("Type").has("id", typeId).tryNext().orElseGet({
				g.addV(T.label, "Type")
					.property("id", typeId)
					.next()
			});

			def j = g.V().hasLabel("Type").has("id", typeId2).tryNext().orElseGet({
				g.addV(T.label, "Type")
					.property("id", typeId2)
					.next()
			});

			def r = g.V(j).outE().hasLabel("IS_A")
				.otherV().filter({
					it.get() == k
				}).tryNext().orElseGet({
					j.addEdge("IS_A", k)
			});
		`;

		query.bindings = {
			typeId: types[i - 1],
			typeId2: types[i]
		};
		transactions.push(query);
	}

	return transactions;
}

module.exports = {
	key: 'alchemy',
	annotate
};
