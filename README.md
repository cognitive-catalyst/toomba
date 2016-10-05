# toomba

Given unstructured data such as Text, Toomba generates queries to populate a knowledge graph.

The input data is fed through a series of annotators, and the output of the annotators is organized into db insert queries.
- Annotators:
  - Current:
    - AlchemyAPI
    - Concept Insights
    - SIRE
- Query Languages:
  - Current:
    - Cypher
    - SQL (Postgres tested)
    - Gremlin
- Input data types:
  - Current:
    - Text
    - HTML
    - URLs
  - Future:
    - Images

There's some sample usage in python written below. Note that you do not necessarily need to use Python to populate your db.

```python
# using py2neo driver
graph = Graph()

# first, you need to create the node. The transactions returned by toomba assume that a node with this
# type and this id exists already, and will attach concepts, entities, keywords, and taxonomies to this node.
graph.cypher.execute('MERGE (n:test {id: "Barack Obama"})')

# only need to supply nodeType, nodeId, and content. contentType is text by default
# contentType URL and HTML are also supported.
rsp = requests.post("http://toomba.mybluemix.net/cypher/roombamatize", json={
    "nodeType": "test",
    "nodeId": "Barack Obama",
    "content": "Barack Obama is the president of the united states.",
    "contentType": "text"
})

# response is given as a json object with fields 'status' 'message' and 'transactions' which is an array of transactions.
parsed = rsp.json()

# loop through transactions and execute them against the db.
for transaction in parsed['transactions']:
  graph.cypher.execute(transaction)

# for some performance gains can do:
tx = graph.cypher.begin()
for transaction in parsed['transactions']:
    tx.append(transaction)
tx.commit()


print("done")
```

![schema](https://github.ibm.com/watson-prototypes/toomba/blob/master/pictures/schema.png)
