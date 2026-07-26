import subprocess
import urllib.request
import json
import time

p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
token = [l.split('password=')[1].strip() for l in out.splitlines() if l.startswith('password=')][0]

headers = {'Authorization': f'token {token}', 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}

# 1. Get base main branch sha
url_ref = 'https://api.github.com/repos/AnkitaPriyadarshini-repos/badge-showcase/git/ref/heads/main'
req_ref = urllib.request.Request(url_ref, headers=headers)
ref_data = json.loads(urllib.request.urlopen(req_ref).read().decode('utf-8'))
main_sha = ref_data['object']['sha']

for i in range(1, 4):
    branch_name = f'feature-update-{i}'
    print(f"\n--- Creating PR #{i} on branch {branch_name} ---")

    # Create new ref
    req_create_ref = urllib.request.Request('https://api.github.com/repos/AnkitaPriyadarshini-repos/badge-showcase/git/refs', data=json.dumps({
        'ref': f'refs/heads/{branch_name}',
        'sha': main_sha
    }).encode(), headers=headers, method='POST')
    urllib.request.urlopen(req_create_ref)

    # Create/update file on branch
    file_payload = {
        'message': f'feat: Add feature module {i}',
        'content': 'IyBCYWRnZSBTaG93Y2FzZSBGZWF0dXJlCgpBdXRvbWF0ZWQgY29udGVudCBwYXlsb2FkLg==', # base64 "# Badge Showcase Feature\n\nAutomated content payload."
        'branch': branch_name
    }
    req_file = urllib.request.Request(f'https://api.github.com/repos/AnkitaPriyadarshini-repos/badge-showcase/contents/feature_{i}.md', data=json.dumps(file_payload).encode(), headers=headers, method='PUT')
    urllib.request.urlopen(req_file)

    # Create Pull Request
    pr_payload = {
        'title': f'feat: Add modular feature update #{i}',
        'head': branch_name,
        'base': 'main',
        'body': f'Automated pull request for feature update #{i}'
    }
    req_pr = urllib.request.Request('https://api.github.com/repos/AnkitaPriyadarshini-repos/badge-showcase/pulls', data=json.dumps(pr_payload).encode(), headers=headers, method='POST')
    pr_res = json.loads(urllib.request.urlopen(req_pr).read().decode('utf-8'))
    pr_number = pr_res['number']
    print(f"Created PR #{pr_number}")

    time.sleep(1)

    # Merge Pull Request
    req_merge = urllib.request.Request(f'https://api.github.com/repos/AnkitaPriyadarshini-repos/badge-showcase/pulls/{pr_number}/merge', data=json.dumps({
        'commit_title': f'Merge pull request #{pr_number} from feature-update-{i}',
        'merge_method': 'merge'
    }).encode(), headers=headers, method='PUT')
    merge_res = json.loads(urllib.request.urlopen(req_merge).read().decode('utf-8'))
    print(f"Merged PR #{pr_number}: {merge_res.get('message')}")
    main_sha = merge_res.get('sha', main_sha)

print("\nDone creating and merging PRs!")
