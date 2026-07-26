import subprocess
import urllib.request
import json
import time
import base64

# Retrieve credential password/token via git credential fill
p = subprocess.Popen(['git', 'credential', 'fill'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
out, _ = p.communicate(input='protocol=https\nhost=github.com\n\n')
token = [l.split('password=')[1].strip() for l in out.splitlines() if l.startswith('password=')][0]

headers = {
    'Authorization': f'token {token}',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0'
}

repo = 'AnkitaPriyadarshini-repos/trippa-stayFinder-major-project'
base_url = f'https://api.github.com/repos/{repo}'

# 1. Get base main branch sha
url_ref = f'{base_url}/git/ref/heads/main'
req_ref = urllib.request.Request(url_ref, headers=headers)
ref_data = json.loads(urllib.request.urlopen(req_ref).read().decode('utf-8'))
main_sha = ref_data['object']['sha']
print(f"Initial main branch SHA: {main_sha}")

pr_specs = [
    {
        'branch': 'docs/project-structure',
        'file_path': 'docs/PROJECT_STRUCTURE.md',
        'commit_msg': 'docs: Add project structure and folder layout guide',
        'pr_title': 'docs: Add detailed project structure documentation',
        'pr_body': 'Adds `PROJECT_STRUCTURE.md` documenting directory breakdown for models, controllers, routes, views, and static assets.',
        'content': """# 📁 Trippa StayFinder Project Structure

This document outlines the architectural organization of the Trippa StayFinder application.

## Directory Overview

- **`controllers/`**: Contains request handling logic for listings, reviews, and user authentication.
- **`models/`**: Mongoose schemas defining data structures for `Listing`, `Review`, and `User`.
- **`routes/`**: Express routers mapping HTTP requests to respective controllers (`listing.js`, `review.js`, `user.js`).
- **`views/`**: EJS template views including layouts (`boilerplate.ejs`), partials (navbar, footer, flash messages), and page views.
- **`utils/`**: Helper utilities including custom error classes (`ExpressError.js`) and async wrappers (`wrapAsync.js`).
- **`public/`**: Static web assets including stylesheets (`css/style.css`, `css/rating.css`) and client-side scripts (`js/script.js`, `js/map.js`).
- **`cloudConfig.js`**: Cloudinary storage engine setup for listing image uploads.
- **`schema.js`**: Joi validation schemas for listings and reviews input sanitization.
"""
    },
    {
        'branch': 'docs/api-routes',
        'file_path': 'docs/API_ROUTES.md',
        'commit_msg': 'docs: Add API endpoints and routing overview',
        'pr_title': 'docs: Add API endpoints and HTTP route reference',
        'pr_body': 'Adds `API_ROUTES.md` specifying restful routes for listings, reviews, and authentication.',
        'content': """# 🌐 Trippa StayFinder Route Reference

## 🏡 Listing Routes (`/listings`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/listings` | Index view - List all stays | No |
| GET | `/listings/new` | Form view to create new stay | Yes |
| POST | `/listings` | Create a new stay | Yes |
| GET | `/listings/:id` | Show view - View stay details & map | No |
| GET | `/listings/:id/edit` | Form view to edit stay | Yes (Owner) |
| PUT | `/listings/:id` | Update stay details | Yes (Owner) |
| DELETE | `/listings/:id` | Delete listing & associated reviews | Yes (Owner) |

## 💬 Review Routes (`/listings/:id/reviews`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/listings/:id/reviews` | Submit rating & review for listing | Yes |
| DELETE | `/listings/:id/reviews/:reviewId` | Delete specific review | Yes (Author) |

## 🔐 User Routes (`/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/signup` | Signup form |
| POST | `/signup` | User registration |
| GET | `/login` | Login form |
| POST | `/login` | User authentication |
| GET | `/logout` | Terminate session |
"""
    },
    {
        'branch': 'docs/contributing-guide',
        'file_path': 'docs/CONTRIBUTING.md',
        'commit_msg': 'docs: Add contribution guidelines and setup instructions',
        'pr_title': 'docs: Add developer contribution guidelines',
        'pr_body': 'Adds `CONTRIBUTING.md` outlining standard contribution practices and workflow guidelines.',
        'content': """# 🤝 Contributing to Trippa StayFinder

Thank you for considering contributing to **Trippa StayFinder**!

## Development Workflow

1. **Fork & Clone**: Fork the repository and clone your fork locally.
2. **Branching**: Create a feature or fix branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Environment Setup**: Ensure your `.env` contains valid credentials for MongoDB Atlas, Cloudinary, and Mapbox.
4. **Code Quality**: Ensure code follows existing layout patterns and proper validation via Joi schemas.
5. **Pull Request**: Push your branch to GitHub and open a pull request targeting `main`.
"""
    }
]

for idx, spec in enumerate(pr_specs, 1):
    branch = spec['branch']
    print(f"\n==========================================")
    print(f"Processing PR #{idx}: {spec['pr_title']}")
    print(f"==========================================")

    # 1. Create branch ref from current main_sha
    print(f"Creating ref 'refs/heads/{branch}' from {main_sha[:7]}...")
    req_create_ref = urllib.request.Request(f'{base_url}/git/refs', data=json.dumps({
        'ref': f'refs/heads/{branch}',
        'sha': main_sha
    }).encode(), headers=headers, method='POST')
    
    try:
        urllib.request.urlopen(req_create_ref)
        print("Branch created successfully.")
    except urllib.error.HTTPError as e:
        print(f"Failed to create ref: {e.read().decode('utf-8')}")
        continue

    # 2. Put file content on branch
    encoded_content = base64.b64encode(spec['content'].encode('utf-8')).decode('utf-8')
    file_payload = {
        'message': spec['commit_msg'],
        'content': encoded_content,
        'branch': branch
    }
    print(f"Creating file '{spec['file_path']}' on branch '{branch}'...")
    req_file = urllib.request.Request(f"{base_url}/contents/{spec['file_path']}", data=json.dumps(file_payload).encode(), headers=headers, method='PUT')
    urllib.request.urlopen(req_file)
    print("File committed successfully.")

    # 3. Create Pull Request
    pr_payload = {
        'title': spec['pr_title'],
        'head': branch,
        'base': 'main',
        'body': spec['pr_body']
    }
    print("Creating Pull Request...")
    req_pr = urllib.request.Request(f'{base_url}/pulls', data=json.dumps(pr_payload).encode(), headers=headers, method='POST')
    pr_res = json.loads(urllib.request.urlopen(req_pr).read().decode('utf-8'))
    pr_number = pr_res['number']
    pr_html_url = pr_res['html_url']
    print(f"Pull Request #{pr_number} created: {pr_html_url}")

    time.sleep(2)

    # 4. Merge Pull Request
    merge_payload = {
        'commit_title': f"Merge pull request #{pr_number} from {branch}",
        'merge_method': 'merge'
    }
    print(f"Merging Pull Request #{pr_number}...")
    req_merge = urllib.request.Request(f'{base_url}/pulls/{pr_number}/merge', data=json.dumps(merge_payload).encode(), headers=headers, method='PUT')
    merge_res = json.loads(urllib.request.urlopen(req_merge).read().decode('utf-8'))
    print(f"PR #{pr_number} merged successfully! SHA: {merge_res.get('sha')}")

    main_sha = merge_res.get('sha', main_sha)
    time.sleep(2)

print("\n🎉 All PRs created and merged successfully!")
