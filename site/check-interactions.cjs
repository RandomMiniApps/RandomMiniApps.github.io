// Behaviour checks for controls without a browser dependency.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Element {
  constructor(dataset = {}) { this.dataset = dataset; this.attrs = {}; this.listeners = {}; this.hidden = false; this.style = {}; this.textContent = ''; this.classes = new Set(); this.classList = { contains: c => this.classes.has(c), remove: c => this.classes.delete(c), toggle: (c, on) => on ? this.classes.add(c) : this.classes.delete(c) }; }
  setAttribute(k,v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(k,fn) { this.listeners[k] = fn; }
  emit(k,event = {}) { this.listeners[k]?.(event); }
  focus() { this.focused = true; }
}
const toggle = new Element(), nav = new Element(); toggle.setAttribute('aria-expanded','false');
const filters = ['all','reading','safety'].map(filter => new Element({filter}));
const cards = ['reading','safety','tools'].map(category => new Element({category}));
const status = new Element(); const catalogue = new Element();
catalogue.querySelectorAll = q => q === '[data-category]' ? cards : filters;
catalogue.querySelector = () => status;
function control(values) { const el = new Element(); el.values = values; el.selectedIndex = 0; Object.defineProperty(el,'value',{get(){return this.values[this.selectedIndex];}}); return el; }
const font = control(['system-ui, sans-serif','Georgia, serif']); const spacing = control(['1.8','2.1']); const tint = control(['#fbf7ee','#e9f1e8']);
const readerText = new Element(), reset = new Element(), reader = new Element();
reader.querySelector = q => ({'.reader-text':readerText,'[name=font]':font,'[name=spacing]':spacing,'[name=tint]':tint,'[data-reset]':reset})[q];
const buttons = [0,1,2].map(i=>new Element({sample:String(i)})); const panels = [0,1,2].map(i=>new Element({samplePanel:String(i)})); const samples = new Element();
samples.querySelectorAll = q => q === '[data-sample]' ? buttons : panels;
const document = new Element();
document.querySelector = q => q === '.menu-toggle' ? toggle : nav;
document.querySelectorAll = q => ({'[data-catalogue]':[catalogue],'[data-reader]':[reader],'[data-samples]':[samples]})[q] || [];
vm.runInNewContext(fs.readFileSync('assets/brand/site.js','utf8'),{document,window:{location:{search:'',pathname:'/'}},URLSearchParams});
toggle.emit('click'); assert.equal(toggle.getAttribute('aria-expanded'),'true'); assert(nav.classList.contains('open'));
document.emit('keydown',{key:'Escape'}); assert.equal(toggle.getAttribute('aria-expanded'),'false'); assert(toggle.focused);
toggle.emit('click'); nav.emit('click',{target:{closest:()=>true}}); assert.equal(toggle.getAttribute('aria-expanded'),'false');
filters[1].emit('click'); assert.deepEqual(cards.map(c=>c.hidden),[false,true,true]); assert.equal(status.textContent,'1 apps shown'); assert.equal(filters[1].getAttribute('aria-pressed'),'true');
filters[0].emit('click'); assert(cards.every(c=>!c.hidden)); assert.equal(status.textContent,'3 apps shown');
font.selectedIndex=1; spacing.selectedIndex=1; tint.selectedIndex=1; font.emit('change'); assert.equal(readerText.style.fontFamily,'Georgia, serif'); assert.equal(readerText.style.lineHeight,'2.1'); assert.equal(readerText.style.backgroundColor,'#e9f1e8');
reset.emit('click'); assert.equal(readerText.style.fontFamily,'system-ui, sans-serif'); assert.equal(readerText.style.lineHeight,'1.8'); assert.equal(readerText.style.backgroundColor,'#fbf7ee');
buttons[2].emit('click'); assert.deepEqual(panels.map(p=>p.hidden),[true,true,false]); assert.equal(buttons[2].getAttribute('aria-pressed'),'true'); assert.equal(buttons[0].getAttribute('aria-pressed'),'false');
// Pages without interactive controls must initialise without errors.
vm.runInNewContext(fs.readFileSync('assets/brand/site.js','utf8'),{document:{querySelector:()=>null,querySelectorAll:()=>[]},window:{location:{search:'',pathname:'/'}},URLSearchParams});
console.log('PASS: mobile menu, Escape/focus, catalogue filtering, reader preferences/reset, sample selection, non-interactive pages.');

let redirected; vm.runInNewContext(fs.readFileSync('assets/brand/site.js','utf8'),{window:{location:{search:'?lang=es',pathname:'/apps/dyslexia-reading-lens/',replace:url=>redirected=url}},URLSearchParams}); assert.equal(redirected,'/international/dyslexia-reading-lens/?lang=es'); console.log('PASS: existing language URLs route to retained translations.');
