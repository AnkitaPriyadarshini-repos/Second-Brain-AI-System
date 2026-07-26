import subprocess
import urllib.request
import json

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
token = None
for line in out.splitlines():
    if line.startswith('password='):
        token = line.split('password=')[1].strip()

headers = {'Authorization': f'token {token}', 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}

# 1. Close PR #121733
try:
    req = urllib.request.Request('https://api.github.com/repos/firstcontributions/first-contributions/pulls/121733', data=json.dumps({'state': 'closed'}).encode(), headers=headers, method='PATCH')
    urllib.request.urlopen(req)
    print('Closed old PR #121733')
except Exception as e:
    print('Error closing PR:', e)

# 2. Create new fresh PR
body_text = """Before submitting this pull request, check the changes to see it's only the changes you made intentionally

- [x] I had fun going through this tutorial (/ ^o^)/ and learned on the way ٩( ^ᴗ^ )۶
- [ ] There are some things I'd like to improve in this tutorial.
- [ ] There were steps where I had errors while following this tutorial."""

pr_payload = {
    'title': 'Add AnkitaPriyadarshini-repos to Contributors list',
    'head': 'AnkitaPriyadarshini-repos:add-ankitapriyadarshini-repos',
    'base': 'main',
    'body': body_text
}

try:
    req2 = urllib.request.Request('https://api.github.com/repos/firstcontributions/first-contributions/pulls', data=json.dumps(pr_payload).encode(), headers=headers, method='POST')
    res = urllib.request.urlopen(req2)
    new_pr = json.loads(res.read().decode('utf-8'))
    num = new_pr['number']
    url = new_pr['html_url']
    print(f"Successfully created fresh PR #{num}!")
    print(f"PR URL: {url}")
except Exception as e:
    print('Error creating new PR:', e)
