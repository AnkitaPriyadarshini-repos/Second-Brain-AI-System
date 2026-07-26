import urllib.request
import json
import subprocess

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
token = [l.split('password=')[1].strip() for l in out.splitlines() if l.startswith('password=')][0]

url = 'https://api.github.com/repos/fork-commit-merge/fork-commit-merge/pulls/7744'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Authorization': f'token {token}'})

try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    print(f"PR #7744 State: {data.get('state')}")
    print(f"Merged: {data.get('merged')}")
    print(f"Mergeable state: {data.get('mergeable_state')}")
except Exception as e:
    print('Error:', e)
