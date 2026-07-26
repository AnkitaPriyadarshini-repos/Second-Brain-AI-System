import urllib.request
import json
import subprocess

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
token = [l.split('password=')[1].strip() for l in out.splitlines() if l.startswith('password=')][0]

headers = {'Authorization': f'token {token}', 'User-Agent': 'Mozilla/5.0'}

url = 'https://api.github.com/search/issues?q=author:AnkitaPriyadarshini-repos+type:pr+is:merged'
req = urllib.request.Request(url, headers=headers)

try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    print(f"Total merged PRs found by GitHub Search index: {data.get('total_count')}")
    for item in data.get('items', [])[:10]:
        print(f" - #{item.get('number')} in {item.get('repository_url').split('/')[-1]}: {item.get('title')} ({item.get('closed_at')})")
except Exception as e:
    print("Error querying search API:", e)
