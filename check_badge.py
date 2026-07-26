import urllib.request
import re

url = 'https://github.com/AnkitaPriyadarshini-repos'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    res = urllib.request.urlopen(req)
    html = res.read().decode('utf-8')
    
    badges = []
    if 'pull-shark' in html.lower() or 'pull shark' in html.lower():
        badges.append('Pull Shark')
    if 'pair-extraordinaire' in html.lower() or 'pair extraordinaire' in html.lower():
        badges.append('Pair Extraordinaire')
    if 'yolo' in html.lower():
        badges.append('YOLO')
    if 'quickdraw' in html.lower():
        badges.append('Quickdraw')
    if 'starstruck' in html.lower():
        badges.append('Starstruck')

    print("Profile URL:", url)
    print("Detected Badges in HTML:", badges)
    
    matches = re.findall(r'alt="Achievement: ([^"]+)"', html)
    print("Found Achievement Alts:", matches)
    
    # Search for badges or achievements section
    ach_matches = re.findall(r'achievements[^\"]*', html, re.IGNORECASE)
    print("Achievement links found:", len(ach_matches))
except Exception as e:
    print("Error fetching profile:", e)
