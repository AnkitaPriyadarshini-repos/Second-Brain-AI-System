import urllib.request
import json
import subprocess

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
token = [l.split('password=')[1].strip() for l in out.splitlines() if l.startswith('password=')][0]

headers = {'Authorization': f'token {token}', 'User-Agent': 'Mozilla/5.0'}

url = 'https://api.github.com/search/repositories?q=topic:first-contributions+stars:>10&sort=updated'
req = urllib.request.Request(url, headers=headers)

try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    print(f"Total repos found: {data.get('total_count')}")
    for item in data.get('items', [])[:5]:
        print(f"Repo: {item['full_name']} | Stars: {item['stargazers_count']} | URL: {item['html_url']}")
except Exception as e:
    print('Search error:', e)
