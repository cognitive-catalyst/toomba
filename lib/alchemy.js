const axios = require('axios');
const blacklist = require('./blacklist.json');

const blacklist_str = "(" + blacklist.join(")|(") + ")";
const blacklist_regex = new RegExp(blacklist_str);


const _url = 'http://access.alchemyapi.com/calls';
const _urlBases = {
	text: _url + '/text/Text',
	url: _url + '/url/URL',
	html: _url + '/html/HTML'
};


function _post(contentType, key, endpoint, content, args) {

	let body = Object.assign({}, {
		apikey: key,
		outputMode: 'json',
		[contentType]: content,
	}, args);

	let config = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	};

	return axios.post(_urlBases[contentType] + endpoint, urlEncode(body), config)
		.then(res => {
			let parsed = res.data;
			if(parsed.status == 'ERROR') {
				return Promise.reject(new Error(parsed.statusInfo));
			}
			return parsed;
		});
}

function sanitizer(content) {
	return !('text' in content && blacklist_regex.test(content['text']));
}

function getAllTheThings(content, contentType, key, sanitize) {
	sanitize = sanitize || false;
	contentType = contentType || 'text';

	return _post(contentType, key, 'GetCombinedData', content, {
		extract: 'concept,entity,keyword,taxonomy,doc-emotion,doc-sentiment',
		knowledgeGraph: 1,
		sentiment: 1,
		quotations: 1,
		keywordExtractMode: 1,
		emotion: 1,
		language: "english",
	}).then(data => {
		return {
			concepts: sanitize ? data.concepts.filter(sanitizer) : data.concepts,
			entities: sanitize ? data.entities.filter(sanitizer) : data.entities,
			keywords: sanitize ? data.keywords.filter(sanitizer) : data.keywords,
			taxonomy: sanitize ? data.taxonomy.filter(sanitizer) : data.taxonomy,
			emotions: data.docEmotions,
			sentiment: data.docSentiment
		};
	})
}


// why
let urlEncode = obj => {
	let str = [];
	for(let p in obj) {
		str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
	}
	return str.join("&");
};

module.exports = {
	getAllTheThings
}
