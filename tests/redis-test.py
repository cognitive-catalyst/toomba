import redis
import requests

r = redis.StrictRedis(host='9.66.220.140', port=6379)


rsp = requests.post('http://localhost:3000/redis/roombamatize', json={
    'inputKey': 'input',
    'content': 'Obama is the President of the United State'
})


def parse_redis_command(command):
    quoted = command.split('"')[1::2]
    unquoted = command.split('"')[0::2]

    final = list()
    for i in range(len(unquoted)):
        final.extend(list(filter(lambda s: len(s) > 0, unquoted[i].split(' '))))
        if i < len(quoted):
            final.append(quoted[i])

    return final


if rsp.status_code != 200:
    print(rsp.text)
else:
    parsed = rsp.json()
    for tx in parsed['transactions']:
        print(tx)
        converted = parse_redis_command(tx)
        print(converted)

        r.execute_command(*converted)
