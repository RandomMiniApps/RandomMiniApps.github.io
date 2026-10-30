#!/usr/bin/env python3
"""Build the brand websites with Python's standard library. Run from any directory."""
from pathlib import Path
from html import escape as e
import json, re
from urllib.parse import quote
from xml.etree import ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
BASE='https://randomminiapps.github.io'
APPS=json.loads((ROOT/'site/apps.json').read_text())
BY={a['slug']:a for a in APPS}
CONTACT='bleep.minted4c@icloud.com'
PRIORITY=['nmc-osce-coach','clinspeak-oet','medviva-coach','dyslexia-reading-lens']
PAGES=[]
BRANDS={'cliniq':('Cliniq Labs','Healthcare learning, made practical.'),'logiq':('Logiq Labs','Thoughtful tools for everyday life.')}
HEADLINES={'nmc-osce-coach':'A little practice.<br><em>More confidence.</em>','clinspeak-oet':'Find your words.<br><em>Build your confidence.</em>','medviva-coach':'Your next chapter<br>starts <em>out loud.</em>','dyslexia-reading-lens':'Your words.<br><em>Your way to read.</em>','scamlens':'Pause before you tap.<br><em>See the warning signs.</em>','ucat-sprint-coach':'Make your practice<br><em>time count.</em>'}
HEADLINES.update({'car-hud-display':'Useful information.<br><em>A simpler view.</em>', 'cardiac-aftercare':'Exploring recovery.<br><em>With clear boundaries.</em>', 'fractureflow-ai':'Exploring better tools.<br><em>With safety in view.</em>', 'coloring-book':'A little colour.<br><em>A moment for you.</em>', 'hotspot-check':'Before you connect,<br><em>take a closer look.</em>', 'keepie-yuppie':'One more touch.<br><em>One more try.</em>', 'lighting-check':'See your space<br><em>in a different light.</em>', 'msgsecret':'Your message.<br><em>A different form.</em>', 'natural-text':'A new way<br><em>to shape your text.</em>'})
SHORT={'nmc-osce-coach':'Rehearse adult nursing OSCE-style stations aloud, then reflect with transcripts and checklist feedback.','clinspeak-oet':'A focused space for nurses to rehearse OET-style speaking and reflect on their communication.','medviva-coach':'Practise medicine interview answers aloud, reflect on your approach and prepare for the conversation ahead.','dyslexia-reading-lens':'Make text more comfortable. Read, listen and explore ideas in a calm space on your iPhone.','scamlens':'A calm second opinion on suspicious links, messages and QR codes.','ucat-sprint-coach':'Original practice questions, timed drills and study planning for your admissions journey.'}
CATEGORIES={'dyslexia-reading-lens':'reading','scamlens':'safety','hotspot-check':'safety','msgsecret':'safety','natural-text':'tools','car-hud-display':'tools','lighting-check':'tools','coloring-book':'creative','keepie-yuppie':'creative'}
LEGAL={'dyslexia-reading-lens':'/dyslexia-reading-lens-privacy.html','hotspot-check':'/hotspotcheck-privacy.html','msgsecret':'/apps/msgsecret/privacy/','ucat-sprint-coach':'/ucat-sprint-coach-privacy.html','scamlens':'/scamlens/privacy/'}
TERMS={'dyslexia-reading-lens':'/dyslexia-reading-lens-terms.html','scamlens':'/scamlens/terms/'}
STEPS={
 'nmc-osce-coach':[('Read the door notes','Start with an adult nursing practice station and understand the situation.'),('Practise your response aloud','Use timed practice to organise your communication and work through the station.'),('Reflect and repeat','Review your transcript and checklist-style feedback. Choose one thing to improve next time.')],
 'clinspeak-oet':[('Choose a nursing scenario','Start with a fictional OET-style role play for nursing communication.'),('Speak, then listen back','Use timed preparation and recording to rehearse your response.'),('Make the next attempt better','Review your transcript and feedback on clarity, organisation, empathy, relevance and language.')],
 'medviva-coach':[('Choose a question','Explore motivation, reflection, communication, teamwork or ethical reasoning.'),('Say your answer out loud','Rehearse an interview-style answer in a private, repeatable practice session.'),('Reflect on the feedback','Review your answer structure and communication, then try a different approach.')],
 'dyslexia-reading-lens':[('Bring your text','Paste a passage, scan a page or import a supported document.'),('Make it comfortable','Adjust the font, spacing, colours and focus tools to suit your preferences.'),('Read, listen and explore','Use read-aloud highlighting and available AI tools to support comprehension. Check important details yourself.')]
}
SAMPLES={
 'nmc-osce-coach':[('Opening a conversation','You are meeting a fictional patient for the first time. How would you introduce yourself, check how they would like to be addressed and explain the conversation?','Reflect on your introduction, your explanation and the space you gave the other person to respond.'),('Listening with empathy','A fictional patient says they are worried about being in hospital. Practise acknowledging their concern and inviting them to explain it.','Notice whether you acknowledged the emotion before moving into questions.'),('Closing clearly','Practise summarising a fictional conversation and checking whether the other person has any questions.','Aim for a clear summary and an open invitation to ask questions.')],
 'clinspeak-oet':[('Begin a role play','A fictional patient is meeting you for the first time. Practise introducing yourself and asking what they would like to discuss.','Try a clear introduction, an open question and time for a response.'),('Explore a concern','A fictional patient says: “I am not sure I understood that.” Practise acknowledging this and asking what they would like you to explain.','Reflect on empathy, plain language and checking understanding.'),('Summarise together','Practise ending a fictional conversation with a short summary and an invitation for questions.','Listen back for clarity, organisation and a natural pace.')],
 'medviva-coach':[('Motivation','What has helped you understand why you want to study medicine?','Choose a specific experience, explain what you learned and connect it to your motivation.'),('Teamwork','Tell us about a time you contributed to a team. What would you do differently now?','Explain your own role, acknowledge others and reflect honestly.'),('Reflection','Describe a time you received constructive feedback. How did you respond?','Show the link between the feedback, your action and what changed.')]
}

def route(a): return f"/{a['brand']}-labs/{a['slug']}/"
def brandroute(b): return f'/{b}-labs/'
def mark(b): return f'<span class="mark {"logiq-mark" if b=="logiq" else ""}" aria-hidden="true">{"+" if b=="cliniq" else ""}</span>'
def wordmark(b): return f'<a class="wordmark" href="/{b}-labs/" aria-label="{BRANDS[b][0]} home">{mark(b)}<span>{b.title()} <small>Labs</small></span></a>'
def pair(): return '<div class="brand-pair">'+wordmark('cliniq')+'<span class="brand-divider" aria-hidden="true"></span>'+wordmark('logiq')+'</div>'
def link(url,text,cls='arrow-link'): return f'<a class="{cls}" href="{e(url,quote=True)}">{text} <span aria-hidden="true">↗</span></a>'
def cta(a,secondary=True):
 if a['status']=='research': return link('mailto:'+CONTACT+'?subject='+quote(a['name']+' research enquiry'),'Enquire about research','btn')
 if not a['store']: return link('mailto:'+CONTACT+'?subject='+quote(a['name']+' launch enquiry'),'Ask about availability','btn')
 return link(a['store'],'View on the App Store','btn')
def header(b=None):
 links= ([(brandroute(b)+'#apps','Our apps'),(brandroute(b)+'about/','Our story'),(brandroute(b)+'support/','Support')] if b else [('/#brands','Our brands'),('/#apps','Explore apps'),('/about/','Our story')])
 return '<a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-inner">'+(wordmark(b) if b else pair())+'<button class="menu-toggle" aria-expanded="false" aria-controls="primary-nav">Menu</button><nav class="nav-links" id="primary-nav" aria-label="Main navigation">'+''.join(f'<a href="{u}">{t}</a>' for u,t in links)+f'<a class="nav-contact" href="{brandroute(b) if b else "/"}support/">Get in touch <span aria-hidden="true">↗</span></a></nav></div></header>'
def footer(b=None):
 home=brandroute(b) if b else '/'
 return '<footer class="site-footer"><div class="wrap"><div class="footer-grid"><div>'+(wordmark(b) if b else pair())+'<p>Independent apps, thoughtfully made.<br>Cliniq Labs and Logiq Labs are the new homes for apps previously presented as Random Mini Apps.</p></div><div><h3>Explore</h3><div class="footer-links">'+link('/cliniq-labs/','Cliniq Labs')+link('/logiq-labs/','Logiq Labs')+link('/cliniq-labs/research/','Research projects')+'</div></div><div><h3>Here to help</h3><div class="footer-links">'+link(home+'about/','About the maker')+link(home+'support/','Contact & support')+link('/privacy.html','Privacy policy')+link('/international/','Other languages')+'</div></div></div><div class="footer-bottom"><span>© 2026 Hassan Chizari. Cliniq Labs & Logiq Labs.</span><span>Made with care. Built to be useful.</span></div></div></footer>'
def page(path,title,description,body,b=None,a=None,tab='overview',canonical=None):
 canon=canonical or path
 image=BASE+(a['icon'] if a else f'/assets/brand/{b or "studio"}-social.png')
 meta=f'<meta property="og:type" content="website"><meta property="og:title" content="{e(title,quote=True)}"><meta property="og:description" content="{e(description,quote=True)}"><meta property="og:url" content="{BASE+canon}"><meta property="og:image" content="{image}"><meta name="twitter:card" content="summary_large_image">'
 schema={'@context':'https://schema.org','@type':'WebPage','name':title,'url':BASE+canon,'description':description}
 if a and tab=='overview':
  schema={'@context':'https://schema.org','@type':'SoftwareApplication','name':a['name'],'url':BASE+canon,'description':description,'operatingSystem':a['platform'],'image':image,'publisher':{'@type':'Person','name':'Hassan Chizari'}}
  if a['store']:
   schema['downloadUrl']=a['store']
   match=re.search(r'id(\d+)',a['store'])
   if match: meta+=f'<meta name="apple-itunes-app" content="app-id={match[1]}">'
 sub=''
 if a:
  tabs=[('overview','', 'Overview'),('how-it-works','how-it-works/','How it works'),('details','details/','Details'),('pricing','pricing/','Pricing'),('support','support/','Support')]
  if a['status']=='research': tabs=[t for t in tabs if t[0] not in ['pricing','how-it-works']]
  sub='<div class="app-subnav"><div class="wrap"><a class="sub-name" href="'+route(a)+'"><img src="'+a['icon']+'" alt="" width="27" height="27">'+e(a['name'])+'</a><nav aria-label="App navigation">'+''.join(f'<a href="{route(a)+suffix}"'+(' aria-current="page"' if tab==key else '')+'>'+label+'</a>' for key,suffix,label in tabs)+'</nav></div></div>'
 text=f'<!doctype html>\n<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(title)}</title><meta name="description" content="{e(description,quote=True)}"><link rel="canonical" href="{BASE+canon}"><meta name="theme-color" content="#f7f8f4"><link rel="icon" href="/assets/brand/{b or "cliniq"}-mark.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/brand/site.css">{meta}<script type="application/ld+json">{json.dumps(schema).replace("<",chr(92)+"u003c")}</script><script src="/assets/brand/site.js" defer></script></head><body class="{b or "studio"}{" reading" if a and a["slug"]=="dyslexia-reading-lens" else ""}">{header(b)}{sub}<main id="main">{body}</main>{footer(b)}</body></html>\n'
 text=re.sub(r'>(?=<(?:head|meta|link|script|header|footer|main|nav|section|article|div|h[1-6]|p|ul|ol|li|details|summary)\b)', '>\n', text)
 file=ROOT/path.lstrip('/')/'index.html';file.parent.mkdir(parents=True,exist_ok=True);file.write_text(text)
 if not canonical: PAGES.append(path)

def card(a):
 status={'available':'Available on iOS','upcoming':'Coming soon','research':'Research only'}[a['status']]
 return f'<article class="app-card" data-category="{CATEGORIES.get(a["slug"],"learning")}"><div class="card-top"><img src="{a["icon"]}" width="56" height="56" alt="" loading="lazy"><span class="card-brand">{BRANDS[a["brand"]][0]}</span></div><h3>{e(a["name"])}</h3><p>{e(SHORT.get(a["slug"],a["description"]))}</p><div class="card-meta">{status}</div>{link(route(a),"Explore "+e(a['name']))}</article>'
def cards(items):return '<div class="app-grid">'+''.join(card(a) for a in items)+'</div>'
def sectionhead(kicker,title,desc='',url='',label='Explore all apps'):
 return f'<div class="section-head"><div><div class="eyebrow">{kicker}</div><h2>{title}</h2>'+('<p>'+desc+'</p>' if desc else '')+'</div>'+(link(url,label) if url else '')+'</div>'
def principles():return '<div class="principles"><span><b aria-hidden="true">↗</b> Independent by design</span><span><b aria-hidden="true">◎</b> A clear purpose for every app</span><span><b aria-hidden="true">✳</b> Support from the person who builds it</span></div>'
def brandpanel(b):
 iscl=b=='cliniq'; chosen=['clinspeak-oet','nmc-osce-coach','medviva-coach'] if iscl else ['dyslexia-reading-lens','hotspot-check','msgsecret']
 return f'<article class="brand-panel {"" if iscl else "logiq-panel"}"><div class="panel-top">{wordmark(b)}<span class="tag">{"Healthcare & learning" if iscl else "Everyday & useful"}</span></div><span class="orb" aria-hidden="true"></span><h2>{"Practice for your<br>next chapter." if iscl else "A little less friction.<br>A little more possibility."}</h2><p>{"Focused tools for healthcare communication, exam preparation and the journey into medicine." if iscl else "Thoughtful apps for reading, digital confidence and the small things that make a day easier."}</p><div class="mini-apps">'+''.join(f'<img src="{BY[s]["icon"]}" alt="{BY[s]["name"]}" width="46" height="46">' for s in chosen)+f'</div><div class="panel-bottom"><span>{"Learn. Practise. Reflect." if iscl else "Read. Explore. Simplify."}</span>{link(brandroute(b),"Explore "+BRANDS[b][0])}</div></article>'
def gateway():
 body='<div class="wrap"><section class="hero gateway-hero"><div><div class="eyebrow">Two families. One thoughtful approach.</div><h1>Small tools.<br><em>Meaningful possibilities.</em></h1></div><div><p class="intro">For the next step in your career.<br>For a little more ease in your day.<br>Find the tools that fit your world.</p><div class="edition">INDEPENDENT APPS · MADE WITH PURPOSE</div></div></section><section class="brand-grid" id="brands" aria-label="Our two brands">'+brandpanel('cliniq')+brandpanel('logiq')+'</section>'+principles()+'<section class="section" id="apps">'+sectionhead('Find your starting point','Made for real moments.','Focused apps, each with a purpose of its own.')+cards([BY[s] for s in ['nmc-osce-coach','clinspeak-oet','dyslexia-reading-lens']])+'</section><section class="section"><div class="editorial"><div><div class="eyebrow">A familiar maker. A clearer home.</div><h2>Good tools begin<br>with a clear purpose.</h2>'+link('/about/','Meet the maker')+'</div><div><p class="note">Useful software should make its purpose clear—and help you decide whether it belongs in your day.</p><p>Our apps now live in two focused families. The names are new; the commitment to making practical, understandable tools stays the same.</p></div></div></section></div>'
 page('/','Cliniq Labs & Logiq Labs — Apps made with purpose','Explore independent apps for healthcare learning, reading and everyday life from Cliniq Labs and Logiq Labs.',body)
def reader():
 return '''<div class="reader-demo" data-reader><div class="reader-controls"><label>Typeface<select name="font"><option value="system-ui, sans-serif">Clear sans</option><option value="Georgia, serif">Serif</option><option value="'Outfit', sans-serif">Outfit</option></select></label><label>Spacing<select name="spacing"><option value="1.8">Comfortable</option><option value="2.1">Roomier</option><option value="1.5">Compact</option></select></label><label>Background<select name="tint"><option value="#fbf7ee">Warm cream</option><option value="#e9f1e8">Soft sage</option><option value="#ffffff">White</option></select></label></div><div class="reader-text"><p>There is no single right way to read. A little more space, a softer background, or a different font can make the page feel more comfortable. Take your time. Find the settings that feel right for you.</p></div><div class="reader-footer"><span>Try the settings · browser illustration</span><button type="button" data-reset>Reset</button></div></div>'''
def studyvisual(a):
 slug=a['slug']
 if slug=='dyslexia-reading-lens':return reader()
 if slug not in SAMPLES:return f'<div class="icon-hero"><img src="{a["icon"]}" alt="{e(a["name"])} app icon" width="150" height="150"><span>{"Invite-only research" if a["status"]=="research" else "A focused tool for your day"}</span></div>'
 label='Medicine interview practice' if slug=='medviva-coach' else ('Nursing communication' if slug=='nmc-osce-coach' else 'OET-style speaking practice')
 prompt=SAMPLES[slug][0][1]
 wave=''.join(f'<i style="--h:{h}px"></i>' for h in [8,13,23,16,30,20,37,25,18,31,42,24,33,17,26,36,20,12,22,14,8])
 return f'<div class="visual-board"><div class="board-label"><span>A moment to practise</span><span>01 / 03</span></div><div class="study-card"><span class="small">{label}</span><h3>{SAMPLES[slug][0][0]}</h3><p class="prompt">{prompt}</p><div class="wave" aria-hidden="true">{wave}</div><span class="small">Pause. Think. Say it out loud.</span></div><div class="flow-strip"><span>Prepare</span> → <span>Practise</span> → <span>Reflect</span></div><p class="board-foot">Illustrative practice prompt. Not an app screenshot, live AI session or official exam material.</p></div>'
def brandhome(b):
 cl=b=='cliniq'; featured=BY['nmc-osce-coach' if cl else 'dyslexia-reading-lens']
 title='A thoughtful step<br>towards <em>what’s next.</em>' if cl else 'Everyday things.<br><em>A little easier.</em>'
 intro='Focused practice for nursing communication and medicine interviews. Make time to rehearse, reflect and find your own confidence.' if cl else 'A calmer page. A more considered tap. A useful tool just when you need it. Explore apps that fit around your life.'
 body=f'<div class="wrap"><section class="hero split-hero"><div><div class="eyebrow">{BRANDS[b][0]} · Independent apps</div><h1>{title}</h1><p class="intro">{intro}</p><div class="actions">{link("#apps","Find your app","btn")}{link(brandroute(b)+"about/","Our approach","btn secondary")}</div><div class="edition">{"HEALTHCARE EDUCATION · PRACTICE WITH PURPOSE" if cl else "READING · DIGITAL CONFIDENCE · EVERYDAY TOOLS"}</div></div>{studyvisual(featured)}</section>{principles()}<section class="section" id="apps" data-catalogue>'+sectionhead('The collection','Find your next useful tool.' if not cl else 'Your journey. Your practice.','Choose the app that meets you where you are.')
 items=[a for a in APPS if a['brand']==b and a['status']!='research']
 items.sort(key=lambda a:PRIORITY.index(a['slug']) if a['slug'] in PRIORITY else 10)
 if not cl:
  body+='<div class="filter-bar" aria-label="Filter apps">'+''.join(f'<button data-filter="{key}" aria-pressed="{str(key=="all").lower()}">{label}</button>' for key,label in [('all','All apps'),('reading','Reading'),('safety','Digital confidence'),('tools','Everyday tools'),('creative','Creative & play')])+'</div><p class="filter-status" role="status">'+str(len(items))+' apps shown</p>'
 body+=cards(items)+'</section>'
 if not cl: body+='<p class="research-note">Also in development: Daily Bias. Details will be shared when it is ready.</p>'
 body+='<section class="section"><div class="editorial"><div><div class="eyebrow">'+('Clarity comes first' if cl else 'Designed around you')+'</div><h2>'+('Practice tools.<br>Clear expectations.' if cl else 'A little more control.<br>A little less friction.')+'</h2></div><div><p>'+('Our education apps provide independent practice. They do not provide official exam scores or guarantee outcomes. You can explore what each app does, how feedback works and where its limits are before deciding.' if cl else 'Every app has a different job. Explore its features, supported workflows and privacy information to understand what it can do for you.')+'</p>'+link(brandroute(b)+('standards/' if cl else 'about/'),'Read our approach')+'</div></div></section>'
 if cl: body+='<div class="research-note">Looking for our research work? '+link('/cliniq-labs/research/','Explore clinician research projects')+'<p>Research prototypes are separate from our education apps and are not available for patient use.</p></div>'
 body+='</div>'
 page(brandroute(b),BRANDS[b][0]+' — '+BRANDS[b][1],intro,body,b)
def faq(a):
 questions=a['faqs'][:6]
 return '<div class="faq">'+''.join('<details><summary>'+e(f['q'])+'</summary><p>'+e(f['a'])+'</p></details>' for f in questions)+'</div>'
def finalcta(a):return '<div class="wrap final-cta"><div><h2>'+('Explore at your own pace.' if a['status']=='available' else 'Stay close to what’s next.')+'</h2><p>'+('See the current app details, compatibility and purchase options before downloading.' if a['status']=='available' else 'Get in touch to ask about availability and the intended scope of this project.')+'</p></div>'+cta(a)+'</div>'
def breadcrumbs(a):return f'<div class="breadcrumbs"><a href="{brandroute(a["brand"])}">{BRANDS[a["brand"]][0]}</a><span aria-hidden="true">/</span><span>{e(a["name"])}</span></div>'
def stepshtml(a):
 steps=STEPS.get(a['slug'])
 if not steps:return next((s['html'] for s in a['sections'] if 'works' in s['title'].lower()),'<p>'+e(a['description'])+'</p>')
 return '<ol class="steps">'+''.join(f'<li><h3>{title}</h3><p>{copy}</p></li>' for title,copy in steps)+'</ol>'
def overview(a):
 slug=a['slug'];b=a['brand'];desc=SHORT.get(slug,a['description']);head=HEADLINES.get(slug,e(a['name'])+'.<br><em>A clear purpose.</em>')
 body='<div class="wrap">'+breadcrumbs(a)+f'<section class="hero product-hero split-hero"><div><div class="product-name"><img src="{a["icon"]}" alt="" width="43" height="43"><span>{e(a["name"])} · {BRANDS[b][0]}</span></div><h1>{head}</h1><p class="intro">{e(desc)}</p><div class="actions">'+cta(a)+link(route(a)+('details/' if a['status']=='research' else 'how-it-works/'),'Explore how it works','btn secondary')+'</div><p class="microcopy">'+('Independent education tool. No official scoring or guaranteed outcomes.' if b=='cliniq' and a['status']!='research' else ('Invite-only research. Not for patients or live patient care.' if a['status']=='research' else 'Explore the features, limitations and privacy details before you choose.'))+'</p></div>'+studyvisual(a)+'</section>'
 if a['status']!='available':body+='<p class="status-line">'+('Research prototype · Invite-only evaluation · Not a public clinical service' if a['status']=='research' else 'Coming soon · Public download is not yet linked')+'</p>'
 if a['features']:
  body+='<section class="feature-row" aria-label="Key features">'+''.join(f'<article><div class="feature-number">0{i+1}</div><h3>{e(f["title"])}</h3><p>{e(f["text"])}</p></article>' for i,f in enumerate(a['features'][:4]))+'</section>'
 body+='<section class="section two-col"><div><div class="eyebrow">'+('The idea behind it' if a['status']=='research' else 'A simple place to begin')+'</div><h2>'+('Understand the work.<br><em>Understand the limits.</em>' if a['status']=='research' else 'A little structure.<br><em>Your own pace.</em>')+'</h2><p class="lead">'+e(desc)+'</p>'+link(route(a)+'details/','Explore the full details')+'</div><div>'+stepshtml(a)+'</div></section>'
 body+='<section class="section two-col"><div><div class="eyebrow">Before you decide</div><h2>Clear answers.<br><em>No guesswork.</em></h2><p class="lead">Understand what the app offers, how your information is handled and where to find help.</p>'+link(route(a)+'support/','Visit app support')+'</div>'+faq(a)+'</section></div>'+finalcta(a)
 page(route(a),a['name']+' — '+BRANDS[b][0],desc,body,b,a)
 page(a['old'],a['name']+' — '+BRANDS[b][0],desc,body,b,a,canonical=route(a))
def titleblock(a,title,desc):return '<div class="wrap">'+breadcrumbs(a)+f'<header class="page-title"><div class="eyebrow">{e(a["name"])}</div><h1>{title}</h1><p>{desc}</p></header>'
def workflow(a):
 body=titleblock(a,'Make room for<br><em>a useful moment.</em>','Explore the workflow before deciding whether the app is right for you.')+'<section class="section two-col"><div>'+stepshtml(a)+'</div><div>'+studyvisual(a)+'</div></section>'
 if a['slug'] in SAMPLES:
  body+='<section class="section" data-samples>'+sectionhead('Try a practice prompt','Start with a conversation.','These are illustrative website prompts and reflection notes, not app-generated feedback or official exam questions.')+'<div class="sample-tabs" aria-label="Choose a practice prompt">'+''.join(f'<button data-sample="{i}" aria-pressed="{str(i==0).lower()}">{s[0]}</button>' for i,s in enumerate(SAMPLES[a['slug']]))+'</div>'
  for i,(title,prompt,reflection) in enumerate(SAMPLES[a['slug']]):
   body+=f'<article class="sample-detail" data-sample-panel="{i}"'+(' hidden' if i else '')+f'><span class="sample-label">Illustrative prompt</span><h3>{title}</h3><p>{prompt}</p><strong>A reflection to try</strong><p>{reflection}</p></article>'
  body+='</section>'
 if a['slug']=='dyslexia-reading-lens':body+='<div class="prose"><h2>Your settings are personal</h2><p>The browser example demonstrates text presentation using a sample paragraph. It does not process your documents or reproduce the full iPhone app. Display preferences are not a treatment for dyslexia.</p><p>In the app, AI tools depend on supported on-device capabilities. Generated explanations can be inaccurate; check important information.</p></div>'
 body+='</div>'+finalcta(a)
 page(route(a)+'how-it-works/',a['name']+' — How it works','Explore the workflow and examples for '+a['name']+'.',body,a['brand'],a,'how-it-works')
def cleancontent(s):
 # Align marketing with the existing app-specific privacy notice; no new analytics promise.
 s=s.replace('Analytics, if enabled, collects optional anonymous usage events without document contents.','See the app-specific privacy policy for details of data handling.')
 s=s.replace('Random Mini Apps','the developer')
 return s

def details(a):
 body=titleblock(a,'The details,<br><em>in plain English.</em>','Features, intended use and limitations for '+e(a['name'])+'.')+'<div class="prose">'
 for s in a['sections']:
  if 'frequently' in s['title'].lower():continue
  body+='<section><h2>'+e(s['title'])+'</h2>'+cleancontent(s['html'])+'</section>'
 body+='</div></div>'
 page(route(a)+'details/',a['name']+' — Features and limitations',a['description'],body,a['brand'],a,'details')
def pricing(a):
 slug=a['slug']
 free='See the current App Store listing and in-app purchase screen for available access and limits.'
 paid='Where paid options are offered, the app shows the price and billing period before you confirm with Apple.'
 if slug=='dyslexia-reading-lens':free='Try basic reading settings, with limited scanning, listening and AI actions before upgrading.';paid='Pro offers higher limits and expanded document, listening and comprehension tools. Check the current plan in the app for exact entitlements.'
 if slug=='medviva-coach':free='Download the app to explore its current practice offer. Check the free access and limits shown in the app.';paid='The existing listing describes a subscription model. Check the app for the current plan, price and included practice features.'
 if slug=='scamlens':free='Planned as a completely free app, with no ads, subscriptions or in-app purchases.';paid='No paid plan is described for ScamLens. Public download is not yet linked.'
 body=titleblock(a,'Know what you’re<br><em>choosing.</em>','Understand the offer before you commit. Current prices and purchase terms are displayed by Apple and in the app.')
 if a['status']=='upcoming':body+='<p class="status-line">Coming soon. Availability and final purchase options should be checked at release.</p>'
 body+='<div class="price-grid"><section class="price-card"><div class="eyebrow">Getting started</div><h2>Explore the app</h2><p>'+free+'</p>'+cta(a)+'</section><section class="price-card highlight"><div class="eyebrow">Purchase information</div><h2>'+('No paid plan' if slug=='scamlens' else 'Check the current offer')+'</h2><p>'+paid+'</p><p>We do not quote a fixed price here because purchase options can vary by storefront and change over time.</p></section></div><div class="prose"><h2>Before confirming a purchase</h2><ul><li>Check whether the option is a subscription or a one-time purchase.</li><li>Read the price, billing period and any trial terms shown by Apple.</li><li>For subscriptions, manage renewal through your Apple account subscription settings.</li><li>Use the same Apple account when restoring an eligible purchase.</li></ul><p>'+link(route(a)+'support/','Get help with a purchase')+'</p></div></div>'
 page(route(a)+'pricing/',a['name']+' — Pricing and purchase information','Understand access and purchase options for '+a['name']+'.',body,a['brand'],a,'pricing')
def support(a):
 body=titleblock(a,'A little help,<br><em>when you need it.</em>','Support for '+e(a['name'])+'. Contact the developer with a description of what happened.')+'<section class="two-col section"><div><h2>Let’s work it out.</h2><p class="lead">Include your device model, operating system version, app version and the steps that led to the issue. A screenshot can help—remove personal information first.</p><div class="actions">'+link('mailto:'+CONTACT+'?subject='+quote(a['name']+' support'),'Email app support','btn')+'</div><p class="microcopy">'+CONTACT+'</p><p class="tiny">Please do not send patient information, private documents, passwords or payment card details.</p></div><div><h3>Before you contact us</h3><div class="faq"><details><summary>The app is not behaving as expected</summary><p>Close and reopen the app, check for an available update and note any error message. Avoid deleting an app that contains local work unless you have confirmed how to preserve it.</p></details><details><summary>I need help with a purchase</summary><p>Check that you are using the Apple account used for the purchase. If the app offers Restore Purchases, try it. Contact us with the product name and issue, without sending payment details.</p></details><details><summary>I have a privacy question</summary><p>Read the app-specific privacy information below or email the developer. Do not include sensitive content in your initial message.</p></details></div></div></section><div class="prose"><h2>Useful information</h2>'+link(route(a)+'privacy/','App privacy information','resource-link')+link(LEGAL.get(a['slug'],'/privacy.html'),'Full privacy policy','resource-link')
 if a['slug'] in TERMS:body+=link(TERMS[a['slug']],'Terms of use','resource-link')
 body+='<h2>About the app</h2>'+faq(a)+'</div></div>'
 page(route(a)+'support/',a['name']+' — Support','Get help with '+a['name']+', purchases and privacy questions.',body,a['brand'],a,'support')
def privacy(a):
 specific=a['slug']=='dyslexia-reading-lens'
 body=titleblock(a,'Your information.<br><em>A clearer picture.</em>','A short guide to the existing privacy information for '+e(a['name'])+'.')+'<div class="prose">'
 if specific:body+='<h2>Reading and documents</h2><p>The app-specific policy describes document storage and AI processing on your device. AI features use supported on-device capabilities when available. Purchases and restoration are handled by Apple.</p><p>For the precise scope, deletion controls and limitations, read the full app-specific policy.</p>'
 elif a['slug']=='clinspeak-oet':body+='<h2>Speech and practice</h2><p>The shared policy explains that ClinSpeak speech recognition can involve Apple processing, depending on device support, language and settings. Do not assume that every speech feature is fully offline.</p><p>Review the permissions and privacy information for your version before using speech with sensitive content.</p>'
 else:body+='<h2>Read the policy for the features you use</h2><p>Information handling depends on the app and feature. The policy explains local storage, connected services, purchases, exports and support correspondence where applicable.</p>'
 body+='<h2>Contact and support</h2><p>If you email us, we receive your email address, message and any attachments you choose to send. Send only what is needed to explain the issue.</p><h2>Full information</h2><p>This summary does not replace the privacy policy. Existing policy URLs remain available for users of earlier app versions.</p>'+link(LEGAL.get(a['slug'],'/privacy.html'),'Read the full privacy policy','btn')+'</div></div>'
 page(route(a)+'privacy/',a['name']+' — Privacy information','Understand where to find privacy and data handling information for '+a['name']+'.',body,a['brand'],a,'support')

def about(b=None):
 path=brandroute(b) if b else '/'
 body='<div class="wrap"><header class="page-title"><div class="eyebrow">About the maker</div><h1>Independent by design.<br><em>Personal by nature.</em></h1><p>Cliniq Labs and Logiq Labs bring a clearer focus to apps previously presented under Random Mini Apps.</p></header><div class="prose"><h2>Built by Hassan Chizari</h2><p>These are independent apps built by Hassan Chizari. The two brands organise the collection around the people and purposes each app serves. They do not represent separate clinical institutions or imply endorsement by an exam body.</p><h2>Two homes, a shared approach</h2><p>Cliniq Labs brings together healthcare education and preparation tools. Its research projects are described separately, with their current limitations.</p><p>Logiq Labs brings together reading tools, digital confidence and practical everyday apps. Each product has its own purpose, feature details and privacy information.</p><h2>Clarity before claims</h2><p>We want you to understand what an app does before downloading it. Product pages explain its intended use, limitations and where to get help. Illustrative website examples are labelled, and are not presented as actual app screenshots or customer results.</p><h2>A familiar developer name</h2><p>You may still see Random Mini Apps or the developer’s name in earlier app versions, privacy notices or store information. The new brands provide a clearer home for the existing collection.</p>'+link(path+'support/','Get in touch','btn')+'</div></div>'
 page(path+'about/',(BRANDS[b][0] if b else 'Cliniq Labs & Logiq Labs')+' — About the maker','Meet the independent maker behind Cliniq Labs and Logiq Labs.',body,b)
def brandsupport(b=None):
 apps=[a for a in APPS if not b or a['brand']==b]
 body='<div class="wrap"><header class="page-title"><div class="eyebrow">Contact & support</div><h1>Here to help.<br><em>One app at a time.</em></h1><p>Choose your app for support, purchase information and privacy details.</p></header><div class="prose">'+''.join(link(route(a)+'support/',e(a['name']),'resource-link') for a in apps)+'<h2>Something else?</h2><p>For general questions, contact the developer. Please keep your first message free of sensitive or patient information.</p>'+link('mailto:'+CONTACT,'Email '+CONTACT,'btn')+'</div></div>'
 page((brandroute(b) if b else '/')+'support/','Support — '+(BRANDS[b][0] if b else 'Cliniq Labs & Logiq Labs'),'Find app support and contact the developer.',body,b)
def standards():
 body='<div class="wrap"><header class="page-title"><div class="eyebrow">Our approach</div><h1>Useful practice.<br><em>Honest expectations.</em></h1><p>How to understand the scope of Cliniq Labs education apps and research projects.</p></header><div class="prose"><h2>Independent education</h2><p>Our preparation apps offer practice and reflection. They are not official exam products, do not provide official scores and do not guarantee a pass, registration or admission. Check the relevant official body for current requirements.</p><h2>Feedback is a starting point</h2><p>AI-generated feedback may be incomplete or inaccurate. Use it as a prompt for reflection alongside official guidance, educators and real-world practice. Fictional scenarios are not clinical advice or instructions for patient care.</p><h2>Be specific about evidence</h2><p>A product description is not proof of clinical validation. We do not present website examples as measured outcomes or independent reviews. Any future reviewer contribution should be described by its actual scope and date.</p><h2>Research has a separate purpose</h2><p>Cardiac Aftercare and FractureFlow AI are invite-only research prototypes. Their public descriptions do not authorise patient use, live clinical decisions or public distribution.</p><h2>Questions or corrections</h2><p>If you spot unclear wording or a problem with a practice example, tell us which app and version you are using and describe the issue without including patient information.</p>'+link('/cliniq-labs/support/','Contact Cliniq Labs','btn')+'</div></div>'
 page('/cliniq-labs/standards/','Cliniq Labs — Educational scope and standards','Understand educational limitations, AI feedback and research scope.',body,'cliniq')
def research():
 body='<div class="wrap"><header class="page-title"><div class="eyebrow">Cliniq Labs research</div><h1>Work in progress.<br><em>Scope made clear.</em></h1><p>Explore our clinician-facing research projects, separately from our public education apps.</p></header><p class="status-line">Invite-only research prototypes. Not for patient use, live patient care or public distribution.</p>'+cards([a for a in APPS if a['status']=='research'])+'<div class="prose"><h2>About access</h2><p>These pages describe research work and its limitations. They do not grant access to clinical systems or imply governance approval. Contact the developer about the intended evaluation scope.</p></div></div>'
 page('/cliniq-labs/research/','Cliniq Labs — Research projects','Research summaries for Cardiac Aftercare and FractureFlow AI.',body,'cliniq')
def socialassets():
 for b in ['cliniq','logiq','studio']:
  color='#17634f' if b!='logiq' else '#655096'
  title=BRANDS[b][0] if b in BRANDS else 'Cliniq Labs + Logiq Labs'
  desc=BRANDS[b][1] if b in BRANDS else 'Small tools. Meaningful possibilities.'
  svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f7f8f4"/><circle cx="1050" cy="130" r="230" fill="none" stroke="{color}" stroke-opacity=".15"/><circle cx="1050" cy="130" r="190" fill="none" stroke="{color}" stroke-opacity=".15"/><text x="80" y="150" font-family="Arial,sans-serif" font-size="30" fill="{color}">INDEPENDENT APPS · MADE WITH PURPOSE</text><text x="80" y="320" font-family="Arial,sans-serif" font-size="65" fill="#172e2a">{e(title)}</text><text x="80" y="410" font-family="Georgia,serif" font-size="38" fill="{color}">{e(desc)}</text></svg>'
  (ROOT/f'assets/brand/{b}-social.svg').write_text(svg)
  symbol = f'<path d="M16 22h14M23 15v14" stroke="{color}" stroke-width="3"/>' if b=='cliniq' else f'<path d="M16 18l13 2-8 10-5-12 5 12" fill="none" stroke="{color}" stroke-width="1.5"/><g fill="{color}"><circle cx="16" cy="18" r="3"/><circle cx="29" cy="20" r="3"/><circle cx="21" cy="30" r="3"/></g>'
  if b!='studio':(ROOT/f'assets/brand/{b}-mark.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#f7f8f4"/><circle cx="23" cy="22" r="15" fill="none" stroke="{color}" stroke-width="3"/><path d="M33 33l8 8" stroke="{color}" stroke-width="3"/>{symbol}</svg>')
def sitemap():
 ns='http://www.sitemaps.org/schemas/sitemap/0.9';ET.register_namespace('',ns)
 old=ET.parse(ROOT/'sitemap.xml').getroot()
 urls={u.find('{'+ns+'}loc').text for u in old}
 # Branded canonical URLs replace legacy overview entries; legal links remain.
 urls-=set(BASE+a['old'] for a in APPS)
 urls|={BASE+p for p in PAGES}
 out=ET.Element('{'+ns+'}urlset')
 for url in sorted(urls):
  entry=ET.SubElement(out,'{'+ns+'}url');ET.SubElement(entry,'{'+ns+'}loc').text=url
 ET.indent(out);ET.ElementTree(out).write(ROOT/'sitemap.xml',encoding='utf-8',xml_declaration=True)
if __name__=='__main__':
 socialassets();gateway()
 for b in BRANDS:brandhome(b);about(b);brandsupport(b)
 about();brandsupport();standards();research()
 for a in APPS:
  overview(a);details(a);support(a);privacy(a)
  if a['status']!='research':workflow(a);pricing(a)
 sitemap()
 (ROOT/'llms.txt').write_text('# Cliniq Labs and Logiq Labs\n\nIndependent apps by Hassan Chizari, previously presented as Random Mini Apps.\n\n## Brands\n\n- [Cliniq Labs]('+BASE+'/cliniq-labs/): Healthcare education, with research separately labelled.\n- [Logiq Labs]('+BASE+'/logiq-labs/): Reading, digital confidence and everyday tools.\n\n## Apps\n\n'+''.join('- ['+a['name']+']('+BASE+route(a)+'): '+a['description']+' Status: '+a['status']+'.\n' for a in APPS)+'\n## Important context\n\nEducational apps do not provide official scores or guarantee outcomes. Research prototypes are invite-only and not for patient use or live care. Website practice examples are illustrations, not screenshots, live AI or official exam material. Prices and compatibility should be checked in the App Store.\n\n[Support]('+BASE+'/support/) · [Privacy]('+BASE+'/privacy.html)\n')
 (ROOT/'site/generated-pages.json').write_text(json.dumps(PAGES,indent=2)+'\n')
 print(f'Built {len(PAGES)} canonical pages and {len(APPS)} compatible original app pages.')
