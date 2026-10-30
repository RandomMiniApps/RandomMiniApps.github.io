"""Product-specific presentation for Cliniq's education, accessibility and research apps."""
from html import escape as e
HEALTH = {
'nmc-osce-coach': {
 'category':'Nursing education', 'headline':'Structured practice for nursing OSCE communication.',
 'lead':'Rehearse adult nursing OSCE-style stations aloud. Review your transcript, explore checklist feedback and focus your next practice session.',
 'audience':'Internationally educated nurses preparing for UK adult nursing OSCE-style communication',
 'method':'Timed stations, voice interaction and transcript review', 'output':'Checklist-style feedback and practice planning',
 'scope':'Designed for adult nursing communication practice. It does not provide official OSCE marking, assess clinical competence or guarantee an exam result.',
 'data':'Practice can include speech, recordings and transcripts. Check the app’s permissions and privacy information for how the features in your version handle this content.',
 'use':'Use alongside official preparation materials and educator feedback. Fictional practice scenarios are not instructions for patient care.',
 'workflow':'Prepare. Rehearse. Reflect.', 'note':'Independent of the Nursing and Midwifery Council and test centres.'},
'clinspeak-oet': {
 'category':'Healthcare communication', 'headline':'Focused speaking practice for nurses preparing for OET.',
 'lead':'Build a repeatable practice routine with fictional nursing role plays, timed preparation, audio replay and structured communication feedback.',
 'audience':'Nurses preparing for OET-style speaking tasks',
 'method':'Timed role plays, recording and transcript replay', 'output':'Feedback on clarity, organisation, empathy, relevance and language',
 'scope':'An independent preparation tool. Feedback is for practice and is not an official OET score or a prediction of an exam result.',
 'data':'Speech recognition may involve Apple processing, depending on device support, language and settings. Not every speech feature should be assumed to work entirely offline.',
 'use':'Combine repeated practice with official OET guidance, teacher feedback and conversations with real speaking partners.',
 'workflow':'A complete speaking practice cycle.', 'note':'Not affiliated with or endorsed by the official OET test.'},
'medviva-coach': {
 'category':'Medicine admissions', 'headline':'Practise the conversation behind your medicine application.',
 'lead':'Rehearse medicine interview answers aloud and use structured feedback to reflect on communication, answer structure and your own experience.',
 'audience':'Aspiring medical students preparing for UK MMI-style and panel-style interviews',
 'method':'Spoken practice across motivation, reflection, ethics and teamwork', 'output':'AI feedback to support reflection and another practice attempt',
 'scope':'Supports interview preparation. It does not predict admissions decisions, guarantee offers or replace a tutor, teacher or real mock interview.',
 'data':'Review the app’s microphone permissions and privacy information before recording. Avoid sharing sensitive personal information in practice answers.',
 'use':'Students, parents and teachers can explore the app’s practice scope before choosing it. Check the current App Store age rating and requirements for suitability.',
 'workflow':'Turn preparation into spoken practice.', 'note':'Independent of UCAS, medical schools and official admissions bodies.'},
'dyslexia-reading-lens': {
 'category':'Reading accessibility', 'headline':'A reading workspace that adapts to you.',
 'lead':'Bring scanning, adjustable text, read-aloud highlighting and comprehension tools into one calm reading space on your iPhone.',
 'audience':'Readers who want more control over text presentation, listening and comprehension',
 'method':'Import or scan, adjust the reading view, then read or listen', 'output':'A personal reading workspace with optional AI explanations',
 'scope':'Supports reading comfort and comprehension. It does not diagnose or treat dyslexia, and display preferences are not clinical treatments.',
 'data':'The dedicated privacy policy describes on-device document storage and AI processing. Apple handles purchases and restoration. AI features depend on supported device capabilities.',
 'use':'Choose the settings that feel comfortable to you. Check important information in AI explanations and follow your school’s rules for coursework and exams.',
 'workflow':'Bring your text. Choose your settings.', 'note':'An accessibility tool, not a diagnostic or treatment product.'},
'ucat-sprint-coach': {
 'category':'Admissions preparation', 'headline':'Build a structured approach to UCAT practice.',
 'lead':'Explore original UCAT-style questions, timed drills, mock practice and study planning for medicine and dentistry applicants.',
 'audience':'Medicine and dentistry applicants preparing for UCAT-style tasks',
 'method':'Original practice items, timed drills and mock sessions', 'output':'Practice analytics and study planning',
 'scope':'Original practice questions, not official UCAT items. Estimated scores and readiness measures are practice guidance, not official results.',
 'data':'The existing app information describes on-device practice data and no required account. Read the dedicated privacy notice for the full scope.',
 'use':'Use alongside the current official test guidance. Public download is not yet linked; contact the developer about availability.',
 'workflow':'Understand the practice approach.', 'note':'Independent of the UCAT Consortium, Pearson VUE and universities.'},
'cardiac-aftercare': {
 'category':'Clinical research prototype', 'headline':'Research into structured cardiac recovery information.',
 'lead':'An invite-only prototype exploring governed evidence retrieval, deterministic triage and on-device language models for clinician evaluation.',
 'audience':'Invited cardiac specialists and junior doctors evaluating the prototype',
 'method':'Governed retrieval, deterministic triage and constrained model workflows', 'output':'Research outputs for evaluation within the project’s permitted scope',
 'scope':'Not a public patient service. Not for live patient care, patient self-triage or public distribution. A project description is not clinical approval.',
 'data':'Research access, permitted datasets and information handling depend on the project’s separate notices and approved arrangements. Do not submit identifiable patient information through this website.',
 'use':'Review the documented research scope and contact the developer before considering participation. Public descriptions do not grant access or authorise clinical use.',
 'workflow':'Understand the research scope.', 'note':'Invite-only research. No claim of clinical approval or production readiness.'},
'fractureflow-ai': {
 'category':'Clinical research prototype', 'headline':'Research into evidence-grounded fracture workflows.',
 'lead':'Explore a clinician-facing research prototype combining governed retrieval, recommendation validation and a separate X-ray modelling workstream.',
 'audience':'Invited MIU, ED, orthopaedic and Virtual Fracture Clinic evaluators',
 'method':'Deterministic checks, source-linked retrieval and evaluation workflows', 'output':'Research recommendations and modelling outputs for controlled evaluation',
 'scope':'Not for patient self-triage, live patient care or public distribution. It is not autonomous diagnosis or a replacement for radiology reporting.',
 'data':'Research participation and permitted information handling are governed separately. Do not email patient records or upload identifiable clinical information through public contact channels.',
 'use':'Explore the research methods and limitations, then contact the developer about the intended evaluation scope. Do not use prototype outputs for patient care.',
 'workflow':'Understand the evaluation approach.', 'note':'Independent research; no NHS, hospital or regulatory endorsement is implied.'}
}

def overview(a, *, route, breadcrumbs, cta, link, stepshtml, faq):
 d=HEALTH[a['slug']];u=route(a);research=a['status']=='research'
 status={'available':'Available on the App Store','upcoming':'In development · Coming soon','research':'Invite-only research'}[a['status']]
 body='<div class="health-hero"><div class="wrap">'+breadcrumbs(a)
 body+='<section class="health-hero-grid"><div><div class="eyebrow">Cliniq Labs / '+d['category']+'</div><h1>'+d['headline']+'</h1><p class="health-lead">'+d['lead']+'</p><div class="actions">'+cta(a)+link(u+('details/' if research else 'how-it-works/'),'Review the '+('research' if research else 'workflow'),'btn secondary')+'</div><p class="health-status"><span aria-hidden="true"></span>'+status+'</p><p class="health-independence">'+d['note']+'</p></div>'
 body+='<aside class="product-brief" aria-label="Product summary"><div class="brief-heading"><img src="'+a['icon']+'" width="54" height="54" alt=""><div><span>PRODUCT PROFILE</span><h2>'+e(a['name'])+'</h2></div></div><dl>'+''.join('<div><dt>'+label+'</dt><dd>'+d[key]+'</dd></div>' for label,key in [('Designed for','audience'),('Approach','method'),('What to expect','output')])+'</dl><div class="brief-footer">'+link(u+'details/','Full features & limitations')+'</div></aside></section></div></div>'
 body+='<div class="health-assurance"><div class="wrap">'+''.join(link(url,'<span class="assurance-label">'+label+'</span><strong>'+value+'</strong>','assurance-item') for url,label,value in [('/cliniq-labs/about/','Accountable ownership','Built by Hassan Chizari'),(u+'privacy/','Information handling','Published privacy information'),(u+'support/','Product support','Contact the developer')])+'</div></div>'
 body+='<div class="wrap"><nav class="health-jump" aria-label="On this page"><span>On this page</span><a href="#capabilities">Capabilities</a><a href="#workflow">Workflow</a><a href="#scope">Scope & privacy</a><a href="#questions">Questions</a></nav>'
 body+='<section class="section" id="capabilities"><div class="section-head"><div><div class="eyebrow">Product capabilities</div><h2>'+('Built around a defined research question.' if research else 'Purposeful features. A clear workflow.')+'</h2></div><p>Explore the features and their intended use before deciding whether this '+('project' if research else 'app')+' fits your needs.</p></div><div class="health-capabilities">'
 for i,f in enumerate(a['features'][:4]):body+='<article><span class="capability-index">'+str(i+1).zfill(2)+'</span><h3>'+e(f['title'])+'</h3><p>'+e(f['text'])+'</p></article>'
 body+='</div></section><section class="section health-workflow" id="workflow"><div><div class="eyebrow">'+('Research approach' if research else 'Using the app')+'</div><h2>'+d['workflow']+'</h2><p>'+d['use']+'</p>'+link(u+('details/' if research else 'how-it-works/'),'Explore '+('research details' if research else 'the workflow and examples'))+'</div><div>'+stepshtml(a)+'</div></section>'
 body+='<section class="section" id="scope"><div class="section-head"><div><div class="eyebrow">Product transparency</div><h2>Understand the scope.<br>Know how information is handled.</h2></div></div><div class="health-transparency"><article><span class="transparency-label">01 / Intended use</span><h3>'+('Research boundaries' if research else 'What this app is for')+'</h3><p>'+d['scope']+'</p>'+link('/cliniq-labs/standards/','Our approach to product information')+'</article><article><span class="transparency-label">02 / Data & permissions</span><h3>Privacy in context</h3><p>'+d['data']+'</p>'+link(u+'privacy/','Read the privacy information')+'</article></div></section>'
 body+='<section class="section two-col" id="questions"><div><div class="eyebrow">Common questions</div><h2>Make an informed choice.</h2><p class="lead">Find answers about '+e(a['name'])+', its intended use and its limitations.</p>'+link(u+'support/','Get product support')+'</div>'+faq(a)+'</section>'
 body+='<section class="health-owner"><div><span class="eyebrow">Independent development</span><h2>A named developer.<br>A direct route to support.</h2></div><div><p>'+e(a['name'])+' is developed by Hassan Chizari and presented under Cliniq Labs. Earlier versions and notices may use the Random Mini Apps name.</p><p>For questions or corrections, include the app version and a description of the issue. Please leave out sensitive personal or patient information.</p>'+link(u+'support/','Contact the developer')+'</div></section>'
 body+='<section class="health-final"><div><h2>'+('Discuss the research scope.' if research else 'Explore '+e(a['name'])+'.')+'</h2><p>'+('Contact the developer about evaluation access and project limitations.' if research else 'Check availability, device compatibility and current purchase information before downloading.')+'</p></div>'+cta(a)+'</section></div>'
 return body
