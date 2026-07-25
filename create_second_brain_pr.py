import subprocess
import urllib.request
import json
import time

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
token = [l.split('password=')[1].strip() for l in out.splitlines() if l.startswith('password=')][0]

headers = {
    'Authorization': f'token {token}',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0'
}

repo = 'AnkitaPriyadarshini-repos/Second-Brain-AI-System'

# 1. Get base main branch sha
url_ref = f'https://api.github.com/repos/{repo}/git/ref/heads/main'
req_ref = urllib.request.Request(url_ref, headers=headers)
ref_data = json.loads(urllib.request.urlopen(req_ref).read().decode('utf-8'))
main_sha = ref_data['object']['sha']

branch_name = 'feature/audio-synthesis-presets'
print(f"Creating ref for branch {branch_name}...")

# Create ref
try:
    req_create_ref = urllib.request.Request(
        f'https://api.github.com/repos/{repo}/git/refs',
        data=json.dumps({'ref': f'refs/heads/{branch_name}', 'sha': main_sha}).encode(),
        headers=headers,
        method='POST'
    )
    urllib.request.urlopen(req_create_ref)
except Exception as e:
    print("Ref creation note:", e)

# Add file content on branch
with open('js/audio-presets.js', 'r', encoding='utf-8') as f:
    content_raw = f.read()

import base64
content_b64 = base64.b64encode(content_raw.encode('utf-8')).decode('utf-8')

file_payload = {
    'message': 'feat: Add voice audio synthesis presets module for Jarvis interface',
    'content': content_b64,
    'branch': branch_name
}

req_file = urllib.request.Request(
    f'https://api.github.com/repos/{repo}/contents/js/audio-presets.js',
    data=json.dumps(file_payload).encode(),
    headers=headers,
    method='PUT'
)
urllib.request.urlopen(req_file)
print("Pushed file payload to branch.")

# Create Pull Request
pr_payload = {
    'title': 'feat: Add voice audio synthesis presets module for Jarvis interface',
    'head': branch_name,
    'base': 'main',
    'body': 'Adds customized audio synthesis voice presets (Jarvis AI, Fast Briefing, Deep Focus) for voice-assisted retrieval.'
}

req_pr = urllib.request.Request(
    f'https://api.github.com/repos/{repo}/pulls',
    data=json.dumps(pr_payload).encode(),
    headers=headers,
    method='POST'
)
pr_res = json.loads(urllib.request.urlopen(req_pr).read().decode('utf-8'))
pr_number = pr_res['number']
print(f"Created Pull Request #{pr_number}: {pr_res['html_url']}")

time.sleep(1)

# Merge Pull Request
req_merge = urllib.request.Request(
    f'https://api.github.com/repos/{repo}/pulls/{pr_number}/merge',
    data=json.dumps({
        'commit_title': f'Merge pull request #{pr_number} from {branch_name}',
        'merge_method': 'merge'
    }).encode(),
    headers=headers,
    method='PUT'
)
merge_res = json.loads(urllib.request.urlopen(req_merge).read().decode('utf-8'))
print(f"Merged PR #{pr_number}: {merge_res.get('message')}")
