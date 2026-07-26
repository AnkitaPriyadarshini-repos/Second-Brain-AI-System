import urllib.request
import json
import subprocess

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
token = None
for line in out.splitlines():
    if line.startswith('password='):
        token = line.split('password=')[1].strip()

# Fetch PR head sha
url_pr = 'https://api.github.com/repos/firstcontributions/first-contributions/pulls/121734'
req_pr = urllib.request.Request(url_pr, headers={'User-Agent': 'Mozilla/5.0', 'Authorization': f'token {token}'})
res_pr = json.loads(urllib.request.urlopen(req_pr).read().decode('utf-8'))
head_sha = res_pr['head']['sha']
print(f"Head SHA: {head_sha}")

url = f'https://api.github.com/repos/firstcontributions/first-contributions/commits/{head_sha}/check-runs'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Authorization': f'token {token}'})

try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    print(f"Total check runs: {data.get('total_count')}")
    for cr in data.get('check_runs', []):
        print(f"Check: {cr['name']} | Status: {cr['status']} | Conclusion: {cr['conclusion']}")
except Exception as e:
    print('Error:', e)
