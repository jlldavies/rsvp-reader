/**
 * Generates a self-contained single-file HTML RSVP reader artifact.
 *
 * All logic is vanilla JS — no external dependencies, no server calls.
 * The document data is embedded as JSON so the artifact works offline
 * inside Claude's artifact iframe.
 *
 * Behavior mirrors the web app's RsvpDisplay component:
 *  - phantom (context) words gathered up to nearest sentence boundary
 *  - focus brackets [...] around the current word(s)
 *  - same layout: prefix flex:1 right-anchored, ORP 1ch, suffix flex:2 left-anchored
 *  - multi-word centered with side phantom zones
 *  - non-breaking spaces at flex-cell boundaries
 */

export interface ArtifactSection {
  heading: string | null;
  tokens: Array<{
    text: string;
    orpIndex: number;
    displayMs: number;
    isParagraphEnd: boolean;
    isSectionEnd: boolean;
  }>;
}

// Defaults match DEFAULT_SETTINGS in @rsvp-reader/core
const DEFAULTS = {
  background: '#fafafa',
  textColor: '#333333',
  orpColor: '#ff2c2c',
  phantomColor: '#bbbbbb',
  bracketColor: '#888888',
  showBrackets: true,
  showPhantom: true,
  fontFamily: "'IBM Plex Mono', 'Roboto Mono', Courier, monospace",
  fontSize: 52,
  maxLookahead: 12,
};

export function generateArtifact(
  sections: ArtifactSection[],
  title: string,
  initialWpm: number
): string {
  const docJson = JSON.stringify({ title, sections }).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title.replace(/</g, '&lt;')}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:${DEFAULTS.background};color:${DEFAULTS.textColor};font-family:${DEFAULTS.fontFamily};
  display:flex;flex-direction:column;height:100vh;overflow:hidden;user-select:none}

#doc-title{padding:8px 16px;font-size:13px;color:#666;border-bottom:1px solid #ddd;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}

#prog-wrap{padding:4px 16px 0;flex-shrink:0}
#prog-track{height:4px;background:#e5e5e5;border-radius:2px;cursor:pointer}
#prog-fill{height:100%;background:#2563eb;border-radius:2px;transition:width .1s linear;width:0%}
#prog-labels{display:flex;justify-content:space-between;margin-top:3px}
#prog-pct,#prog-time{font-size:11px;color:#999}

#display{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:20px;min-height:0}

.reticle{display:flex;width:100%;align-items:center;margin:8px 0}
.rl{height:1px;background:#aaa;opacity:.35}
.rl.left{flex:1}.rl.right{flex:2}
.rg{width:1ch;flex-shrink:0}

/* Single-word layout: prefix:1 / orp:1ch / suffix:2 — overflow clipped on outside */
#word-row{display:flex;width:100%;align-items:baseline;font-size:${DEFAULTS.fontSize}px;font-weight:400;line-height:1.2}
.zone-left{flex:1;display:flex;justify-content:flex-end;align-items:baseline;min-width:0;overflow:hidden}
.zone-orp{flex-shrink:0;width:1ch;text-align:center;color:${DEFAULTS.orpColor}}
.zone-right{flex:2;display:flex;justify-content:flex-start;align-items:baseline;min-width:0;overflow:hidden}
.inner{flex-shrink:0;white-space:nowrap}

/* Multi-word layout: words anchored at center, phantoms in clippable side zones */
#multi-row{display:none;width:100%;align-items:baseline;font-size:${DEFAULTS.fontSize}px;font-weight:400;line-height:1.2}
.mw-side-left{flex:1;display:flex;justify-content:flex-end;align-items:baseline;min-width:0;overflow:hidden}
.mw-center{flex-shrink:0;white-space:nowrap}
.mw-side-right{flex:1;display:flex;justify-content:flex-start;align-items:baseline;min-width:0;overflow:hidden}
.mw-group{white-space:nowrap}
.mw-orp{color:${DEFAULTS.orpColor}}

.phantom{color:${DEFAULTS.phantomColor}}
.bracket{color:${DEFAULTS.bracketColor}}

#section-break{display:none;text-align:center;flex-direction:column;
  align-items:center;justify-content:center;gap:12px;flex:1}
#section-break h2{font-size:26px;font-weight:600;color:${DEFAULTS.textColor}}
#section-break p{font-size:14px;color:#666}

#placeholder{font-size:16px;color:#999;font-style:italic}

#controls{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:10px;
  padding:12px 20px;border-top:1px solid #ddd;background:#f5f5f5}
.btn-row{display:flex;align-items:center;gap:12px}
button{background:none;border:1px solid #ccc;color:${DEFAULTS.textColor};border-radius:8px;
  padding:5px 14px;font-size:18px;cursor:pointer;line-height:1.4}
button:hover{border-color:#2563eb}
#play-btn{background:#2563eb;color:#fff;border:none;border-radius:10px;padding:7px 22px;font-size:22px}
#wpm-row{display:flex;align-items:center;gap:8px;font-size:13px;color:#666}
#wpm-slider{width:150px;cursor:pointer;accent-color:#2563eb}
#key-hint{font-size:10px;color:#999}

@keyframes flash{from{opacity:.15}to{opacity:1}}
.flash{animation:flash 80ms ease-out}
</style>
</head>
<body>

<div id="doc-title">Loading…</div>

<div id="prog-wrap">
  <div id="prog-track"><div id="prog-fill"></div></div>
  <div id="prog-labels"><span id="prog-pct">0%</span><span id="prog-time"></span></div>
</div>

<div id="display">
  <div class="reticle"><div class="rl left"></div><div class="rg"></div><div class="rl right"></div></div>
  <div id="word-row">
    <div class="zone-left"><span class="inner" id="wp"></span></div>
    <span class="zone-orp" id="wo"></span>
    <div class="zone-right"><span class="inner" id="ws"></span></div>
  </div>
  <div id="multi-row">
    <div class="mw-side-left"><span class="inner" id="mw-l"></span></div>
    <div class="mw-center" id="mw-c"></div>
    <div class="mw-side-right"><span class="inner" id="mw-r"></span></div>
  </div>
  <div id="section-break">
    <h2 id="sb-heading">Next Section</h2>
    <p>Press Space to continue</p>
  </div>
  <div id="placeholder">Loading…</div>
  <div class="reticle"><div class="rl left"></div><div class="rg"></div><div class="rl right"></div></div>
</div>

<div id="controls">
  <div class="btn-row">
    <button id="back-btn" title="Back sentence (Delete/Backspace)">&#x23EE;</button>
    <button id="play-btn" title="Play / Pause (Space)">&#x25B6;</button>
    <button id="fwd-btn" title="Skip sentence (Enter)">&#x23ED;</button>
  </div>
  <div id="wpm-row">
    WPM:&nbsp;<span id="wpm-val">${initialWpm}</span>
    <input id="wpm-slider" type="range" min="50" max="1000" step="5" value="${initialWpm}">
  </div>
  <div id="key-hint">Space play/pause &nbsp;|&nbsp; &#x2190;&#x2192; &plusmn;5 WPM &nbsp;|&nbsp; &#x2191;&#x2193; &plusmn;25 WPM &nbsp;|&nbsp; Del back sentence &nbsp;|&nbsp; Enter skip sentence</div>
</div>

<script>
(function(){
const DOC = ${docJson};

// ── flatten tokens ─────────────────────────────────────────────────────
const tokens = DOC.sections.flatMap(function(s){ return s.tokens; });
let idx = 0, playing = false, wpm = ${initialWpm}, timer = null;
let sectionBreakPending = false;

const SHOW_PHANTOM = ${DEFAULTS.showPhantom};
const SHOW_BRACKETS = ${DEFAULTS.showBrackets};
const MAX_LOOKAHEAD = ${DEFAULTS.maxLookahead};

function isSentEnd(t){ return t.isSectionEnd||t.isParagraphEnd||/[.!?]["')\\]}>]?$/.test(t.text); }

// Gather multi-token before/after context, sentence-bounded.
// Mirrors RsvpEngine.buildTokenContext in core.
function phantomContext(i){
  var beforeParts = [], afterParts = [];
  // before: walk backward, stop at sentence-ending token
  for(var b=i-1; b>=0 && beforeParts.length<MAX_LOOKAHEAD; b--){
    var tb = tokens[b];
    if(isSentEnd(tb)) break;
    beforeParts.unshift(tb.text);
  }
  // after: walk forward, include up to and including next sentence-ending token
  if(!isSentEnd(tokens[i])){
    for(var a=i+1; a<tokens.length && afterParts.length<MAX_LOOKAHEAD; a++){
      var ta = tokens[a];
      afterParts.push(ta.text);
      if(isSentEnd(ta)) break;
    }
  }
  return {before:beforeParts.join(' '), after:afterParts.join(' ')};
}

// ── ORP (re-used for multi-word chunks) ───────────────────────────────
function orp(word){
  var s = word.replace(/^[^a-zA-Z0-9À-ÿ]+|[^a-zA-Z0-9À-ÿ]+$/g,'');
  var n = (s||word).length;
  return n<=1?0:n<=5?1:n<=9?2:n<=13?3:4;
}

// ── DOM refs ──────────────────────────────────────────────────────────
var titleEl = document.getElementById('doc-title');
var progFill = document.getElementById('prog-fill');
var progPct  = document.getElementById('prog-pct');
var progTime = document.getElementById('prog-time');
var wordRow  = document.getElementById('word-row');
var wp = document.getElementById('wp');
var wo = document.getElementById('wo');
var ws = document.getElementById('ws');
var multiRow = document.getElementById('multi-row');
var mwL = document.getElementById('mw-l');
var mwC = document.getElementById('mw-c');
var mwR = document.getElementById('mw-r');
var sbEl   = document.getElementById('section-break');
var sbHead = document.getElementById('sb-heading');
var phEl   = document.getElementById('placeholder');
var playBtn = document.getElementById('play-btn');
var slider  = document.getElementById('wpm-slider');
var wpmVal  = document.getElementById('wpm-val');
var progTrack = document.getElementById('prog-track');

titleEl.textContent = DOC.title || 'Document';
phEl.style.display = 'none';

function esc(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── display a token ───────────────────────────────────────────────────
// Layout matches web RsvpDisplay: cell-boundary spaces use &nbsp; (never trimmed).
function show(tok){
  if(!tok) return;
  sbEl.style.display = 'none';
  var ctx = SHOW_PHANTOM ? phantomContext(idx) : {before:'',after:''};
  var words = tok.text.split(' ');
  var bracketOpen = SHOW_BRACKETS ? '<span class="bracket">[</span>' : '';
  var bracketClose = SHOW_BRACKETS ? '<span class="bracket">]</span>' : '';
  // Non-breaking space at cell boundaries to avoid trimming
  var sep = '<span>&nbsp;</span>';

  if(words.length > 1){
    wordRow.style.display = 'none';
    multiRow.style.display = 'flex';
    mwL.innerHTML = (ctx.before ? '<span class="phantom">'+esc(ctx.before)+'</span>'+sep : '') + bracketOpen;
    mwC.innerHTML = words.map(function(w,i){
      var oi = orp(w);
      return (i?'<span>&nbsp;</span>':'')
        +'<span class="mw-group">'
        +esc(w.slice(0,oi))
        +'<span class="mw-orp">'+esc(w[oi]||'')+'</span>'
        +esc(w.slice(oi+1))
        +'</span>';
    }).join('');
    mwR.innerHTML = bracketClose + (ctx.after ? sep+'<span class="phantom">'+esc(ctx.after)+'</span>' : '');
    flash(multiRow);
  } else {
    multiRow.style.display = 'none';
    wordRow.style.display = 'flex';
    var oi = tok.orpIndex;
    var beforeHtml = ctx.before ? '<span class="phantom">'+esc(ctx.before)+'</span>'+sep : '';
    var afterHtml  = ctx.after  ? sep+'<span class="phantom">'+esc(ctx.after)+'</span>'  : '';
    wp.innerHTML = beforeHtml + bracketOpen + esc(tok.text.slice(0,oi));
    wo.textContent = tok.text[oi]||'';
    ws.innerHTML = esc(tok.text.slice(oi+1)) + bracketClose + afterHtml;
    flash(wordRow);
  }
  var pct = tokens.length ? Math.round((idx+1)/tokens.length*100) : 0;
  progFill.style.width = pct+'%';
  progPct.textContent = pct+'%';
  var rem = tokens.length - idx;
  var secs = Math.ceil(rem/wpm*60);
  var m = Math.floor(secs/60), s = secs%60;
  progTime.textContent = m+':'+(s<10?'0':'')+s+' left';
}

function flash(el){
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

// ── section-break overlay ─────────────────────────────────────────────
function showSectionBreak(heading){
  wordRow.style.display = 'none';
  multiRow.style.display = 'none';
  sbHead.textContent = heading || 'Next Section';
  sbEl.style.display = 'flex';
}

// ── engine ────────────────────────────────────────────────────────────
function scheduleNext(){
  if(!playing || idx >= tokens.length) return;
  var tok = tokens[idx];
  show(tok);
  var baseMs = 60000/wpm;
  var ratio = tok.displayMs / (60000/300);
  var delay = baseMs * ratio;
  timer = setTimeout(function(){
    if(!playing) return;
    if(tok.isSectionEnd){
      playing = false;
      playBtn.textContent = '\\u25B6';
      idx++;
      var nxtSec = '';
      for(var si=0;si<DOC.sections.length;si++){
        var sc=DOC.sections[si];
        var cum=0; for(var si2=0;si2<=si;si2++) cum+=DOC.sections[si2].tokens.length;
        if(idx < cum){ nxtSec=sc.heading||''; break; }
      }
      showSectionBreak(nxtSec);
      sectionBreakPending = true;
      return;
    }
    idx++;
    if(idx >= tokens.length){
      playing=false; playBtn.textContent='\\u25B6';
      progTime.textContent='Done!';
      return;
    }
    scheduleNext();
  }, delay);
}

function play(){
  if(sectionBreakPending){ sectionBreakPending=false; sbEl.style.display='none'; }
  if(playing) return;
  if(idx>=tokens.length) idx=0;
  playing=true; playBtn.textContent='\\u23F8';
  scheduleNext();
}

function pause(){
  playing=false; clearTimeout(timer); playBtn.textContent='\\u25B6';
}

function toggle(){ playing?pause():play(); }

// ── sentence navigation ───────────────────────────────────────────────
function seekBack(){
  clearTimeout(timer);
  sectionBreakPending=false;
  sbEl.style.display='none';
  var i=idx-1;
  if(i>=0 && isSentEnd(tokens[i])) i--;
  while(i>0 && !isSentEnd(tokens[i])) i--;
  idx = Math.max(0, isSentEnd(tokens[i])?i+1:0);
  show(tokens[idx]);
  if(playing) scheduleNext();
}

function seekFwd(){
  clearTimeout(timer);
  sectionBreakPending=false;
  sbEl.style.display='none';
  var ahead = tokens.slice(idx, idx+15);
  var pipes  = ahead.filter(function(t){return t.text.includes('|');}).length;
  var nums   = ahead.filter(function(t){return /^[\\d,.$%+\\-/:=]+$/.test(t.text);}).length;
  var tabular = pipes>=2 || (ahead.length>=3 && nums/ahead.length>=0.5);
  var i=idx;
  while(i<tokens.length-1){
    var t=tokens[i]; i++;
    if(tabular ? (t.isSectionEnd||t.isParagraphEnd) : isSentEnd(t)) break;
  }
  idx=i;
  show(tokens[idx]);
  if(playing) scheduleNext();
}

// ── controls ──────────────────────────────────────────────────────────
playBtn.onclick = toggle;
document.getElementById('back-btn').onclick = seekBack;
document.getElementById('fwd-btn').onclick  = seekFwd;

slider.oninput = function(){
  wpm = parseInt(slider.value);
  wpmVal.textContent = wpm;
};

progTrack.onclick = function(e){
  var r = e.currentTarget.getBoundingClientRect();
  var f = Math.min(1,Math.max(0,(e.clientX-r.left)/r.width));
  clearTimeout(timer);
  idx = Math.round(f*(tokens.length-1));
  show(tokens[idx]);
  if(playing) scheduleNext();
};

// ── keyboard ─────────────────────────────────────────────────────────
document.addEventListener('keydown',function(e){
  if(e.target.tagName==='INPUT') return;
  function setWpm(v){ wpm=v; slider.value=v; wpmVal.textContent=v; }
  switch(e.code){
    case 'Space':      e.preventDefault(); toggle(); break;
    case 'Delete':
    case 'Backspace':  e.preventDefault(); seekBack(); break;
    case 'Enter':      e.preventDefault(); seekFwd(); break;
    case 'ArrowRight': e.preventDefault(); setWpm(Math.min(1000,wpm+5));  break;
    case 'ArrowLeft':  e.preventDefault(); setWpm(Math.max(50, wpm-5));   break;
    case 'ArrowUp':    e.preventDefault(); setWpm(Math.min(1000,wpm+25)); break;
    case 'ArrowDown':  e.preventDefault(); setWpm(Math.max(50, wpm-25));  break;
  }
});

// ── init ──────────────────────────────────────────────────────────────
if(tokens.length>0) show(tokens[0]);
})();
</script>
</body>
</html>`;
}
