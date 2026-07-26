import urllib.request
import re

url = 'https://github.com/AnkitaPriyadarshini-repos?tab=achievements'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})

try:
    res = urllib.request.urlopen(req)
    html = res.read().decode('utf-8')
    
    matches = re.findall(r'Achievement: ([^"]+)', html)
    print("Achievements tab badges:", list(set(matches)))
    
    # Check if Pull Shark is present
    if 'pull shark' in html.lower() or 'pull-shark' in html.lower():
        print("YES! 'Pull Shark' is listed under Achievements!")
    else:
        print("Not yet listed in HTML or pending GitHub background cache update.")
except Exception as e:
    print("Error:", e)
