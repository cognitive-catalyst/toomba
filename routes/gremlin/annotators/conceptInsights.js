const conceptInsights = require('../../../lib/concept-insights');

function annotate(nodeType, nodeId, content, contentType) {

	if (contentType !== "text") {
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
	for (let annotation of annotations) {
		const text_index = annotation.text_index;
		const score = annotation.score;

		// The Gremlin Syntax is based on the TinkerPop-3.0.1-Incubating version.

		// Note: the property 'label' for CIConcept vertex is renamed to 'conceptLabel' as 'label' is a reserved keyword in Titan
		// Note: BigDecimal is not supported in Titan...so need to explicitly convert to Double or float

		let query = {};

		query.gremlin = `
			def g = graph.traversal();
	    def n = g.V().hasLabel(nodeType).has("id", nodeId).next();

	    def c = g.V().hasLabel("CIConcept").has("id", ciConceptId).tryNext().orElseGet({
	      g.addV(T.label, "CIConcept")
	        .property("id", ciConceptId)
	        .property("conceptLabel", ciConceptLabel)
	        .property("link", ciConceptLink)
	        .property("type", ciConceptType)
	        .property("abstract", ciConceptAbstract)
	        .property("thumbnail", ciConceptThumbnail)
	        .next()
	    });

	    def e = g.V(n).outE().hasLabel("HAS_CIConcept").has("score", ciConceptScore).has("evidence", ciConceptEvidence)
	      .otherV().filter({
	        it.get() == c
	      }).tryNext().orElseGet({
	        n.addEdge("HAS_CIConcept", c, "score", ciConceptScore, "evidence", ciConceptEvidence)
	    });
		`;

		query.bindings = {
			nodeType: nodeType,
			nodeId: nodeId,
			ciConceptId: annotation.id,
			ciConceptLabel: annotation.label,
			ciConceptLink: annotation.link,
			ciConceptType: annotation.type,
			ciConceptAbstract: annotation.abstract != undefined ? annotation.abstract.replace(/\\/g, '') : '',
			ciConceptThumbnail: annotation.thumbnail || '',
			ciConceptScore: Number(score) || 0,
			ciConceptEvidence: content.substring(...text_index)
		};

		transactions.push(query);

		if (annotation.ontology) {
			const ontology = annotation.ontology;

			let query = {};

			query.gremlin = `
				def g = graph.traversal();
        def c = g.V().hasLabel("CIConcept").has("id", ciConceptId).next();

        def o = g.V().hasLabel("CIOntology").has("id", ciOntologyId).tryNext().orElseGet({
          g.addV(T.label, "CIOntology")
            .property("id", ciOntologyId)
            .next()
        });

        def r = g.V(c).outE().hasLabel("IS_A")
          .otherV().filter({
            it.get() == o
          }).tryNext().orElseGet({
            c.addEdge("IS_A", o)
        });
    	`;

			query.bindings = {
				ciConceptId: annotation.id,
				ciOntologyId: ontology[0]
			};

			transactions.push(query);

			for (let i = 1; i < ontology.length; i++) {

				let query = {};

				query.gremlin = `
					def g = graph.traversal();
	        def j = g.V().hasLabel("CIOntology").has("id", ciOntologyId).tryNext().orElseGet({
	          g.addV(T.label, "CIOntology")
	            .property("id", ciOntologyId)
	            .next()
	        });

	        def k = g.V().hasLabel("CIOntology").has("id", ciOntologyId2).tryNext().orElseGet({
	          g.addV(T.label, "CIOntology")
	            .property("id", ciOntologyId2)
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
					ciOntologyId: ontology[i - 1],
					ciOntologyId2: ontology[i]
				};

				transactions.push(query);
			}
		}
	}

	return transactions;
}

module.exports = annotate;
