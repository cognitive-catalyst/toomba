const axios = require('axios')
const re = require('../../../lib/relationship-extraction');

function annotate(nodeType, nodeId, content, contentType, credentials) {

	if (contentType !== "text") {
		return new Promise((resolve, reject) => resolve([]));
	}

	console.time('sire_request');
	return re.annotate(content, credentials).then(mentions => {
		console.timeEnd('sire_request');
		return convert(mentions, nodeType, nodeId, content)
	}).catch(err => {
		console.log(err);
		return [];
	})
}

function convert(output, nodeType, nodeId, content) {
	let transactions = [];
	for (let annotation of output) {
		const begin = annotation.begin;
		const role = annotation.role;
		const score = annotation.score;
		const term = annotation.text;
		const end = annotation.end;

		const escaped = term.replace(/"/g, '').replace(/\\/g, '')

		let query = {};

		query.gremlin = `
			def g = graph.traversal();
      def n = g.V().hasLabel(nodeType).has("id", nodeId).next();
      def c = g.V().hasLabel("REMention").has("id", reMentionId).tryNext().orElseGet({
        g.addV(T.label, "REMention")
          .property("id", reMentionId)
          .property("type", reMentionType)
          .next()
      });

      def r = g.V(n).outE().hasLabel("HAS_REMention").has("score", reMentionScore).otherV().filter({
        it.get() == c
      }).tryNext().orElseGet({
        n.addEdge("HAS_REMention", c, "score", reMentionScore)
      });
  	`;

		query.bindings = {
			nodeType: nodeType,
			nodeId: nodeId,
			reMentionId: escaped,
			reMentionType: role,
			reMentionScore: Number(score) || 0
		};

		transactions.push(query);
	}

	return transactions;
}

module.exports = {
	key: 'relationship-extraction',
	annotate
};
