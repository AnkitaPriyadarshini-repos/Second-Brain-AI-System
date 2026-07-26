import urllib.request
import json

url = 'https://api.github.com/repos/firstcontributions/first-contributions/pulls/121734'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    print(f"PR #121734 State: {data.get('state')}")
    print(f"Merged: {data.get('merged')}")
    print(f"Mergeable state: {data.get('mergeable_state')}")
except Exception as e:
    print('API error:', e)
