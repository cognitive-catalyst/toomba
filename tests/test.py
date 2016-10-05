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

parsed = rsp.json()
print(parsed)

tx = graph.cypher.begin()
for transaction in parsed['transactions']:
    tx.append(transaction)

tx.commit()
print("done")
