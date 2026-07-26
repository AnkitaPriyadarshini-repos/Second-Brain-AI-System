import subprocess
import urllib.request
import json
import time

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
token = [l.split('password=')[1].strip() for l in out.splitlines() if l.startswith('password=')][0]

headers = {'Authorization': f'token {token}', 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}

# 1. Fork fork-commit-merge/fork-commit-merge
url_fork = 'https://api.github.com/repos/fork-commit-merge/fork-commit-merge/forks'
req_fork = urllib.request.Request(url_fork, data=json.dumps({}).encode(), headers=headers, method='POST')

try:
    res = urllib.request.urlopen(req_fork)
    fork_data = json.loads(res.read().decode('utf-8'))
    print("Forked successfully:", fork_data.get('full_name'))
except Exception as e:
    print("Fork error (might already exist):", e)
