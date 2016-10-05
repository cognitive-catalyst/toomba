const express = require('express');
const annotators = require('./annotators');

const router = express.Router();

router.post('/roombamatize', (req, res) => {

	const nodeType = req.body.nodeType;
	const nodeId = req.body.nodeId;
	const content = req.body.content;
	const contentType = req.body.contentType || 'text';

	const userAnnotators = req.body.annotators; // { alchemy: { apikey: ''}, whatever: { username: '', password: '' }}

	let promises = annotators
		.filter(ann => userAnnotators[ann.key] != undefined)
		.map(ann => ann.annotate(nodeType, nodeId, content, contentType, userAnnotators[ann.key]))

	Promise.all(promises)
		.then(values => res.json({
			status: 'OK',
			message: "Great Job!",
			transactions: values.reduce((p, c) => p.concat(c))
		}))
		.catch(err => {
			console.log(err)
			res.status(500).json({
				status: 'ERROR',
				message: err.message,
				transactions: []
			})
		})
});

module.exports = router;
