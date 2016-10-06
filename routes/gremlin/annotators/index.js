const alchemyAnnotator = require('./alchemy')
//const conceptInsightsAnnotator = require('./conceptInsights')
const relationshipExtractionAnnotator = require('./relationshipExtraction')

module.exports = [
	alchemyAnnotator,
	//conceptInsightsAnnotator,
	relationshipExtractionAnnotator
];
