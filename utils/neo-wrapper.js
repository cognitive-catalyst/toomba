import neo4j from 'neo4j'

export default class Neo {

	constructor(config) {
		this.db = new neo4j.GraphDatabase(config.connection)
	}

	cypher(opts) {
		return new Promise((resolve, reject) => {
			this.db.cypher(opts, (err, results) => {
				if (err) {
					console.log(err.message)
					reject(err)
					return
				}
				// const final = !opts.raw ? results.map(this.simplify) : results
				resolve(results)
			})
		})
	}

}
