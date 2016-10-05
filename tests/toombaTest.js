'use strict';

import axios from 'axios';
import {expect} from 'chai';
import constants from './constants';
import Neo from './../utils/neo-wrapper';
import _ from 'lodash';

const neoDB = new Neo({ connection: constants.test_neo_url });
const mochaAsync = (fn) => {
    return async (done) => {
        try {
            await fn();
            done();
        } catch (err) {
            done(err);
        }
    };
};

describe('Testing Toomba', function () {

  describe('Cypher', function () {

    console.log(`Connecting to Neo4J DB URL: ${constants.test_neo_url}`);

    this.timeout(300000);

    it('can insert a node', mochaAsync(async () => {
			let response = await neoDB.cypher({
        "query": "MERGE (n:test {id: \"Barack Obama\"}) return n;"
      });

      let data = response[0].n;

      expect(data.labels[0]).to.equal('test');
      expect(data.properties.id).to.equal('Barack Obama');
		}));

    it('can insert commands from toomba', mochaAsync(async () => {

      const {data, ...rest} = await axios.post('http://localhost:3000/cypher/roombamatize', {
        "nodeType": "test",
        "nodeId": "Barack Obama",
        "content": "Barack Obama is the president of the united states.",
        "contentType": "text"
      });

      for (let transaction of data.transactions) {
        await neoDB.cypher({ "query": transaction.trim() });
      }
    }));

  });

	describe('Gremlin', function () {

    let url = constants.test_titan_url;
    console.log(`Connecting to Titan DB URL: ${url}`);

    this.timeout(300000);

		it('can insert a node', mochaAsync(async () => {
			let response = await axios.post(url, {
				"gremlin": "def g = graph.traversal(); g.V().hasLabel('test').has('id', 'Barack Obama').tryNext().orElseGet({g.addV(T.label, 'test', 'id', 'Barack Obama')})"
			});

      let data = response.data.result.data[0];

      expect(data.label).to.equal('test');
      expect(data.type).to.equal('vertex');
      expect(data.properties.id[0].value).to.equal('Barack Obama');
		}));

    it('can insert commands from toomba', mochaAsync(async () => {

      const {data, ...rest} = await axios.post('http://localhost:3000/gremlin/roombamatize', {
        "nodeType": "test",
        "nodeId": "Barack Obama",
        "content": "Barack Obama is the president of the united states.",
        "contentType": "text"
      });

      for (let transaction of data.transactions) {
        await axios.post(url, transaction);
      }
    }));

	});

  describe('Compare Data from Neo4j and Titan', function () {

    this.timeout(300000);
    let url = constants.test_titan_url;

    it('has the same nodes', mochaAsync(async () => {

      /*
       *  Note :
       *  1) We always assume that the node has a "label" and an "id" in the properties.
       *  2) Titan supports having multiple values for the same property key. Neo4J doesn't support this.
       *     So we only take into consideration the first value for the key.
       *  3) Similarily, Neo4J supports multiple labels, where as Titan doesn't have support for that.
       *    So we only take the first Neo4J label into consideration.
       *  4) Neo4J supports having "label" as a property, where as its a reserved keyword in titan. In Neo4J
       *    we are using the label as a property for "CIConcept", which has been renamed to "conceptLabel" in Titan
       *  5) It assumes that the database is empty before inserting the toomba commands
       */

      let titanResponse = await axios.post(url, {
        "gremlin": "def g = graph.traversal(); g.V();"
      });

      // Process the Titan Data to make it into a standard format for easier comparing
      let titanData = {};
      for (let i = 0; i < titanResponse.data.result.data.length; i++) {
        let nodeData = titanResponse.data.result.data[i];
        let id = nodeData.properties.id[0].value;
        let label = nodeData.label;

        let temp = {
          "label": label
        };

        let keys = Object.keys(nodeData.properties);

        for (let j = 0; j < keys.length; j++) {
          temp[keys[j]] = nodeData.properties[keys[j]][0].value;
        }

        titanData[`${id}-${label}`] = temp;
      }

      let neo4jResponse = await neoDB.cypher({
        "query": "MATCH (n) RETURN n"
      });

      // process the Neo4J data to make it into a standard format for easier comparing
      let neo4jData = {};
      for (let i = 0; i < neo4jResponse.length; i++) {
        let nodeData = neo4jResponse[i].n;
        let id = nodeData.properties.id;
        let label = nodeData.labels[0];

        let temp = {
          "label": label
        };

        let keys = Object.keys(nodeData.properties);

        for (let j = 0; j < keys.length; j++) {
          // Neo4J supports having "label" as a property, where as its a reserved keyword in titan. In Neo4J
          // we are using the label as a property for "CIConcept", which has been renamed to "conceptLabel" in Titan
          if(keys[j] === "label" && temp.label == "CIConcept") {
            temp["conceptLabel"] = nodeData.properties[keys[j]];
          } else {
            temp[keys[j]] = nodeData.properties[keys[j]];
          }
        }

        neo4jData[`${id}-${label}`] = temp;
      }

      expect(_.isEqual(neo4jData, titanData)).to.equal(true);
    }));

    it('has the same relationships', mochaAsync(async () => {

      let titanVerticesResponse = await axios.post(url, {
        "gremlin": "def g = graph.traversal(); g.V();"
      });

      let titanEdgesResponse = await axios.post(url, {
        "gremlin": "def g = graph.traversal(); g.E();"
      });

      let neo4jVerticesResponse = await neoDB.cypher({
        "query": "MATCH (n) RETURN n"
      });

      let neo4jEdgesResponse = await neoDB.cypher({
        "query": "MATCH ()-[r]-() RETURN r"
      });


      let titanVertices = _.keyBy(titanVerticesResponse.data.result.data, 'id');
      let titanEdges = titanEdgesResponse.data.result.data;


      // Process the Titan Data to make it into a standard format for easier comparing
      let titanData = {};
      for (let i = 0; i < titanEdges.length; i++) {
        let edgeData = titanEdges[i];

        let edgeLabel = edgeData.label;
        let fromLabel = edgeData.outVLabel;
        let toLabel = edgeData.inVLabel;
        let fromId = titanVertices[edgeData.outV].properties.id[0].value;
        let toId = titanVertices[edgeData.inV].properties.id[0].value;

        titanData[`${fromId}-${fromLabel}-${edgeLabel}-${toId}-${toLabel}`] = edgeData.properties || {};
      }

      neo4jVerticesResponse = neo4jVerticesResponse.map(neo4jVertex => neo4jVertex.n);
      let neo4jVertices = _.keyBy(neo4jVerticesResponse, '_id');

      // process the Neo4J data to make it into a standard format for easier comparing
      let neo4jData = {};
      for (let i = 0; i < neo4jEdgesResponse.length; i++) {
        let edgeData = neo4jEdgesResponse[i].r;

        let edgeLabel = edgeData.type;
        let fromLabel = neo4jVertices[edgeData._fromId].labels[0];
        let toLabel = neo4jVertices[edgeData._toId].labels[0];
        let fromId = neo4jVertices[edgeData._fromId].properties.id;
        let toId = neo4jVertices[edgeData._toId].properties.id;

        neo4jData[`${fromId}-${fromLabel}-${edgeLabel}-${toId}-${toLabel}`] = edgeData.properties || {};
      }

      expect(_.isEqual(neo4jData, titanData)).to.equal(true);
    }));
  });

});
