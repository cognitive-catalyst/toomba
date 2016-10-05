
import json
import logging
from py2neo import Graph
import requests

logging.basicConfig(filename="debug.log", level=logging.INFO)
graph = Graph("http://watson-proto.blue:7070/db/data")

graph.cypher.execute("MERGE (n:test {id: \"cats_cradle\"})")

rsp = requests.post("http://toomba.mybluemix.net/cypher/roombamatize", json={
    "nodeType": "test",
    "nodeId": "cats_cradle",
    "content": """
   Cat's Cradle is the fourth novel by American writer Kurt Vonnegut, first published in 1963. It explores issues of science, technology, and religion, satirizing the arms race and many other targets along the way. After turning down his original thesis in 1947, the University of Chicago awarded Vonnegut his master's degree in anthropology in 1971 for Cat's Cradle.[1][2]

    The title of the book derives from the string game "cat's cradle". Early in the book, the character Felix Hoenikker (a fictional co-inventor of the atom bomb) was playing cat's cradle when the bomb was dropped, and the game is later referenced by his son, Newton Hoenikker.
    """
})

parsed = rsp.json()
print(len(parsed['transactions']))

tx = graph.cypher.begin()
for transaction in parsed['transactions']:
    tx.append(transaction)

tx.commit()
print("done")
