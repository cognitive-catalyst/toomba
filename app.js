require('http').globalAgent.maxSockets = Infinity
const express = require('express');
const bodyParser = require('body-parser')
const routes = require('./routes');

const app = express();

app.use(bodyParser.json());
app.get('/', (req, res) => res.send('hello'));
app.use('/', routes);

var server = app.listen(process.env.VCAP_APP_PORT || 3000,  () => {
	var host = server.address().address;
	var port = server.address().port;

	console.log(`node listening at http://${host}:${port}`);
});
