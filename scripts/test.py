import json
import logging
from py2neo import Graph
import requests

logging.basicConfig(filename="debug.log", level=logging.INFO)
graph = Graph("http://watson:neo4jpassword@neo.ibm.metal.fish:7474/db/data")

graph.cypher.execute("MERGE (n:test {id: \"Barack Obama\"})")

rsp = requests.post("http://toomba.mybluemix.net/cypher/roombamatize", json={
    "nodeType": "test",
    "nodeId": "Barack Obama",
    "content": "Barack Obama is the president of the united states."
})

transactions = rsp.json()

for transaction in transactions:
	logging.info(transaction)
	graph.cypher.execute(transaction)
	logging.info('==========================================================')

print("done")
