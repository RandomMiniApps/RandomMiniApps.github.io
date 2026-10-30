#!/usr/bin/env python3
"""Check generated website routes, local links, metadata and protected paths."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote,urljoin
import json,sys,subprocess
ROOT=Path(__file__).resolve().parents[1]
class Document(HTMLParser):
 def __init__(self,text):
  super().__init__();self.links=[];self.ids=[];self.h1=0;self.canonical=[];self.description=False;self.json=[];self.in_json=False;self.buf='';self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='h1':self.h1+=1
  if tag in ['a','link'] and 'href' in a:self.links.append(a['href'])
  if tag in ['img','script'] and 'src' in a:self.links.append(a['src'])
  if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a['href'])
  if tag=='meta' and a.get('name')=='description':self.description=bool(a.get('content'))
  if tag=='script' and a.get('type')=='application/ld+json':self.in_json=True;self.buf=''
 def handle_data(self,data):
  if self.in_json:self.buf+=data
 def handle_endtag(self,tag):
  if tag=='script' and self.in_json:self.json.append(json.loads(self.buf));self.in_json=False
pages=json.loads((ROOT/'site/generated-pages.json').read_text());apps=json.loads((ROOT/'site/apps.json').read_text())
paths=pages+[a['old'] for a in apps]
errors=[];cache={}
def read(p):
 if p not in cache:cache[p]=Document(p.read_text())
 return cache[p]
for route in paths:
 p=ROOT/route.strip('/')/'index.html';doc=read(p)
 if doc.h1!=1:errors.append(f'{route}: expected one h1, got {doc.h1}')
 if len(doc.ids)!=len(set(doc.ids)):errors.append(f'{route}: duplicate IDs')
 if len(doc.canonical)!=1 or not doc.description:errors.append(f'{route}: missing canonical or description')
 for href in doc.links:
  u=urlsplit(urljoin(route,href))
  if u.scheme or u.netloc:continue
  target=ROOT/unquote(u.path).lstrip('/')
  if target.is_dir():target/='index.html'
  if not target.exists():errors.append(f'{route}: missing {href}')
  elif u.fragment and target.suffix=='.html' and u.fragment not in read(target).ids:errors.append(f'{route}: missing anchor {href}')
 for forbidden in ['/care-rag-review/','/xray-review/']:
  if forbidden in doc.links:errors.append(f'{route}: links to internal review portal')
 for tag in doc.json:
  if 'aggregateRating' in tag:errors.append(f'{route}: unverified rating schema')
 if 'data-reader' in p.read_text() and 'name="font"' not in p.read_text():errors.append(f'{route}: incomplete reading demo')
# Research applications, app content feeds and existing legal documents must be byte-identical.
protected=['care-rag-review','xray-review','scamlens/content','privacy.html','dyslexia-reading-lens-privacy.html','dyslexia-reading-lens-terms.html','hotspotcheck-privacy.html','ucat-sprint-coach-privacy.html','apps/msgsecret/privacy','scamlens/privacy','scamlens/terms','app-ads.txt']
changed=subprocess.check_output(['git','diff','--name-only','--',*protected],cwd=ROOT,text=True).strip()
if changed:errors.append('Protected paths changed: '+changed)
if errors:
 print('\n'.join(errors));sys.exit(1)
print(f'PASS: {len(paths)} pages; local links and anchors; unique IDs; metadata; no invented rating schema; protected files unchanged.')
