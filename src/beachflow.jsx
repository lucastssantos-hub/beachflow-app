import React from 'react';
import { gerarPlano, contextFromParams, salvarEdicao, salvarAvaliacao, listarPlanos } from './ia/gerarPlano.js';
import { supabase, authEnabled } from './supabaseClient.js';
import { listAlunos, listTurmas, getResumo, salvarAlunoCadastro, salvarTurmaCadastro, contextoTurmaParaIA } from './data/alunos.js';
import { listPartidas, getPartida, criarPartida, salvarPonto, encerrarPartida, scoutContext } from './data/scout.js';
import { MODES, OUTCOMES, TECHNIQUES, ZONES, SERVE_SIDES, scoutScoreText, scoutDeciding, tennis, modeLabel, nextScoutServe } from './data/scoutScore.js';
import { DEMO_ALUNOS as ALUNOS, DEMO_TURMAS, DEMO_RADAR_LABELS as RLAB } from './data/demo.js';
import { prepararConfirmacoesTurma, atualizarStatusConfirmacoes, getConfirmacao, responderConfirmacao, confirmationUrl, whatsappUrl, statusLabel, statusTone } from './data/confirmacoes.js';
import { AUTO_FUNDAMENTOS, prepararAutoavaliacaoAluno, salvarAutoavaliacaoToken } from './data/autoavaliacao.js';


/* ===== app/ios-frame.jsx ===== */

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({ dark = false, time = '9:41' }) {
  const c = dark ? '#fff' : '#000';
  return (
    <div style={{
      display: 'flex', gap: 154, alignItems: 'center', justifyContent: 'center',
      padding: '21px 24px 19px', boxSizing: 'border-box',
      position: 'relative', zIndex: 20, width: '100%',
    }}>
      <div style={{ flex: 1, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 1.5 }}>
        <span style={{
          fontFamily: '-apple-system, "SF Pro", system-ui', fontWeight: 590,
          fontSize: 17, lineHeight: '22px', color: c,
        }}>{time}</span>
      </div>
      <div style={{ flex: 1, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, paddingTop: 1, paddingRight: 1 }}>
        <svg width="19" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill={c}/>
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill={c}/>
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill={c}/>
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill={c}/>
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill={c}/>
          <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill={c}/>
          <circle cx="8.5" cy="10.5" r="1.5" fill={c}/>
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke={c} strokeOpacity="0.35" fill="none"/>
          <rect x="2" y="2" width="20" height="9" rx="2" fill={c}/>
          <path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill={c} fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({ children, dark = false, style = {} }) {
  return (
    <div style={{
      height: 44, minWidth: 44, borderRadius: 9999,
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: dark
        ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)'
        : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style,
    }}>
      {/* blur + tint */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 9999,
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)',
      }} />
      {/* shine */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 9999,
        boxShadow: dark
          ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)'
          : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
        border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '0 4px' }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({ title = 'Title', dark = false, trailingIcon = true }) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = (content) => (
    <IOSGlassPill dark={dark}>
      <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {content}
      </div>
    </IOSGlassPill>
  );
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      paddingTop: 62, paddingBottom: 10, position: 'relative', zIndex: 5,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        {/* back chevron */}
        {pillIcon(
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none" style={{ marginLeft: -1 }}>
            <path d="M10 2L2 10l8 8" stroke={muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {/* trailing ellipsis */}
        {trailingIcon && pillIcon(
          <svg width="22" height="6" viewBox="0 0 22 6">
            <circle cx="3" cy="3" r="2.5" fill={muted}/>
            <circle cx="11" cy="3" r="2.5" fill={muted}/>
            <circle cx="19" cy="3" r="2.5" fill={muted}/>
          </svg>
        )}
      </div>
      {/* large title */}
      <div style={{
        padding: '0 16px',
        fontFamily: '-apple-system, system-ui',
        fontSize: 34, fontWeight: 700, lineHeight: '41px',
        color: text, letterSpacing: 0.4,
      }}>{title}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({ title, detail, icon, chevron = true, isLast = false, dark = false }) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', minHeight: 52,
      padding: '0 16px', position: 'relative',
      fontFamily: '-apple-system, system-ui', fontSize: 17,
      letterSpacing: -0.43,
    }}>
      {icon && (
        <div style={{
          width: 30, height: 30, borderRadius: 7, background: icon,
          marginRight: 12, flexShrink: 0,
        }} />
      )}
      <div style={{ flex: 1, color: text }}>{title}</div>
      {detail && <span style={{ color: sec, marginRight: 6 }}>{detail}</span>}
      {chevron && (
        <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0 }}>
          <path d="M1 1l6 6-6 6" stroke={ter} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {!isLast && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          left: icon ? 58 : 16, height: 0.5, background: sep,
        }} />
      )}
    </div>
  );
}

function IOSList({ header, children, dark = false }) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return (
    <div>
      {header && (
        <div style={{
          fontFamily: '-apple-system, system-ui', fontSize: 13,
          color: hc, textTransform: 'uppercase',
          padding: '8px 36px 6px', letterSpacing: -0.08,
        }}>{header}</div>
      )}
      <div style={{
        background: bg, borderRadius: 26,
        margin: '0 16px', overflow: 'hidden',
      }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children, width = 402, height = 874, dark = false,
  title, keyboard = false,
}) {
  return (
    <div style={{
      width, height, borderRadius: 48, overflow: 'hidden',
      position: 'relative', background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: 24, background: '#000', zIndex: 50,
      }} />
      {/* status bar (absolute) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <IOSStatusBar dark={dark} />
      </div>
      {/* nav + content */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {title !== undefined && <IOSNavBar title={title} dark={dark} />}
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
        {keyboard && <IOSKeyboard dark={dark} />}
      </div>
      {/* home indicator — always on top */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60,
        height: 34, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        paddingBottom: 8, pointerEvents: 'none',
      }}>
        <div style={{
          width: 139, height: 5, borderRadius: 100,
          background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)',
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({ dark = false }) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: <svg width="19" height="17" viewBox="0 0 19 17"><path d="M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z" fill={glyph}/></svg>,
    del: <svg width="23" height="17" viewBox="0 0 23 17"><path d="M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z" fill="none" stroke={glyph} strokeWidth="1.6" strokeLinejoin="round"/><path d="M10 5l7 7M17 5l-7 7" stroke={glyph} strokeWidth="1.6" strokeLinecap="round"/></svg>,
    ret: <svg width="20" height="14" viewBox="0 0 20 14"><path d="M18 1v6H4m0 0l4-4M4 7l4 4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  };

  const key = (content, { w, flex, ret, fs = 25, k } = {}) => (
    <div key={k} style={{
      height: 42, borderRadius: 8.5,
      flex: flex ? 1 : undefined, width: w, minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs, fontWeight: 458, color: ret ? '#fff' : glyph,
    }}>{content}</div>
  );

  const row = (keys, pad = 0) => (
    <div style={{ display: 'flex', gap: 6.5, justifyContent: 'center', padding: `0 ${pad}px` }}>
      {keys.map(l => key(l, { flex: true, k: l }))}
    </div>
  );

  return (
    <div style={{
      position: 'relative', zIndex: 15, borderRadius: 27, overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      boxShadow: dark
        ? '0 -2px 20px rgba(0,0,0,0.09)'
        : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)',
    }}>
      {/* liquid glass bg — same recipe as nav pills */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 27,
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 27,
        boxShadow: dark
          ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)'
          : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
        border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
        pointerEvents: 'none',
      }} />

      {/* autocorrect bar */}
      <div style={{
        display: 'flex', gap: 20, alignItems: 'center',
        padding: '8px 22px 13px', width: '100%', boxSizing: 'border-box',
        position: 'relative',
      }}>
        {['"The"', 'the', 'to'].map((w, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ width: 1, height: 25, background: '#ccc', opacity: 0.3 }} />}
            <div style={{
              flex: 1, textAlign: 'center',
              fontFamily: '-apple-system, system-ui', fontSize: 17,
              color: sugg, letterSpacing: -0.43, lineHeight: '22px',
            }}>{w}</div>
          </React.Fragment>
        ))}
      </div>

      {/* key layout */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 13,
        padding: '0 6.5px', width: '100%', boxSizing: 'border-box',
        position: 'relative',
      }}>
        {row(['q','w','e','r','t','y','u','i','o','p'])}
        {row(['a','s','d','f','g','h','j','k','l'], 20)}
        <div style={{ display: 'flex', gap: 14.25, alignItems: 'center' }}>
          {key(icons.shift, { w: 45, k: 'shift' })}
          <div style={{ display: 'flex', gap: 6.5, flex: 1 }}>
            {['z','x','c','v','b','n','m'].map(l => key(l, { flex: true, k: l }))}
          </div>
          {key(icons.del, { w: 45, k: 'del' })}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {key('ABC', { w: 92.25, fs: 18, k: 'abc' })}
          {key('', { flex: true, k: 'space' })}
          {key(icons.ret, { w: 92.25, ret: true, k: 'ret' })}
        </div>
      </div>

      {/* bottom spacer (emoji+mic area, icons omitted) */}
      <div style={{ height: 56, width: '100%', position: 'relative' }} />
    </div>
  );
}

Object.assign(window, {
  IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard,
});


/* ===== app/BrandKit.jsx ===== */
/* BeachFlow — BrandKit: tokens, icons, shared UI atoms */

// ---- inject brand styles once ----
(function injectBrand(){
  if (document.getElementById('bf-style')) return;
  const s = document.createElement('style');
  s.id = 'bf-style';
  s.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  :root{
    --navy-900:#06121F; --navy-850:#08182A; --navy-800:#0B1E33; --navy-700:#102941; --navy-600:#163652;
    --ocean:#1E72E0; --turq:#16C2A3; --turq-soft:#3FD8BC; --coral:#FF6A45; --sand:#EFE1C5;
    --ink:#EAF1F8; --ink-dim:#9FB0C2; --n-500:#74808F;
    --ok:#27C08A; --warn:#F6B43C; --err:#F2545B; --info:#4C9BFF;
    --line:rgba(255,255,255,.09); --line-2:rgba(255,255,255,.16);
    --ff-d:'Archivo',sans-serif; --ff-u:'Hanken Grotesk',sans-serif; --ff-m:'IBM Plex Mono',monospace;
  }
  .bf *{box-sizing:border-box;margin:0;padding:0}
  .bf{font-family:var(--ff-u);color:var(--ink);-webkit-font-smoothing:antialiased}
  .bf-scroll::-webkit-scrollbar{width:0;height:0}
  .bf-scroll{scrollbar-width:none}
  .bf ::selection{background:var(--coral);color:#fff}
  .bf-tap{cursor:pointer;transition:transform .12s ease, filter .15s ease}
  .bf-tap:active{transform:scale(.97);filter:brightness(1.06)}
  @keyframes bf-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes bf-spin{to{transform:rotate(360deg)}}
  `;
  document.head.appendChild(s);
})();

const C = {
  navy900:'#06121F', navy850:'#08182A', navy800:'#0B1E33', navy700:'#102941', navy600:'#163652',
  ocean:'#1E72E0', turq:'#16C2A3', turqSoft:'#3FD8BC', coral:'#FF6A45', sand:'#EFE1C5',
  ink:'#EAF1F8', inkDim:'#9FB0C2', n500:'#74808F',
  ok:'#27C08A', warn:'#F6B43C', err:'#F2545B', info:'#4C9BFF',
  line:'rgba(255,255,255,.09)', line2:'rgba(255,255,255,.16)',
};

// ---- icons (stroke, 24 grid) ----
function Icon({ name, size = 22, color = 'currentColor', sw = 1.8, fill = 'none' }) {
  const p = { fill:'none', stroke:color, strokeWidth:sw, strokeLinecap:'round', strokeLinejoin:'round' };
  const paths = {
    home: <><path {...p} d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></>,
    users: <><circle {...p} cx="12" cy="8" r="3.4"/><path {...p} d="M5 20c0-4 3-6 7-6s7 2 7 6"/></>,
    calendar: <><rect {...p} x="4" y="6" width="16" height="14" rx="2.5"/><path {...p} d="M4 10h16M9 4v4M15 4v4"/></>,
    scout: <><circle {...p} cx="12" cy="12" r="8"/><circle {...p} cx="12" cy="12" r="3"/></>,
    dollar: <><path {...p} d="M12 4v16M8 8h6a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7"/></>,
    chevR: <><path {...p} d="M9 6l6 6-6 6"/></>,
    chevL: <><path {...p} d="M15 6l-6 6 6 6"/></>,
    chevD: <><path {...p} d="M6 9l6 6 6-6"/></>,
    plus: <><path {...p} d="M12 5v14M5 12h14"/></>,
    search: <><circle {...p} cx="11" cy="11" r="7"/><path {...p} d="M16 16l4 4"/></>,
    bell: <><path {...p} d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M9.5 20a2.5 2.5 0 0 0 5 0"/></>,
    check: <><path {...p} d="M5 12l4.5 4.5L19 7"/></>,
    target: <><circle {...p} cx="12" cy="12" r="8"/><circle {...p} cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.4" fill={color} stroke="none"/></>,
    trend: <><path {...p} d="M4 16l5-5 4 3 7-8"/><path {...p} d="M16 6h4v4"/></>,
    flow: <><path {...p} d="M3 9c3-3 6-3 9 0s6 3 9 0"/><path {...p} d="M3 15c3-3 6-3 9 0s6 3 9 0" opacity=".5"/></>,
    clip: <><rect {...p} x="6" y="4" width="12" height="17" rx="2.5"/><path {...p} d="M9 4h6v3H9z" fill={color} stroke="none"/><path {...p} d="M9 12h6M9 16h4"/></>,
    star: <><path {...p} d="M12 4l2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 16.7 7.4 18.6l.9-5.2L4.5 9.5l5.2-.8z"/></>,
    settings: <><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18 6l-1.8 1.8M7.8 16.2 6 18M18 18l-1.8-1.8M7.8 7.8 6 6"/></>,
    back: <><path {...p} d="M11 5l-7 7 7 7M4 12h16"/></>,
    play: <><path d="M7 5l12 7-12 7z" fill={color} stroke={color} strokeWidth={sw} strokeLinejoin="round"/></>,
    whistle: <><circle {...p} cx="9" cy="13" r="5"/><path {...p} d="M14 11h7l-2 4M9 13h.01M9 5v3"/></>,
    bolt: <><path {...p} d="M13 3 5 13h5l-1 8 8-10h-5z"/></>,
    clock: <><circle {...p} cx="12" cy="12" r="8"/><path {...p} d="M12 8v4l3 2"/></>,
    edit: <><path {...p} d="M5 19h14M7 15l9-9 2 2-9 9H7z"/></>,
    x: <><path {...p} d="M6 6l12 12M18 6 6 18"/></>,
    filter: <><path {...p} d="M4 6h16M7 12h10M10 18h4"/></>,
    user: <><circle {...p} cx="12" cy="8" r="3.6"/><path {...p} d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/></>,
    arrowUp: <><path {...p} d="M12 19V5M6 11l6-6 6 6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{display:'block',flexShrink:0}}>{paths[name]}</svg>;
}

// ---- screen wrapper (fills the iOS frame, navy bg) ----
function Screen({ children, bg = C.navy900, pad = true }) {
  return (
    <div className="bf" style={{ height:'100%', display:'flex', flexDirection:'column',
      background:bg, position:'relative' }}>{children}</div>
  );
}

// scrollable body that clears status bar + tab bar
function Body({ children, top = 52, bottom = 26, style = {} }) {
  return (
    <div className="bf-scroll" style={{ flex:1, overflowY:'auto', overflowX:'hidden',
      padding:`${top}px 20px ${bottom}px`, ...style }}>{children}</div>
  );
}

// ---- header ----
function Header({ kicker, title, right, onBack, sub }) {
  return (
    <div style={{ paddingTop:54, padding:'54px 20px 14px', borderBottom:`1px solid ${C.line}`,
      background:'linear-gradient(180deg,'+C.navy850+','+C.navy900+')' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {onBack && <div className="bf-tap" onClick={onBack} style={{ width:34,height:34,borderRadius:11,
          border:`1px solid ${C.line2}`, display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Icon name="chevL" size={20} color={C.ink}/></div>}
        <div style={{ flex:1, minWidth:0 }}>
          {kicker && <div style={{ fontFamily:'var(--ff-m)', fontSize:10.5, letterSpacing:'.14em',
            textTransform:'uppercase', color:C.turq }}>{kicker}</div>}
          <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:26, letterSpacing:'-.02em',
            color:'#fff', lineHeight:1.05, marginTop:kicker?2:0 }}>{title}</div>
          {sub && <div style={{ fontSize:13, color:C.inkDim, marginTop:3 }}>{sub}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}

// ---- tab bar ----
const TABS = [
  { id:'hoje', label:'Hoje', icon:'home' },
  { id:'alunos', label:'Alunos', icon:'users' },
  { id:'aulas', label:'Aulas', icon:'calendar' },
  { id:'scout', label:'Scout', icon:'scout' },
  { id:'financeiro', label:'$', icon:'dollar' },
];
function TabBar({ active, onTab }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-around', alignItems:'flex-start',
      padding:'10px 8px 26px', borderTop:`1px solid ${C.line}`,
      background:'rgba(8,24,42,.92)', backdropFilter:'blur(14px)' }}>
      {TABS.map(t => {
        const on = active === t.id;
        return (
          <div key={t.id} className="bf-tap" onClick={()=>onTab(t.id)}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, width:58 }}>
            <Icon name={t.icon} size={22} color={on?C.turq:C.n500} sw={on?2:1.7}/>
            <span style={{ fontFamily:'var(--ff-m)', fontSize:9, letterSpacing:'.03em',
              color:on?C.turq:C.n500 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---- atoms ----
function Card({ children, style = {}, onClick, glow }) {
  // extrai borderColor do override e dobra no shorthand `border` (evita mistura shorthand/longhand)
  const { borderColor, ...rest } = style;
  return (
    <div className={onClick?'bf-tap':''} onClick={onClick} style={{
      background: glow ? 'linear-gradient(150deg,rgba(30,114,224,.16),rgba(255,255,255,.02))'
        : 'linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.012))',
      border:`1px solid ${borderColor || C.line}`, borderRadius:16, padding:15, ...rest }}>{children}</div>
  );
}
function Mini({ children, color = C.inkDim, style={} }) {
  return <div style={{ fontFamily:'var(--ff-m)', fontSize:9.5, letterSpacing:'.1em',
    textTransform:'uppercase', color, ...style }}>{children}</div>;
}
function Badge({ children, tone = 'neutral' }) {
  const map = { ok:[C.ok,'rgba(39,192,138,.14)'], warn:[C.warn,'rgba(246,180,60,.14)'],
    err:[C.err,'rgba(242,84,91,.14)'], info:[C.info,'rgba(76,155,255,.14)'],
    neutral:[C.inkDim,'rgba(255,255,255,.07)'], coral:[C.coral,'rgba(255,106,69,.14)'],
    turq:[C.turq,'rgba(22,194,163,.14)'] };
  const [fg,bg] = map[tone]||map.neutral;
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontFamily:'var(--ff-m)',
    fontSize:9.5, fontWeight:500, letterSpacing:'.03em', padding:'4px 8px', borderRadius:7,
    background:bg, color:fg, whiteSpace:'nowrap' }}>{children}</span>;
}
function Btn({ children, kind = 'primary', onClick, style={}, icon }) {
  const map = {
    primary:{ background:C.coral, color:'#fff', boxShadow:'0 7px 18px rgba(255,106,69,.28)' },
    secondary:{ background:C.turq, color:'#04261f' },
    ghost:{ background:'transparent', color:C.ink, border:`1px solid ${C.line2}` },
    dark:{ background:C.navy700, color:C.ink, border:`1px solid ${C.line2}` },
  };
  return <button className="bf-tap" onClick={onClick} style={{ display:'inline-flex', alignItems:'center',
    justifyContent:'center', gap:8, fontFamily:'var(--ff-u)', fontWeight:600, fontSize:15,
    padding:'13px 18px', borderRadius:13, border:'none', cursor:'pointer', ...map[kind], ...style }}>
    {icon && <Icon name={icon} size={18} color={map[kind].color}/>}{children}</button>;
}
function Avatar({ initials, color = C.turq, size = 36 }) {
  return <div style={{ width:size, height:size, borderRadius:'50%', background:color, flexShrink:0,
    display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--ff-d)',
    fontWeight:700, fontSize:size*0.36, color:'#04261f' }}>{initials}</div>;
}

// ---- radar chart (6 axes) ----
function Radar({ data, size = 200, labels }) {
  // data: array de N valores 0..1 (N eixos dinâmicos)
  const n = Math.max(data.length, 3);
  const cx = size/2, cy = size/2, r = size*0.34;
  const ang = i => (Math.PI/2) - (i*2*Math.PI/n); // começa no topo, horário
  const pt = (i, v) => [cx + Math.cos(ang(i))*r*v, cy - Math.sin(ang(i))*r*v];
  const ring = v => data.map((_,i)=>pt(i,v).join(',')).join(' ');
  const poly = data.map((d,i)=>pt(i,d).join(',')).join(' ');
  const fs = n > 8 ? 7.5 : 9; // fonte menor quando há muitos eixos
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:'block', overflow:'visible'}}>
      {[1,0.66,0.33].map((v,k)=><polygon key={k} points={ring(v)} fill="none" stroke={C.line2} strokeWidth="1"/>)}
      {data.map((_,i)=>{const[x,y]=pt(i,1);return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={C.line} strokeWidth="1"/>;})}
      <polygon points={poly} fill="rgba(22,194,163,.22)" stroke={C.turq} strokeWidth="2"/>
      {data.map((d,i)=>{const[x,y]=pt(i,d);return <circle key={i} cx={x} cy={y} r="3" fill={C.coral}/>;})}
      {labels && labels.map((l,i)=>{const[x,y]=pt(i,1.18);const a=ang(i);
        return <text key={i} x={x} y={y} fill={C.inkDim} fontFamily="IBM Plex Mono" fontSize={fs}
          textAnchor={Math.abs(Math.cos(a))<0.3?'middle':(Math.cos(a)>0?'start':'end')} dominantBaseline="middle">{l}</text>;})}
    </svg>
  );
}

// ---- bar chart ----
function Bars({ values, hi, height = 40, gap = 6 }) {
  const max = Math.max(...values);
  return <div style={{ display:'flex', alignItems:'flex-end', gap, height }}>
    {values.map((v,i)=><div key={i} style={{ flex:1, height:`${(v/max)*100}%`, borderRadius:3,
      background: i===hi ? C.coral : C.turq }}/>) }
  </div>;
}

// ---- line / evolution chart ----
function Line({ values, width = 300, height = 90 }) {
  const max = Math.max(...values), min = Math.min(...values);
  const sx = i => (i/(values.length-1))*width;
  const sy = v => height - ((v-min)/(max-min||1))*(height-12) - 6;
  const d = values.map((v,i)=>`${i===0?'M':'L'}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
  const area = `${d} L${width} ${height} L0 ${height} Z`;
  return <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{display:'block'}}>
    <defs><linearGradient id="bfg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="rgba(22,194,163,.32)"/><stop offset="1" stopColor="rgba(22,194,163,0)"/>
    </linearGradient></defs>
    <path d={area} fill="url(#bfg)"/>
    <path d={d} fill="none" stroke={C.turq} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx={sx(values.length-1)} cy={sy(values[values.length-1])} r="4" fill={C.coral}/>
  </svg>;
}

// ---- progress bar ----
function Progress({ value, tone = C.turq }) {
  return <div style={{ height:7, borderRadius:9, background:'rgba(255,255,255,.08)', overflow:'hidden' }}>
    <div style={{ width:`${value}%`, height:'100%', background:tone }}/></div>;
}

// ---- rating dots (technical eval) ----
function Dots({ n, max = 5, color = C.turq }) {
  return <div style={{ display:'flex', gap:5 }}>
    {Array.from({length:max}).map((_,i)=><div key={i} style={{ width:9, height:9, borderRadius:'50%',
      background: i<n ? color : 'rgba(255,255,255,.13)' }}/>)}</div>;
}

Object.assign(window, { C, Icon, Screen, Body, Header, TabBar, TABS, Card, Mini, Badge, Btn,
  Avatar, Radar, Bars, Line, Progress, Dots });


/* ===== app/ScreensA.jsx ===== */
/* BeachFlow — Screens A: Login, Hoje, Alunos, AlunoDetalhe */

window.ALUNOS = ALUNOS; window.DEMO_TURMAS = DEMO_TURMAS; window.RLAB = RLAB;

function BFMark({ w = 52, stroke = C.turq }) {
  return <svg viewBox="0 0 46 40" width={w} fill="none" style={{display:'block'}}>
    <path d="M3 35C14 8 30 8 41 26" stroke={stroke} strokeWidth="3.6" strokeLinecap="round"/>
    <circle cx="41" cy="26" r="5.4" fill={C.coral}/></svg>;
}
window.BFMark = BFMark;

// ---------- LOGIN ----------
function ScreenLogin({ nav }) {
  const [email,setEmail] = React.useState('');
  const [senha,setSenha] = React.useState('');
  const [modo,setModo] = React.useState('entrar'); // 'entrar' | 'criar'
  const [erro,setErro] = React.useState('');
  const [loading,setLoading] = React.useState(false);

  const inputStyle = { width:'100%', background:'transparent', border:'none', outline:'none',
    color:C.ink, fontFamily:'var(--ff-u)', fontSize:14, marginTop:4 };

  const submit = async ()=>{
    setErro('');
    if(!authEnabled){ nav.go('hoje'); return; } // modo demo (sem Supabase configurado)
    if(!email || !senha){ setErro('Preencha e-mail e senha.'); return; }
    setLoading(true);
    try {
      const fn = modo==='criar' ? supabase.auth.signUp : supabase.auth.signInWithPassword;
      const { data, error } = await fn.call(supabase.auth, { email: email.trim(), password: senha });
      if(error) throw error;
      if(data.session){ nav.go('hoje'); }
      else { setErro('Confirme o e-mail para entrar.'); }
    } catch(e){
      setErro(e.message==='Invalid login credentials' ? 'E-mail ou senha incorretos.' : (e.message||'Falha ao entrar.'));
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <div className="bf-scroll" style={{ flex:1, overflowY:'auto', position:'relative',
        display:'flex', flexDirection:'column', justifyContent:'center', padding:'60px 30px 40px' }}>
        <svg viewBox="0 0 360 200" preserveAspectRatio="none" style={{ position:'absolute', inset:0,
          width:'100%', height:'100%', opacity:.55 }}>
          <g stroke="rgba(255,255,255,.06)" fill="none">
            <path d="M0 150q45-32 90 0t90 0 90 0 90 0"/><path d="M0 170q45-32 90 0t90 0 90 0 90 0"/>
            <path d="M0 190q45-32 90 0t90 0 90 0 90 0"/></g></svg>
        <div style={{ position:'relative', textAlign:'center' }}>
          <div style={{ display:'flex', justifyContent:'center' }}><BFMark w={58}/></div>
          <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:30, letterSpacing:'-.03em',
            marginTop:16 }}>Beach<span style={{color:C.turq}}>Flow</span></div>
          <div style={{ fontSize:13.5, color:C.inkDim, marginTop:7, lineHeight:1.4 }}>
            Inteligência pedagógica<br/>para beach tennis</div>
        </div>
        <div style={{ position:'relative', marginTop:34, display:'flex', flexDirection:'column', gap:11 }}>
          <Card style={{ padding:'12px 15px' }}><Mini>E-mail</Mini>
            <input type="email" autoCapitalize="none" autoCorrect="off" value={email}
              onChange={e=>setEmail(e.target.value)} placeholder="professor@quadra.com"
              onKeyDown={e=>e.key==='Enter'&&submit()} style={inputStyle}/></Card>
          <Card style={{ padding:'12px 15px' }}><Mini>Senha</Mini>
            <input type="password" value={senha} onChange={e=>setSenha(e.target.value)}
              placeholder="••••••••" onKeyDown={e=>e.key==='Enter'&&submit()} style={inputStyle}/></Card>
          {erro && <div style={{ fontSize:12, color:C.err, textAlign:'center' }}>{erro}</div>}
          <Btn kind="primary" style={{ width:'100%', marginTop:6 }} onClick={submit}>
            {loading ? '…' : (modo==='criar' ? 'Criar conta' : 'Entrar')}</Btn>
          <div className="bf-tap" onClick={()=>{ setModo(m=>m==='criar'?'entrar':'criar'); setErro(''); }}
            style={{ textAlign:'center', fontSize:12.5, color:C.turq, marginTop:4 }}>
            {modo==='criar' ? 'Já tenho conta — entrar' : 'Criar conta nova'}</div>
          <div style={{ textAlign:'center', fontFamily:'var(--ff-m)', fontSize:11, color:C.n500, marginTop:4 }}>
            {authEnabled ? 'Acesso antecipado · lista beta' : 'Modo demo (sem login)'}</div>
        </div>
      </div>
    </Screen>
  );
}

// ---------- HOJE (dashboard) ----------
const WEEKDAY_KEYS = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
const cleanDayText = (s = '') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function turmasHojeEAmanha(turmas = [], date = new Date()) {
  const hoje = date.getDay();
  const dias = [
    { key: WEEKDAY_KEYS[hoje], label: 'Hoje', order: 0 },
    { key: WEEKDAY_KEYS[(hoje + 1) % 7], label: 'Amanhã', order: 1 },
  ];
  return turmas
    .flatMap((t) => {
      const nome = cleanDayText(t.nome);
      const dia = dias.find((d) => nome.includes(d.key));
      return dia ? [{ ...t, diaLabel: dia.label, diaOrder: dia.order }] : [];
    })
    .sort((a, b) => a.diaOrder - b.diaOrder || (a.hora || '').localeCompare(b.hora || ''));
}

function ScreenHoje({ nav }) {
  const [nome,setNome] = React.useState('');
  const [r,setR] = React.useState(null);
  const [turmasAgenda,setTurmasAgenda] = React.useState(null);
  const [confirmAgenda,setConfirmAgenda] = React.useState({ loadingId:null, turma:null, alunos:null, error:'' });
  React.useEffect(()=>{
    let alive=true;
    if(authEnabled){
      supabase.auth.getUser().then(({data})=>{ if(alive&&data?.user?.email){ const p=data.user.email.split('@')[0].split(/[._]/)[0]; setNome(p.charAt(0).toUpperCase()+p.slice(1)); } });
      Promise.all([getResumo(), listTurmas()]).then(([x,t])=>{ if(alive){ setR(x); setTurmasAgenda(turmasHojeEAmanha(t)); } });
    } else { setR({ nAlunos:ALUNOS.length, nTurmas:DEMO_TURMAS.length, nPartidas:0, foco:ALUNOS[0] }); setTurmasAgenda(turmasHojeEAmanha(DEMO_TURMAS)); }
    return ()=>{ alive=false; };
  },[]);
  React.useEffect(()=>{
    if(!confirmAgenda.sessionId || !confirmAgenda.alunos?.length) return undefined;
    let alive = true;
    const refresh = async ()=>{
      try {
        const alunos = await atualizarStatusConfirmacoes(confirmAgenda.sessionId, confirmAgenda.alunos);
        if(alive) setConfirmAgenda(s=>({ ...s, alunos, error:'' }));
      } catch(err) {
        if(alive) setConfirmAgenda(s=>({ ...s, error:err.message || 'Não foi possível atualizar confirmações.' }));
      }
    };
    const id = setInterval(refresh, 10000);
    return ()=>{ alive=false; clearInterval(id); };
  },[confirmAgenda.sessionId, confirmAgenda.alunos?.length]);
  const prepararAgenda = async (e,turma)=>{
    e.stopPropagation();
    setConfirmAgenda({ loadingId:turma.id, turma, alunos:null, error:'' });
    try {
      const r = await prepararConfirmacoesTurma({ turma });
      setConfirmAgenda({ loadingId:null, turma, sessionId:r.sessionId, alunos:r.alunos, error:'' });
    } catch(err) {
      setConfirmAgenda({ loadingId:null, turma, sessionId:null, alunos:null, error:err.message || 'Não foi possível preparar as mensagens.' });
    }
  };
  const msgConfirmacao = (turma,item)=>{
    const link = confirmationUrl(item.token);
    return `Oi, ${item.aluno.name}! Confirma sua presença na aula ${turma.nome}${turma.hora?` (${turma.hora})`:''}? ${link}`;
  };
  const Stat = ({ n, l, onClick }) => (
    <Card onClick={onClick} style={{ flex:1, padding:'13px 12px', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:24, color:'#fff' }}>{n}</div>
      <Mini style={{ marginTop:3 }}>{l}</Mini></Card>
  );
  const foco = r && r.foco;
  return (
    <Screen>
      <Body top={50} bottom={92}>
        <Mini>{r ? `${r.nTurmas} turmas · ${r.nAlunos} alunos` : 'Carregando…'}</Mini>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:2 }}>
          <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:26, letterSpacing:'-.02em', color:'#fff' }}>Olá{nome?`, ${nome}`:''}.</div>
          <div className="bf-tap" onClick={()=>nav.logout&&nav.logout()} style={{ fontFamily:'var(--ff-m)', fontSize:10.5,
            color:C.inkDim, border:`1px solid ${C.line2}`, borderRadius:9, padding:'7px 10px' }}>Sair</div>
        </div>

        {/* números reais */}
        <div style={{ display:'flex', gap:10, marginTop:14 }}>
          <Stat n={r?r.nAlunos:'—'} l="Alunos" onClick={()=>nav.tab('alunos')}/>
          <Stat n={r?r.nTurmas:'—'} l="Turmas" onClick={()=>nav.tab('aulas')}/>
          <Stat n={r?r.nPartidas:'—'} l="Scouts" onClick={()=>nav.tab('scout')}/>
        </div>

        {/* cartão de foco real (aluno com maior gap) */}
        {foco && <div className="bf-tap" onClick={()=>nav.go('diagnostico',{aluno:foco})} style={{ marginTop:14, borderRadius:18, padding:16,
          background:'linear-gradient(150deg,rgba(255,106,69,.22),rgba(255,106,69,.05))',
          border:'1px solid rgba(255,106,69,.32)' }}>
          <Mini color={C.coral}>● Cartão de foco</Mini>
          <div style={{ fontFamily:'var(--ff-d)', fontWeight:700, fontSize:17, color:'#fff', marginTop:8, lineHeight:1.18 }}>
            {foco.nome} precisa reforçar {foco.foco}.</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:11 }}>
            <span style={{ fontSize:11.5, color:C.inkDim }}>{foco.turma}</span>
            <span style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'var(--ff-m)', fontSize:11, color:C.coral }}>
              ver diagnóstico <Icon name="chevR" size={13} color={C.coral}/></span>
          </div>
        </div>}

        {/* atalhos */}
        <div style={{ display:'flex', gap:10, marginTop:14 }}>
          <Card onClick={()=>nav.go('scout')} style={{ flex:1, display:'flex', flexDirection:'column', gap:8, padding:13 }}>
            <Icon name="scout" size={22} color={C.turq}/><span style={{ fontSize:13, fontWeight:600 }}>Scout</span>
            <Mini>partidas e análise</Mini></Card>
          <Card onClick={()=>nav.go('historico')} style={{ flex:1, display:'flex', flexDirection:'column', gap:8, padding:13 }}>
            <Icon name="clip" size={22} color={C.turq}/><span style={{ fontSize:13, fontWeight:600 }}>Planos salvos</span>
            <Mini>treinos gerados</Mini></Card>
        </div>

        <div style={{ marginTop:16, display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
          <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:18, color:'#fff' }}>Turmas próximas</div>
          {turmasAgenda && <span style={{ fontFamily:'var(--ff-m)', fontSize:10.5, color:C.inkDim }}>hoje + amanhã</span>}
        </div>
        {turmasAgenda===null && <Card style={{ marginTop:8, textAlign:'center', padding:'18px 14px' }}>
          <div style={{ fontSize:12.5, color:C.inkDim }}>Carregando agenda…</div>
        </Card>}
        {turmasAgenda && turmasAgenda.length===0 && <Card style={{ marginTop:8, textAlign:'center', padding:'18px 14px' }}>
          <div style={{ fontSize:12.5, color:C.inkDim }}>Nenhuma turma hoje ou amanhã.</div>
        </Card>}
        {turmasAgenda && turmasAgenda.map(t=>
          <Card key={t.id} onClick={()=>nav.go('turma',{ turma:t })} style={{ marginTop:8, padding:'12px 13px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:44, fontFamily:'var(--ff-m)', fontSize:12, color:C.turq }}>{t.hora || '--:--'}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.nome}</div>
                <div style={{ fontSize:11.5, color:C.inkDim, marginTop:2 }}>{t.foco ? `Foco: ${t.foco}` : `${t.alunos || 0}${t.capacidade?`/${t.capacidade}`:''} alunos`}</div>
              </div>
              <Badge tone={t.diaOrder===0?'turq':'info'}>{t.diaLabel}</Badge>
            </div>
            {t.diaOrder===0 && <div style={{ display:'flex', gap:8, marginTop:10, paddingLeft:54 }}>
              <button className="bf-tap" onClick={(e)=>prepararAgenda(e,t)}
                style={{ flex:1, border:0, borderRadius:9, padding:'8px 10px',
                  background:'rgba(22,194,163,.14)', color:C.turq, fontSize:12.5, fontWeight:700 }}>
                {confirmAgenda.loadingId===t.id?'Preparando…':'Enviar WhatsApp'}
              </button>
              <button className="bf-tap" onClick={(e)=>{ e.stopPropagation(); nav.go('turma',{ turma:t }); }}
                style={{ border:`1px solid ${C.line2}`, borderRadius:9, padding:'8px 10px',
                  background:'transparent', color:C.inkDim, fontSize:12.5, fontWeight:700 }}>
                Abrir
              </button>
            </div>}
          </Card>)}
        {confirmAgenda.error && <Card style={{ marginTop:12, borderColor:'rgba(242,84,91,.35)' }}>
          <div style={{ fontSize:12.5, color:C.err }}>{confirmAgenda.error}</div>
        </Card>}
        {confirmAgenda.alunos && <Card style={{ marginTop:12 }}>
          <Mini>WhatsApp de confirmação · {confirmAgenda.turma?.nome}</Mini>
          {confirmAgenda.alunos.length===0 && <div style={{ fontSize:12.5, color:C.inkDim, marginTop:10 }}>Nenhum aluno matriculado nesta turma.</div>}
          <div style={{ marginTop:10 }}>
            {confirmAgenda.alunos.map((item)=>
              <div key={item.aluno.id} style={{ padding:'9px 0', borderBottom:`1px solid ${C.line}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.aluno.name}</div>
                    <div style={{ fontSize:11.5, color:item.aluno.phone?C.inkDim:C.warn, marginTop:2 }}>
                      {item.aluno.phone || 'Sem telefone no cadastro'}
                    </div>
                  </div>
                  <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
                </div>
                {item.error && <div style={{ fontSize:11.5, color:C.err, marginTop:6 }}>{item.error}</div>}
                {item.token && <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  {item.aluno.phone && <a href={whatsappUrl(item.aluno.phone, msgConfirmacao(confirmAgenda.turma,item))} target="_blank" rel="noreferrer"
                    style={{ flex:1, textAlign:'center', textDecoration:'none', borderRadius:9, padding:'8px 10px',
                      background:'rgba(22,194,163,.14)', color:C.turq, fontSize:12.5, fontWeight:700 }}>WhatsApp</a>}
                  <button className="bf-tap" onClick={()=>navigator.clipboard?.writeText(msgConfirmacao(confirmAgenda.turma,item))}
                    style={{ flex:1, borderRadius:9, padding:'8px 10px', border:`1px solid ${C.line2}`,
                      background:'transparent', color:C.inkDim, fontSize:12.5, fontWeight:700 }}>Copiar</button>
                </div>}
              </div>)}
          </div>
        </Card>}
      </Body>
      <TabBar active="hoje" onTab={nav.tab}/>
    </Screen>
  );
}
function AulaRow({ hora, titulo, sub, tone, tag, onClick }) {
  return <Card onClick={onClick} style={{ marginTop:8, display:'flex', alignItems:'center', gap:11, padding:'11px 13px' }}>
    <div style={{ fontFamily:'var(--ff-m)', fontSize:12, color:C.turq, width:30 }}>{hora}</div>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontSize:13.5, color:C.ink }}>{titulo}</div>
      <div style={{ fontSize:11, color:C.inkDim }}>{sub}</div></div>
    <Badge tone={tone}>● {tag}</Badge>
  </Card>;
}

const NIVEL_OPTIONS = ['Iniciante', 'Intermediário', 'Avançado'];
const cadastroInputStyle = {
  width:'100%', marginTop:4, background:'rgba(255,255,255,.05)', color:C.ink,
  border:`1px solid ${C.line2}`, borderRadius:10, padding:'10px 11px',
  fontFamily:'var(--ff-u)', fontSize:13.5, outline:'none',
};
function CadastroField({ label, children }) {
  return <div style={{ marginTop:12 }}>
    <span style={{ fontFamily:'var(--ff-m)', fontSize:9, letterSpacing:'.08em', textTransform:'uppercase', color:C.n500 }}>{label}</span>
    {children}
  </div>;
}
function ScreenAlunoForm({ nav, params }) {
  const aluno = params.aluno || null;
  const [nome,setNome] = React.useState(aluno?.nome || '');
  const [nivel,setNivel] = React.useState(aluno?.nivel || 'Intermediário');
  const [phone,setPhone] = React.useState(aluno?.phone || '');
  const [erro,setErro] = React.useState('');
  const [saving,setSaving] = React.useState(false);
  const salvar = async ()=>{
    setErro('');
    if(!nome.trim()){ setErro('Informe o nome do aluno.'); return; }
    if(!authEnabled){ setErro('Cadastro real exige Supabase conectado.'); return; }
    setSaving(true);
    const r = await salvarAlunoCadastro({ id:aluno?.id, nome, nivel, phone });
    setSaving(false);
    if(!r.ok){ setErro(r.error || 'Não foi possível salvar.'); return; }
    nav.tab('alunos');
  };
  return <Screen>
    <Header onBack={nav.back} kicker="Cadastro" title={aluno?'Editar aluno':'Novo aluno'}/>
    <Body top={16} bottom={96}>
      <Card>
        <CadastroField label="Nome">
          <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Nome do aluno" style={cadastroInputStyle}/>
        </CadastroField>
        <CadastroField label="Nível">
          <select value={nivel} onChange={e=>setNivel(e.target.value)} style={cadastroInputStyle}>
            {NIVEL_OPTIONS.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </CadastroField>
        <CadastroField label="WhatsApp">
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Ex.: 44999998888" style={cadastroInputStyle}/>
        </CadastroField>
        {erro && <div style={{ marginTop:12, color:C.err, fontSize:12 }}>{erro}</div>}
      </Card>
    </Body>
    <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'12px 20px 30px',
      background:'linear-gradient(transparent,'+C.navy900+' 30%)' }}>
      <Btn kind="primary" style={{ width:'100%' }} icon="check" onClick={salvar}>{saving?'Salvando…':'Salvar aluno'}</Btn>
    </div>
  </Screen>;
}

// ---------- ALUNOS ----------
function ScreenAlunos({ nav }) {
  const [q,setQ] = React.useState('');
  const [filtro,setFiltro] = React.useState('Todos');
  const [showMissingAuto,setShowMissingAuto] = React.useState(false);
  const [autoMsg,setAutoMsg] = React.useState('');
  const [alunos,setAlunos] = React.useState(null);
  React.useEffect(()=>{
    let alive=true;
    if(authEnabled){ listAlunos().then(r=>{ if(alive) setAlunos(r); }); }
    else { setAlunos(ALUNOS); } // modo demo (sem login)
    return ()=>{ alive=false; };
  },[]);

  const FILTROS = ['Todos','Iniciante','Intermediário','Avançado'];
  const base = alunos||[];
  const semAuto = base.filter(a=>!a.notasAuto || !Object.keys(a.notasAuto).length);
  const list = base.filter(a=>{
    const okBusca = a.nome.toLowerCase().includes(q.toLowerCase()) || (a.turma||'').toLowerCase().includes(q.toLowerCase());
    const okFiltro = filtro==='Todos' || a.nivel===filtro;
    return okBusca && okFiltro;
  });
  const enviarAuto = async (aluno)=>{
    setAutoMsg('');
    try {
      const r = await prepararAutoavaliacaoAluno(aluno);
      if(aluno.phone) window.open(whatsappUrl(aluno.phone, r.message), '_blank', 'noopener,noreferrer');
      else {
        await navigator.clipboard?.writeText(r.message);
        setAutoMsg(`Mensagem de ${aluno.nome} copiada. Sem WhatsApp no cadastro.`);
      }
    } catch(e) {
      setAutoMsg(e.message || 'Não foi possível preparar o link.');
    }
  };

  return (
    <Screen>
      <Body top={50} bottom={12}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:26, letterSpacing:'-.02em', color:'#fff' }}>Alunos</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {alunos && <span style={{ fontFamily:'var(--ff-m)', fontSize:11, color:C.inkDim }}>{base.length} no total</span>}
            <div className="bf-tap" onClick={()=>nav.go('alunoForm')} style={{ width:34,height:34,borderRadius:11, border:`1px solid ${C.line2}`,
              display:'flex',alignItems:'center',justifyContent:'center' }}><Icon name="plus" size={18} color={C.turq}/></div>
          </div>
        </div>
        <Card style={{ marginTop:12, display:'flex', alignItems:'center', gap:9, padding:'10px 13px' }}>
          <Icon name="search" size={18} color={C.n500}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar aluno ou turma…"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:C.ink,
              fontFamily:'var(--ff-u)', fontSize:14 }}/>
        </Card>
        <div style={{ display:'flex', gap:7, marginTop:11, overflowX:'auto' }} className="bf-scroll">
          {FILTROS.map(f=>{
            const on=filtro===f;
            return <span key={f} className="bf-tap" onClick={()=>setFiltro(f)}
              style={{ fontFamily:'var(--ff-m)', fontSize:11, padding:'6px 12px', borderRadius:8,
              whiteSpace:'nowrap', border:`1px solid ${on?C.turq:C.line2}`, color:on?C.turq:C.inkDim,
              background:on?'rgba(22,194,163,.1)':'transparent' }}>{f}</span>; })}
        </div>
        {alunos && <Card style={{ marginTop:10, padding:'12px 13px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1 }}>
              <Mini>Autoavaliação</Mini>
              <div style={{ fontSize:12.5, color:C.inkDim, marginTop:3 }}>{semAuto.length} aluno(s) sem resposta</div>
            </div>
            <button className="bf-tap" onClick={()=>setShowMissingAuto(v=>!v)}
              style={{ border:`1px solid ${C.line2}`, borderRadius:9, padding:'8px 10px',
                background:showMissingAuto?'rgba(22,194,163,.12)':'transparent', color:showMissingAuto?C.turq:C.inkDim,
                fontSize:12.5, fontWeight:700 }}>
              {showMissingAuto?'Ocultar':'Reenviar'}
            </button>
          </div>
          {autoMsg && <div style={{ fontSize:11.5, color:autoMsg.includes('Não foi')?C.err:C.turq, marginTop:9, lineHeight:1.35 }}>{autoMsg}</div>}
          {showMissingAuto && <div style={{ marginTop:10, borderTop:`1px solid ${C.line}`, paddingTop:8 }}>
            {semAuto.length===0 && <div style={{ fontSize:12.5, color:C.inkDim }}>Todos os alunos já têm autoavaliação.</div>}
            {semAuto.map(a=>
              <div key={a.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:`1px solid ${C.line}` }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.nome}</div>
                  <div style={{ fontSize:11.5, color:a.phone?C.inkDim:C.warn }}>{a.phone || 'Sem WhatsApp'}</div>
                </div>
                <button className="bf-tap" onClick={()=>enviarAuto(a)}
                  style={{ border:0, borderRadius:9, padding:'8px 10px',
                    background:'rgba(22,194,163,.14)', color:C.turq, fontSize:12.5, fontWeight:700 }}>
                  Reenviar
                </button>
              </div>)}
          </div>}
        </Card>}
        <div style={{ marginTop:6 }}>
          {alunos===null &&
            <div style={{ textAlign:'center', color:C.inkDim, fontSize:13, marginTop:30 }}>Carregando alunos…</div>}
          {alunos && list.length===0 &&
            <div style={{ textAlign:'center', color:C.inkDim, fontSize:13, marginTop:30 }}>
              {base.length===0 ? 'Nenhum aluno nesta conta.' : 'Nenhum aluno encontrado.'}</div>}
          {list.map(a=>
            <div key={a.id} className="bf-tap" onClick={()=>nav.go('aluno',{aluno:a})}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 2px', borderBottom:`1px solid ${C.line}` }}>
              <Avatar initials={a.ini} color={a.cor}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.nome}</div>
                <div style={{ fontSize:11.5, color:C.inkDim }}>{(a.turma||'').split(' · ')[0]} · {a.foco}</div></div>
              <Badge tone={a.tone}>{a.delta}</Badge>
              <Icon name="chevR" size={16} color={C.n500}/>
            </div>)}
        </div>
      </Body>
      <TabBar active="alunos" onTab={nav.tab}/>
    </Screen>
  );
}

// ---------- ALUNO (detalhe) ----------
function firstName(name = '') {
  return String(name || 'aluno').trim().split(/\s+/)[0] || 'aluno';
}
function topNota(notas = {}, asc = true) {
  const rows = Object.entries(notas || {}).filter(([,v])=>Number.isFinite(Number(v)));
  if(!rows.length) return null;
  return rows.sort((a,b)=>asc ? Number(a[1])-Number(b[1]) : Number(b[1])-Number(a[1]))[0];
}
function topScoutEntries(obj = {}, limit = 6) {
  return Object.entries(obj || {}).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0, limit);
}
function significantScoutEntries(obj = {}, min = 2, limit = 6) {
  return topScoutEntries(obj, limit).filter(([,n])=>Number(n) >= min);
}
function scoutCount(entries = [], fund) {
  return Number(entries.find(([f])=>f === fund)?.[1] || 0);
}
function interpretacaoAutoScout({ notasAuto = {}, autoFraco, erroPrincipal, erros = [], positivos = [] }) {
  const fraco = autoFraco?.[0];
  const principal = erroPrincipal?.fundamento;
  const frases = [];

  if (principal && fraco && principal === fraco) {
    frases.push(`Isso confirma a sua percepção: ${fraco} apareceu como ponto de atenção na autoavaliação e também no scout.`);
  } else if (principal && fraco) {
    frases.push(`Aqui apareceu uma diferença importante: na autoavaliação, o ponto que pediu mais atenção foi ${fraco}; no jogo, o scout mostrou ${principal} como ajuste principal.`);
  } else if (principal) {
    frases.push(`O scout trouxe um ponto claro para ajustar no jogo: ${principal}.`);
  }

  const bomApesarAutoBaixa = positivos.find(([f,n])=>{
    const auto = Number(notasAuto[f]);
    if (!Number.isFinite(auto) || auto > 3) return false;
    const errosNoFund = scoutCount(erros, f);
    return Number(n) > errosNoFund;
  });
  if (bomApesarAutoBaixa) {
    frases.push(`Também tem uma boa notícia: mesmo você se avaliando mais baixo em ${bomApesarAutoBaixa[0]}, o scout registrou boas ações nesse fundamento.`);
  }

  return frases.slice(0, 2).join(' ');
}
function feedbackAlunoTexto(a) {
  const autoFraco = topNota(a.notasAuto, true);
  const autoForte = topNota(a.notasAuto, false);
  const scout = a.scoutResumo;
  const erro = Number(scout?.erroPrincipal?.total || 0) >= 2 ? scout?.erroPrincipal : null;
  const zona = scout?.zonaErroPrincipal || scout?.zonaCritica;
  const nome = firstName(a.nome);
  const pontoAtencao = erro
    ? `${erro.total} situação(ões) ligadas a ${erro.fundamento}${zona ? `, principalmente na zona ${zona.zona}` : ''}.`
    : scout?.leitura || 'algumas situações que vamos acompanhar melhor em jogo.';
  const foco = erro?.fundamento || autoFraco?.[0] || a.foco || 'controle da bola';
  const errosOrdenados = topScoutEntries(scout?.errosPorFundamento, 6);
  const errosSignificativos = significantScoutEntries(scout?.errosPorFundamento, 2, 6);
  const positivosOrdenados = significantScoutEntries(scout?.positivosPorFundamento || scout?.winnersPorFundamento, 2, 6);
  const extrasFund = errosSignificativos
    .filter(([f])=>f !== erro?.fundamento)
    .slice(0,2);
  const positivosFund = positivosOrdenados.slice(0,2);
  const extraTatico = (scout?.problemasTaticos || []).find(p=>p?.texto);
  const textoTatico = extraTatico?.texto ? String(extraTatico.texto).replace(/\s+/g,' ').slice(0,160) : '';
  const extraTexto = positivosFund.length || extrasFund.length || extraTatico
    ? ` ${[
        positivosFund.length ? `Também apareceram boas ações em ${positivosFund.map(([f,n])=>`${f} (${n})`).join(' e ')}.` : '',
        extrasFund.length ? `Nos erros registrados, além do ponto principal, também apareceram ${extrasFund.map(([f,n])=>`${f} (${n})`).join(' e ')}.` : '',
        textoTatico ? `Também apareceu este padrão no jogo: ${textoTatico}.` : '',
      ].filter(Boolean).join(' ')}`
    : '';
  const mesmaNota = autoForte && autoFraco && (autoForte[0] === autoFraco[0] || Number(autoForte[1]) === Number(autoFraco[1]));
  const autoTexto = mesmaNota
    ? `Na sua autoavaliação, suas respostas ficaram bem próximas. Isso mostra que você se percebe de forma parecida nos fundamentos, então vamos cruzar isso com o que apareceu no jogo.`
    : `Na sua autoavaliação, seu ponto mais seguro apareceu em ${autoForte ? autoForte[0] : 'alguns fundamentos'} e o ponto que pediu mais atenção apareceu em ${autoFraco ? autoFraco[0] : foco}.`;
  const leituraCruzada = interpretacaoAutoScout({
    notasAuto: a.notasAuto,
    autoFraco,
    erroPrincipal: erro,
    erros: errosSignificativos,
    positivos: positivosOrdenados,
  });
  return `Oi, ${nome}! Aqui vai um feedback simples do seu treino.\n\nNo scout, vimos ${pontoAtencao}${extraTexto}\n\n${autoTexto}${leituraCruzada ? `\n\n${leituraCruzada}` : ''}\n\nNão é que você \"não sabe\" fazer. Significa que, em situação de jogo, esse ponto ainda pede mais calma, escolha melhor da bola e repetição.\n\nVamos trabalhar ${foco} de um jeito simples e prático, para você ganhar mais segurança nesse ponto.\n\nA ideia é evoluir um ajuste por vez, sem complicar.`;
}

function ScreenAluno({ nav, params }) {
  const a = params.aluno || ALUNOS[0];
  const [tab,setTab] = React.useState('tecnico');
  const canFeedback = !!(a.scoutResumo && a.notasAuto && Object.keys(a.notasAuto).length);
  const enviarFeedback = ()=>{
    const text = feedbackAlunoTexto(a);
    if(a.phone) window.open(whatsappUrl(a.phone, text), '_blank', 'noopener,noreferrer');
    else navigator.clipboard?.writeText(text);
  };
  const copiarFeedback = ()=>navigator.clipboard?.writeText(feedbackAlunoTexto(a));
  return (
    <Screen>
      <Header onBack={nav.back} kicker={a.turma} title={a.nome}
        right={<div className="bf-tap" onClick={()=>nav.go('avaliacao',{aluno:a})} style={{ width:34,height:34,borderRadius:11,
          border:`1px solid ${C.line2}`, display:'flex',alignItems:'center',justifyContent:'center' }}>
          <Icon name="edit" size={18} color={C.turq}/></div>}/>
      <Body top={16} bottom={26}>
        <div style={{ display:'flex', gap:10 }}>
          <Card style={{ flex:1, padding:13 }}><Mini>Foco atual</Mini>
            <div style={{ fontFamily:'var(--ff-d)', fontWeight:700, fontSize:16, color:C.coral, marginTop:5 }}>{a.foco}</div></Card>
          <Card style={{ flex:1, padding:13 }}><Mini>Evolução</Mini>
            <div style={{ fontFamily:'var(--ff-d)', fontWeight:700, fontSize:16, marginTop:5,
              color:a.tone==='warn'?C.warn:C.turq }}>{a.delta}</div></Card>
        </div>

        {/* segmented */}
        <div style={{ display:'flex', gap:4, marginTop:14, background:'rgba(255,255,255,.04)', borderRadius:11, padding:4 }}>
          {[['tecnico','Técnico'],['auto','Autoaval.'],['evo','Evolução']].map(([k,l])=>
            <div key={k} className="bf-tap" onClick={()=>setTab(k)} style={{ flex:1, textAlign:'center', padding:'8px 0',
              borderRadius:8, fontSize:12.5, fontWeight:600, color:tab===k?'#04261f':C.inkDim,
              background:tab===k?C.turq:'transparent' }}>{l}</div>)}
        </div>

        {tab==='tecnico' && ((a.radarFonte && a.radarFonte!=='sem dados') || !a.radarFonte
          ? <Card style={{ marginTop:12, alignItems:'center', display:'flex', flexDirection:'column' }}>
              <Mini style={{ alignSelf:'flex-start' }}>Radar técnico · {a.radarFonte || 'avaliação do professor'} · {a.radar.length} critérios</Mini>
              <Radar data={a.radar} labels={a.radarLabels || RLAB} size={224}/>
              <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:2 }}>
                <span style={{ width:9,height:9,borderRadius:'50%',background:C.coral }}/>
                <span style={{ fontSize:11.5, color:C.inkDim }}>Ponto fraco: <b style={{color:C.coral}}>{a.foco}</b></span>
              </div></Card>
          : <Card style={{ marginTop:12, textAlign:'center', padding:'26px 16px' }}>
              <div style={{ fontSize:13, color:C.ink }}>Sem avaliação ainda</div>
              <div style={{ fontSize:11.5, color:C.inkDim, marginTop:5 }}>Avalie este aluno (ícone ✎ acima) ou peça uma autoavaliação para gerar o radar.</div>
            </Card>)}
        {tab==='tecnico' && a.scoutResumo && <Card style={{ marginTop:12 }}>
          <Mini>Scout individual · {a.scoutResumo.fonte}</Mini>
          <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
            <Badge tone="turq">{a.scoutResumo.totalEventos} ações</Badge>
            <Badge tone="coral">{a.scoutResumo.erros} erros</Badge>
            <Badge tone="info">{a.scoutResumo.winners} winners</Badge>
            {!!a.scoutResumo.partidas && <Badge tone="neutral">{a.scoutResumo.partidas} partida(s)</Badge>}
          </div>
          <div style={{ fontSize:12.5, color:C.ink, lineHeight:1.45, marginTop:11 }}>{a.scoutResumo.leitura}</div>
          {!!a.scoutResumo.problemasTaticos?.length && <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
            {a.scoutResumo.problemasTaticos.slice(0,3).map((p)=>
              <div key={p.texto} style={{ display:'flex', justifyContent:'space-between', gap:12, fontSize:12, color:C.inkDim }}>
                <span>{p.texto}</span><span style={{ fontFamily:'var(--ff-m)', color:C.info }}>{p.total}</span>
              </div>)}
          </div>}
          {canFeedback && <div style={{ display:'flex', gap:8, marginTop:12, paddingTop:12, borderTop:`1px solid ${C.line}` }}>
            <button className="bf-tap" onClick={enviarFeedback}
              style={{ flex:1, border:0, borderRadius:9, padding:'9px 10px',
                background:'rgba(22,194,163,.14)', color:C.turq, fontSize:12.5, fontWeight:700 }}>
              Enviar feedback
            </button>
            <button className="bf-tap" onClick={copiarFeedback}
              style={{ border:`1px solid ${C.line2}`, borderRadius:9, padding:'9px 10px',
                background:'transparent', color:C.inkDim, fontSize:12.5, fontWeight:700 }}>
              Copiar
            </button>
          </div>}
          {!canFeedback && <div style={{ fontSize:11.5, color:C.inkDim, lineHeight:1.35, marginTop:10, paddingTop:10, borderTop:`1px solid ${C.line}` }}>
            O feedback para WhatsApp aparece quando este aluno tiver Scout e autoavaliação.
          </div>}
        </Card>}

        {tab==='auto' && (()=>{
          // autoavaliação real completa (todos os fundamentos respondidos), ordenada do mais fraco
          const autoEntries = a.notasAuto ? Object.entries(a.notasAuto).sort((x,y)=>x[1]-y[1])
            : (a.auto||[]).map((v,i)=>[['Confiança no saque','Leitura de jogo','Constância','Recepção'][i], v*5]);
          if(!autoEntries.length) return <Card style={{ marginTop:12, textAlign:'center', padding:'26px 16px' }}>
            <div style={{ fontSize:13, color:C.ink }}>Sem autoavaliação ainda</div>
            <div style={{ fontSize:11.5, color:C.inkDim, marginTop:5 }}>Quando o aluno responder a autoavaliação, ela aparece aqui.</div></Card>;
          // gap real: maior divergência onde há professor + autoavaliação
          let gap=null;
          if(a.notasProf){ let maxd=0;
            for(const [f,va] of autoEntries){ const vp=a.notasProf[f]; if(vp!=null){ const d=va-vp; if(Math.abs(d)>Math.abs(maxd)){ maxd=d; gap={f,va,vp,d}; } } }
            if(gap && Math.abs(gap.d)<1.2) gap=null;
          }
          return <Card style={{ marginTop:12 }}>
            <Mini>Autoavaliação do aluno · {autoEntries.length} fundamentos (escala 0–5)</Mini>
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:11 }}>
              {autoEntries.map(([f,v])=>
                <div key={f}><div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:6 }}>
                  <span style={{color:C.ink}}>{f}</span><span style={{color:C.inkDim,fontFamily:'var(--ff-m)',fontSize:11}}>{(+v).toFixed(1)}/5</span></div>
                  <Progress value={(+v)/5*100} tone={v<2.5?C.coral:C.turq}/></div>)}
            </div>
            {gap && <div style={{ marginTop:13, padding:11, borderRadius:11, background:'rgba(76,155,255,.08)',
              border:'1px solid rgba(76,155,255,.2)', fontSize:12, color:C.inkDim }}>
              <b style={{color:C.info}}>Gap percebido em {gap.f}:</b> o aluno se deu {gap.va.toFixed(1)}, mas você avaliou {gap.vp.toFixed(1)}. {gap.d>0?'Pode estar superestimando — use na conversa.':'Pode estar inseguro além do real.'}</div>}
            <div className="bf-tap" onClick={()=>nav.go('autoavaliacao',{aluno:a})} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:11, paddingTop:11, borderTop:`1px solid ${C.line}` }}>
              <span style={{ fontSize:12.5, color:C.turq }}>Abrir autoavaliação completa</span>
              <Icon name="chevR" size={15} color={C.turq}/></div>
          </Card>;
        })()}

        {tab==='evo' && (a.evo ? <Card style={{ marginTop:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <Mini>Evolução percebida · 7 semanas</Mini>
            <span style={{ fontFamily:'var(--ff-d)', fontWeight:700, color:C.turq, fontSize:15 }}>{a.delta}</span></div>
          <div style={{ marginTop:12 }}><Line values={a.evo}/></div>
          <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--ff-m)', fontSize:9.5, color:C.n500, marginTop:6 }}>
            <span>S1</span><span>S4</span><span>S7</span></div>
          <div className="bf-tap" onClick={()=>nav.go('evolucao',{aluno:a})} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:11, paddingTop:11, borderTop:`1px solid ${C.line}` }}>
            <span style={{ fontSize:12.5, color:C.turq }}>Ver evolução detalhada</span>
            <Icon name="chevR" size={15} color={C.turq}/></div>
        </Card> : <Card style={{ marginTop:12, textAlign:'center', padding:'24px 16px' }}>
          <div style={{ fontSize:13, color:C.ink }}>Sem histórico de evolução ainda</div>
          <div style={{ fontSize:11.5, color:C.inkDim, marginTop:5 }}>A curva aparece conforme novas avaliações forem registradas.</div>
        </Card>)}

        <Btn kind="secondary" style={{ width:'100%', marginTop:14 }} icon="clip" onClick={()=>nav.go('plano',{aluno:a})}>Gerar plano para {a.nome.split(' ')[0]}</Btn>
        <Btn kind="ghost" style={{ width:'100%', marginTop:10 }} icon="edit" onClick={()=>nav.go('alunoForm',{aluno:a})}>Editar cadastro</Btn>
      </Body>
    </Screen>
  );
}

Object.assign(window, { ScreenLogin, ScreenHoje, ScreenAlunos, ScreenAluno });


/* ===== app/ScreensB.jsx ===== */
/* BeachFlow — Screens B: Aulas, Plano de aula, Scout, Diagnóstico */

// ---------- AULAS ----------
function ScreenAulas({ nav }) {
  const [turmas,setTurmas] = React.useState(null);
  const [q,setQ] = React.useState('');
  React.useEffect(()=>{ let alive=true;
    if(authEnabled){ listTurmas().then(r=>{ if(alive) setTurmas(r); }); } else { setTurmas(DEMO_TURMAS); }
    return ()=>{ alive=false; }; },[]);
  const base = turmas||[];
  const list = base.filter(t=> t.nome.toLowerCase().includes(q.toLowerCase()));
  const nivelTone = n => /avan/i.test(n)?'coral' : /inter/i.test(n)?'turq' : 'info';
  return (
    <Screen>
      <Body top={50} bottom={12}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:26, letterSpacing:'-.02em', color:'#fff' }}>Turmas</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {turmas && <span style={{ fontFamily:'var(--ff-m)', fontSize:11, color:C.inkDim }}>{base.length} turmas</span>}
            <div className="bf-tap" onClick={()=>nav.go('turmaForm')} style={{ width:34,height:34,borderRadius:11, border:`1px solid ${C.line2}`,
              display:'flex',alignItems:'center',justifyContent:'center' }}><Icon name="plus" size={18} color={C.turq}/></div>
          </div>
        </div>
        <Card style={{ marginTop:12, display:'flex', alignItems:'center', gap:9, padding:'10px 13px' }}>
          <Icon name="search" size={18} color={C.n500}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar turma…"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:C.ink, fontFamily:'var(--ff-u)', fontSize:14 }}/>
        </Card>
        <div style={{ marginTop:8 }}>
          {turmas===null && <div style={{ textAlign:'center', color:C.inkDim, fontSize:13, marginTop:30 }}>Carregando turmas…</div>}
          {turmas && list.length===0 && <div style={{ textAlign:'center', color:C.inkDim, fontSize:13, marginTop:30 }}>
            {base.length===0 ? 'Nenhuma turma nesta conta.' : 'Nenhuma turma encontrada.'}</div>}
          {list.map(t=>
            <Card key={t.id} onClick={()=>nav.go('turma',{ turma:t })} style={{ marginTop:8, padding:'13px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:11 }}>
                {t.hora && <div style={{ fontFamily:'var(--ff-m)', fontSize:12.5, color:C.turq, width:40 }}>{t.hora}</div>}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.nome}</div>
                  <div style={{ fontSize:11.5, color:C.inkDim, marginTop:2 }}>{t.foco ? `Foco: ${t.foco}` : (t.alunos? 'Toque para gerar plano' : 'Turma vazia')}</div></div>
                <Badge tone={nivelTone(t.nivel)}>{t.nivel}</Badge>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, paddingLeft:t.hora?51:0 }}>
                <Icon name="users" size={13} color={C.n500}/>
                <span style={{ fontFamily:'var(--ff-m)', fontSize:10.5, color:C.n500 }}>{t.alunos}{t.capacidade?`/${t.capacidade}`:''} alunos</span>
                <span className="bf-tap" onClick={e=>{ e.stopPropagation(); nav.go('turmaForm',{turma:t}); }}
                  style={{ marginLeft:'auto', fontSize:11.5, color:C.turq }}>Editar</span>
              </div>
            </Card>)}
        </div>
      </Body>
      <TabBar active="aulas" onTab={nav.tab}/>
    </Screen>
  );
}

function ScreenTurmaForm({ nav, params }) {
  const turma = params.turma || null;
  const [nome,setNome] = React.useState(turma?.nome || '');
  const [nivel,setNivel] = React.useState(turma?.nivel || 'Intermediário');
  const [hora,setHora] = React.useState(turma?.hora || '');
  const [capacidade,setCapacidade] = React.useState(turma?.capacidade || '');
  const [foco,setFoco] = React.useState(turma?.foco || '');
  const [erro,setErro] = React.useState('');
  const [saving,setSaving] = React.useState(false);
  const salvar = async ()=>{
    setErro('');
    if(!nome.trim()){ setErro('Informe o nome da turma.'); return; }
    if(!authEnabled){ setErro('Cadastro real exige Supabase conectado.'); return; }
    setSaving(true);
    const r = await salvarTurmaCadastro({ id:turma?.id, nome, nivel, hora, capacidade, foco });
    setSaving(false);
    if(!r.ok){ setErro(r.error || 'Não foi possível salvar.'); return; }
    nav.tab('aulas');
  };
  return <Screen>
    <Header onBack={nav.back} kicker="Cadastro" title={turma?'Editar turma':'Nova turma'}/>
    <Body top={16} bottom={96}>
      <Card>
        <CadastroField label="Nome">
          <input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: Segunda 20H" style={cadastroInputStyle}/>
        </CadastroField>
        <div style={{ display:'flex', gap:10 }}>
          <CadastroField label="Nível">
            <select value={nivel} onChange={e=>setNivel(e.target.value)} style={cadastroInputStyle}>
              {NIVEL_OPTIONS.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </CadastroField>
          <CadastroField label="Hora">
            <input value={hora} onChange={e=>setHora(e.target.value)} placeholder="18:00" style={cadastroInputStyle}/>
          </CadastroField>
        </div>
        <CadastroField label="Capacidade">
          <input type="number" min="1" value={capacidade} onChange={e=>setCapacidade(e.target.value)} placeholder="6" style={cadastroInputStyle}/>
        </CadastroField>
        <CadastroField label="Foco padrão">
          <input value={foco} onChange={e=>setFoco(e.target.value)} placeholder="Ex.: Devolução" style={cadastroInputStyle}/>
        </CadastroField>
        {erro && <div style={{ marginTop:12, color:C.err, fontSize:12 }}>{erro}</div>}
      </Card>
    </Body>
    <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'12px 20px 30px',
      background:'linear-gradient(transparent,'+C.navy900+' 30%)' }}>
      <Btn kind="primary" style={{ width:'100%' }} icon="check" onClick={salvar}>{saving?'Salvando…':'Salvar turma'}</Btn>
    </div>
  </Screen>;
}

function ScreenTurma({ nav, params }) {
  const turma = params.turma || DEMO_TURMAS[0];
  const [st,setSt] = React.useState({ loading:false, sessionId:null, alunos:null, error:'' });
  React.useEffect(()=>{
    if(!st.sessionId || !st.alunos?.length) return undefined;
    let alive = true;
    const refresh = async ()=>{
      try {
        const alunos = await atualizarStatusConfirmacoes(st.sessionId, st.alunos);
        if(alive) setSt(s=>({ ...s, alunos, error:'' }));
      } catch(err) {
        if(alive) setSt(s=>({ ...s, error:err.message || 'Não foi possível atualizar confirmações.' }));
      }
    };
    const id = setInterval(refresh, 10000);
    return ()=>{ alive=false; clearInterval(id); };
  },[st.sessionId, st.alunos?.length]);
  const preparar = async ()=>{
    setSt({ loading:true, sessionId:null, alunos:null, error:'' });
    try {
      const r = await prepararConfirmacoesTurma({ turma });
      setSt({ loading:false, sessionId:r.sessionId, alunos:r.alunos, error:'' });
    } catch(e) {
      setSt({ loading:false, sessionId:null, alunos:null, error:e.message || 'Não foi possível preparar confirmações.' });
    }
  };
  const msg = (item)=>{
    const link = confirmationUrl(item.token);
    return `Oi, ${item.aluno.name}! Confirma sua presença na aula ${turma.nome}${turma.hora?` (${turma.hora})`:''}? ${link}`;
  };
  return <Screen>
    <Header onBack={nav.back} kicker="Turma" title={turma.nome}/>
    <Body top={16} bottom={96}>
      <Card glow>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
          <div>
            <Mini>{turma.hora || '--:--'} · {turma.nivel}</Mini>
            <div style={{ fontSize:13.5, color:C.ink, marginTop:6 }}>{turma.alunos || 0}{turma.capacidade?`/${turma.capacidade}`:''} alunos</div>
          </div>
          {turma.foco && <Badge tone="turq">{turma.foco}</Badge>}
        </div>
      </Card>

      <div style={{ display:'flex', gap:10, marginTop:12 }}>
        <Btn kind="secondary" style={{ flex:1 }} icon="check" onClick={preparar}>{st.loading?'Preparando…':'Enviar WhatsApp'}</Btn>
        <Btn kind="primary" style={{ flex:1 }} icon="clip" onClick={()=>nav.go('plano',{ turma:turma.nome, nivel:turma.nivel, turmaObj:turma })}>Gerar plano</Btn>
      </div>
      <Mini style={{ marginTop:10 }}>Confirmação é para liberar vaga de reposição. Scout continua sendo periódico.</Mini>

      {st.error && <Card style={{ marginTop:12, borderColor:'rgba(242,84,91,.35)' }}>
        <div style={{ fontSize:12.5, color:C.err }}>{st.error}</div>
      </Card>}
      {st.alunos && st.alunos.length===0 && <Card style={{ marginTop:12, textAlign:'center', padding:'22px 16px' }}>
        <div style={{ fontSize:13, color:C.ink }}>Nenhum aluno matriculado nesta turma.</div>
      </Card>}
      {st.alunos && st.alunos.length>0 && <Card style={{ marginTop:12 }}>
        <Mini>Links de confirmação · {st.alunos.length} alunos</Mini>
        <div style={{ marginTop:10 }}>
          {st.alunos.map((item)=>
            <div key={item.aluno.id} style={{ padding:'10px 0', borderBottom:`1px solid ${C.line}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, color:C.ink, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.aluno.name}</div>
                  <div style={{ fontSize:11.5, color:item.aluno.phone?C.inkDim:C.warn, marginTop:2 }}>
                    {item.aluno.phone ? item.aluno.phone : 'Sem telefone no cadastro'}
                  </div>
                </div>
                <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
              </div>
              {item.error && <div style={{ fontSize:11.5, color:C.err, marginTop:6 }}>{item.error}</div>}
              {item.token && <div style={{ display:'flex', gap:8, marginTop:8 }}>
                {item.aluno.phone && <a href={whatsappUrl(item.aluno.phone, msg(item))} target="_blank" rel="noreferrer"
                  style={{ flex:1, textAlign:'center', textDecoration:'none', borderRadius:9, padding:'8px 10px',
                    background:'rgba(22,194,163,.14)', color:C.turq, fontSize:12.5, fontWeight:700 }}>WhatsApp</a>}
                <button className="bf-tap" onClick={()=>navigator.clipboard?.writeText(msg(item))}
                  style={{ flex:1, borderRadius:9, padding:'8px 10px', border:`1px solid ${C.line2}`,
                    background:'transparent', color:C.inkDim, fontSize:12.5, fontWeight:700 }}>Copiar</button>
              </div>}
            </div>)}
        </div>
      </Card>}
    </Body>
    <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'12px 20px 30px',
      background:'linear-gradient(transparent,'+C.navy900+' 30%)' }}>
      <Btn kind="primary" style={{ width:'100%' }} icon="clip" onClick={()=>nav.go('plano',{ turma:turma.nome, nivel:turma.nivel, turmaObj:turma })}>Gerar plano da turma</Btn>
    </div>
  </Screen>;
}

// ---------- PLANO DE AULA ----------
// campos possíveis de cada bloco -> rótulo amigável
const BLOCO_FIELDS = [
  ['organizacao','Organização'], ['comando','Comando'], ['regra','Regra'],
  ['bola_inicial','Bola inicial'], ['alvo_setor','Alvo/setor'], ['rotacao','Rotação'],
  ['correcao_principal','Correção principal'], ['erro_a_observar','Erro a observar'],
  ['criterio_qualidade','Critério de qualidade'], ['pontuacao_especial','Pontuação especial'],
  ['observar','Observar'], ['pergunta_final','Pergunta final'],
  ['registro_professor','Registro do professor'], ['proximo_passo','Próximo passo'],
];
function confTone(s){ const v=(s||'').toLowerCase();
  if(v.includes('alta')) return 'ok'; if(v.includes('moderada')) return 'warn'; return 'err'; }
function PlanoField({ label, value }){
  if(!value) return null;
  return <div style={{ marginTop:7 }}>
    <span style={{ fontFamily:'var(--ff-m)', fontSize:9, letterSpacing:'.08em', textTransform:'uppercase', color:C.n500 }}>{label}</span>
    <div style={{ fontSize:12.5, color:C.inkDim, marginTop:2, lineHeight:1.35 }}>{value}</div>
  </div>;
}
function EditField({ label, value, onChange, area = true }){
  const base = { width:'100%', marginTop:4, background:'rgba(255,255,255,.05)', color:C.ink,
    border:`1px solid ${C.line2}`, borderRadius:10, padding:'9px 11px', fontFamily:'var(--ff-u)',
    fontSize:13, lineHeight:1.4, outline:'none' };
  return <div style={{ marginTop:11 }}>
    <span style={{ fontFamily:'var(--ff-m)', fontSize:9, letterSpacing:'.08em', textTransform:'uppercase', color:C.n500 }}>{label}</span>
    {area
      ? <textarea value={value||''} onChange={e=>onChange(e.target.value)} rows={2} style={{ ...base, resize:'vertical' }}/>
      : <input value={value||''} onChange={e=>onChange(e.target.value)} style={base}/>}
  </div>;
}
// loading da IA com etapas rotativas (melhora a percepção da espera)
function LoadingSteps(){
  const steps = ['Lendo avaliação técnica…','Cruzando com a autoavaliação…','Conferindo o scout…','Encontrando o gap principal…','Definindo método e blocos…'];
  const [i,setI] = React.useState(0);
  React.useEffect(()=>{ const id=setInterval(()=>setI(v=>(v+1)%steps.length),2200); return ()=>clearInterval(id); },[]);
  return <Card glow style={{ textAlign:'center', padding:'32px 18px' }}>
    <div style={{ width:34, height:34, margin:'0 auto 14px', borderRadius:'50%',
      border:`3px solid ${C.line2}`, borderTopColor:C.turq, animation:'bf-spin .8s linear infinite' }}/>
    <div style={{ fontSize:14, color:C.ink }}>{steps[i]}</div>
    <div style={{ fontSize:12, color:C.inkDim, marginTop:5 }}>A IA pensa como professor: observa → interpreta → decide</div>
  </Card>;
}

function ScreenPlano({ nav, params }) {
  const a = params.aluno || null;
  const [st,setSt] = React.useState({ loading:true, plano:null, fonte:null, id:null });
  const [editing,setEditing] = React.useState(false);
  const [draft,setDraft] = React.useState(null);
  const [saved,setSaved] = React.useState(false);
  React.useEffect(()=>{
    let alive=true;
    if(params.plano){ setSt({ loading:false, plano:params.plano, fonte:params.fonte||'ia', id:params.id||null }); return; }
    setSt({ loading:true, plano:null, fonte:null, id:null });
    (async ()=>{
      const ctx = params.contexto || (params.turmaObj?.id ? await contextoTurmaParaIA(params.turmaObj) : contextFromParams(params));
      const r = await gerarPlano(ctx);
      if(alive) setSt({ loading:false, plano:r.plano, fonte:r.fonte, id:r.id });
    })().catch(e=>{ if(alive) setSt({ loading:false, plano:{ titulo:'Erro ao gerar plano', diagnostico:{ gapPrincipal:e.message, confianca:'muito baixa' }, blocos:[] }, fonte:'erro', id:null }); });
    return ()=>{ alive=false; };
  }, [a && a.id, params.contexto, params.turmaObj?.id]);

  const titulo = a ? a.nome.split(' ')[0] : (params.titulo || 'Turma B');
  const radarData = a && a.radar ? a.radar : [0.55,0.8,0.7,0.45,0.6,0.4];

  if(st.loading){
    return <Screen>
      <Header onBack={nav.back} kicker="Gerando com IA" title={titulo}/>
      <Body top={20}><LoadingSteps/></Body>
    </Screen>;
  }

  const p = st.plano || {};
  const dg = p.diagnostico || {};
  const dec = p.decisaoPedagogica || {};
  const ciclo = p.cicloPedagogico || {};
  const blocos = p.blocos || [];
  const kicker = [dec.estado, dec.metodo].filter(Boolean).join(' · ') || 'Plano gerado por IA';

  // ---- edição do plano ----
  const startEdit = ()=>{ setDraft(JSON.parse(JSON.stringify(p))); setEditing(true); };
  const upd = (path, val)=> setDraft(d=>{ const c=JSON.parse(JSON.stringify(d)); let o=c;
    for(let i=0;i<path.length-1;i++) o=o[path[i]]; o[path[path.length-1]]=val; return c; });
  const saveEdit = ()=>{
    setSt(s=>({ ...s, plano: draft }));
    setEditing(false);
    // aprendizado coletivo: persiste a edição aprovada do professor
    salvarEdicao(st.id, draft).then(ok=>{ if(ok){ setSaved(true); setTimeout(()=>setSaved(false),2500); } });
  };

  if(editing && draft){
    const d = draft, dd = d.diagnostico||{}, dde = d.decisaoPedagogica||{};
    return (
      <Screen>
        <Header onBack={()=>setEditing(false)} kicker="Editando plano" title={d.titulo || titulo}/>
        <Body top={16} bottom={96}>
          <EditField label="Título" area={false} value={d.titulo} onChange={v=>upd(['titulo'],v)}/>
          <EditField label="Gap principal" value={dd.gapPrincipal} onChange={v=>upd(['diagnostico','gapPrincipal'],v)}/>
          <EditField label="Objetivo" value={d.objetivo} onChange={v=>upd(['objetivo'],v)}/>
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1 }}><EditField label="Foco técnico" area={false} value={dde.focoTecnico} onChange={v=>upd(['decisaoPedagogica','focoTecnico'],v)}/></div>
            <div style={{ flex:1 }}><EditField label="Foco tático" area={false} value={dde.focoTatico} onChange={v=>upd(['decisaoPedagogica','focoTatico'],v)}/></div>
          </div>
          {(d.blocos||[]).map((b,i)=>
            <Card key={i} style={{ marginTop:14 }}>
              <div style={{ display:'flex', gap:10, alignItems:'baseline' }}>
                <div style={{ width:54 }}><EditField label="Tempo" area={false} value={b.tempo} onChange={v=>upd(['blocos',i,'tempo'],v)}/></div>
                <div style={{ flex:1 }}><EditField label="Bloco" area={false} value={b.nome} onChange={v=>upd(['blocos',i,'nome'],v)}/></div>
              </div>
              {BLOCO_FIELDS.filter(([k])=>b[k]!=null).map(([k,l])=>
                <EditField key={k} label={l} value={b[k]} onChange={v=>upd(['blocos',i,k],v)}/>)}
            </Card>)}
          <EditField label="Progressão" value={d.progressao} onChange={v=>upd(['progressao'],v)}/>
          <EditField label="Regressão" value={d.regressao} onChange={v=>upd(['regressao'],v)}/>
          <EditField label="Validar no scout" value={d.scoutValidacao} onChange={v=>upd(['scoutValidacao'],v)}/>
        </Body>
        <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'12px 20px 30px',
          background:'linear-gradient(transparent,'+C.navy900+' 30%)', display:'flex', gap:10 }}>
          <Btn kind="ghost" style={{ flex:1 }} onClick={()=>setEditing(false)}>Cancelar</Btn>
          <Btn kind="secondary" style={{ flex:2 }} icon="check" onClick={saveEdit}>Salvar ajustes</Btn>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header onBack={nav.back} kicker={kicker} title={p.titulo || titulo}
        right={<div className="bf-tap" onClick={startEdit} style={{ width:34,height:34,borderRadius:11, border:`1px solid ${C.line2}`,
          display:'flex',alignItems:'center',justifyContent:'center' }}><Icon name="edit" size={18} color={C.turq}/></div>}/>
      <Body top={16} bottom={96}>
        {st.fonte==='exemplo' &&
          <div style={{ marginBottom:12, padding:'9px 12px', borderRadius:10, fontSize:11.5,
            background:'rgba(246,180,60,.10)', border:'1px solid rgba(246,180,60,.28)', color:C.warn }}>
            Plano de exemplo · configure a IA para gerar de verdade (ver supabase/README.md)</div>}
        {saved &&
          <div style={{ marginBottom:12, padding:'9px 12px', borderRadius:10, fontSize:12, animation:'bf-in .25s ease',
            background:'rgba(39,192,138,.12)', border:'1px solid rgba(39,192,138,.3)', color:C.ok }}>
            ✓ Ajuste salvo — a IA pode aprender com ele</div>}

        {/* diagnóstico */}
        <Card glow>
          <div style={{ display:'flex', gap:13, alignItems:'flex-start' }}>
            <Radar data={radarData} size={92}/>
            <div style={{ flex:1 }}>
              <Mini>Diagnóstico</Mini>
              <div style={{ fontSize:13.5, color:'#fff', fontWeight:600, marginTop:5, lineHeight:1.25 }}>{dg.gapPrincipal}</div>
              {dg.contexto && <div style={{ fontSize:12, color:C.inkDim, marginTop:4, lineHeight:1.35 }}>{dg.contexto}</div>}
            </div>
          </div>
          {(dg.confianca || dg.fonte) &&
            <div style={{ marginTop:11, paddingTop:11, borderTop:`1px solid ${C.line}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, color:C.inkDim }}>Confiança {dg.fonte?`· fonte: ${dg.fonte}`:''}</span>
                {dg.confianca && <Badge tone={confTone(dg.confianca)}>{dg.confianca}</Badge>}
              </div>
              {dg.justificativaConfianca && <div style={{ fontSize:11, color:C.n500, marginTop:6, lineHeight:1.35 }}>{dg.justificativaConfianca}</div>}
            </div>}
        </Card>

        {/* objetivo + focos */}
        <Card style={{ marginTop:10 }}>
          <Mini>Objetivo</Mini>
          <div style={{ fontSize:13.5, color:C.ink, marginTop:5, lineHeight:1.35 }}>{p.objetivo}</div>
          {dec.focoTatico && <PlanoField label="Foco tático" value={dec.focoTatico}/>}
          <div style={{ display:'flex', gap:7, marginTop:12, flexWrap:'wrap' }}>
            {dec.focoTecnico && <Badge tone="turq">{dec.focoTecnico}</Badge>}
            {p.nivel && <Badge tone="info">{p.nivel}</Badge>}
            {dec.metodo && <Badge tone="coral">método: {dec.metodo}</Badge>}
          </div>
        </Card>

        {/* blocos */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 }}>
          <Mini>Blocos da aula</Mini><Badge tone="turq">★ GERADO POR IA</Badge>
        </div>
        {blocos.map((b,i)=>{
          const coral = /condicionado/i.test(b.nome||'');
          return <Card key={i} style={{ marginTop:8, borderColor: coral?'rgba(255,106,69,.3)':C.line }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
              <span style={{ fontFamily:'var(--ff-m)', fontSize:12, color: coral?C.coral:C.turq }}>{b.tempo}</span>
              <span style={{ fontSize:13.5, color:C.ink, fontWeight:600 }}>{b.nome}</span>
            </div>
            {BLOCO_FIELDS.map(([k,l])=> <PlanoField key={k} label={l} value={b[k]}/>)}
          </Card>;
        })}

        {/* progressão / regressão */}
        <div style={{ display:'flex', gap:10, marginTop:12 }}>
          <Card style={{ flex:1, padding:13 }}>
            <Mini color={C.ok}>↑ Progressão</Mini>
            <div style={{ fontSize:11.5, color:C.inkDim, marginTop:6, lineHeight:1.35 }}>{p.progressao}</div>
          </Card>
          <Card style={{ flex:1, padding:13 }}>
            <Mini color={C.warn}>↓ Regressão</Mini>
            <div style={{ fontSize:11.5, color:C.inkDim, marginTop:6, lineHeight:1.35 }}>{p.regressao}</div>
          </Card>
        </div>

        {/* scout de validação */}
        {p.scoutValidacao && <Card style={{ marginTop:10 }}>
          <Mini color={C.turq}>◎ Validar no próximo scout</Mini>
          <div style={{ fontSize:12.5, color:C.inkDim, marginTop:6, lineHeight:1.4 }}>{p.scoutValidacao}</div>
        </Card>}

        {/* ciclo pedagógico */}
        {ciclo.necessario && <Card style={{ marginTop:10, borderColor:'rgba(30,114,224,.3)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <Mini color={C.ocean}>↻ Ciclo pedagógico sugerido</Mini>
            {ciclo.duracaoSemanas>0 && <Badge tone="info">{ciclo.duracaoSemanas} semanas</Badge>}
          </div>
          {ciclo.justificativa && <div style={{ fontSize:12, color:C.inkDim, marginTop:7, lineHeight:1.4 }}>{ciclo.justificativa}</div>}
        </Card>}
      </Body>
      <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'12px 20px 30px',
        background:'linear-gradient(transparent,'+C.navy900+' 30%)', display:'flex', gap:10 }}>
        <Btn kind="ghost" style={{ flex:1 }} icon="edit" onClick={startEdit}>Ajustar</Btn>
        <Btn kind="primary" style={{ flex:2 }} icon="check" onClick={nav.back}>Usar plano na aula</Btn>
      </div>
    </Screen>
  );
}

// ---------- SCOUT (ao vivo) ----------
function ScreenScout({ nav }) {
  const [partidas,setPartidas] = React.useState(null);
  React.useEffect(()=>{ let alive=true;
    if(authEnabled){ listPartidas().then(r=>{ if(alive) setPartidas(r); }); } else { setPartidas([]); }
    return ()=>{ alive=false; }; },[]);
  const base = partidas||[];
  const fmtData = d => { try{ return new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}); }catch{ return ''; } };
  return (
    <Screen>
      <Body top={50} bottom={12}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:26, letterSpacing:'-.02em', color:'#fff' }}>Scout</div>
          <div className="bf-tap" onClick={()=>nav.go('scoutNovo')} style={{ display:'flex', alignItems:'center', gap:6,
            background:C.coral, color:'#fff', borderRadius:11, padding:'8px 13px', fontWeight:600, fontSize:13,
            boxShadow:'0 6px 16px rgba(255,106,69,.3)' }}><Icon name="plus" size={16} color="#fff"/>Nova partida</div>
        </div>
        <div style={{ marginTop:10 }}>
          {partidas===null && <div style={{ textAlign:'center', color:C.inkDim, fontSize:13, marginTop:30 }}>Carregando partidas…</div>}
          {partidas && base.length===0 && <div style={{ textAlign:'center', color:C.inkDim, fontSize:13, marginTop:30 }}>Nenhuma partida de scout ainda.</div>}
          {base.map(p=>
            <Card key={p.id} onClick={()=>nav.go('partida',{id:p.id})} style={{ marginTop:8, padding:'13px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <Mini>{fmtData(p.data)} · {p.pontos} pontos</Mini>
                {p.origem==='bt-tracker' ? <Badge tone="turq">BT Tracker</Badge> : (p.aoVivo ? <Badge tone="info">● AO VIVO</Badge> : <Badge tone="neutral">encerrada</Badge>)}
              </div>
              <div style={{ fontSize:13.5, color:C.ink, fontWeight:600, marginTop:6 }}>{p.titulo}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                <span style={{ flex:1, fontSize:12, color:C.inkDim, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.timeA}</span>
                <span style={{ fontFamily:'var(--ff-m)', fontSize:13, color:C.turq }}>{p.gamesA} × {p.gamesB}</span>
                <span style={{ flex:1, fontSize:12, color:C.inkDim, textAlign:'right', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.timeB}</span>
              </div>
            </Card>)}
        </div>
      </Body>
      <TabBar active="scout" onTab={nav.tab}/>
    </Screen>
  );
}
function ScreenPartida({ nav, params }) {
  const [d,setD] = React.useState(null);
  React.useEffect(()=>{ let alive=true; getPartida(params.id).then(r=>{ if(alive) setD(r); }); return ()=>{ alive=false; }; }, [params.id]);
  const fmtData = x => { try{ return new Date(x).toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}); }catch{ return ''; } };
  if(!d) return <Screen><Header onBack={nav.back} kicker="Carregando" title="Partida"/>
    <Body top={20}><div style={{ textAlign:'center', color:C.inkDim, fontSize:13 }}>Carregando…</div></Body></Screen>;
  const s = d.stats;
  const maxG = Math.max(1, ...s.topGolpes.map(g=>g[1]));
  return (
    <Screen>
      <Header onBack={nav.back} kicker={`Scout · ${fmtData(d.data)}`} title={d.titulo}/>
      <Body top={16} bottom={96}>
        <Card glow>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1, fontSize:13.5, color:C.ink }}>{d.timeA}</div>
            <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:22, color:C.turq }}>{d.gamesA} × {d.gamesB}</div>
            <div style={{ flex:1, fontSize:13.5, color:C.ink, textAlign:'right' }}>{d.timeB}</div>
          </div>
          <div style={{ textAlign:'center', marginTop:9 }}><Mini>{s.total} pontos · {d.origem==='bt-tracker'?'BT Tracker':(d.encerrada?'encerrada':'em andamento')}</Mini></div>
        </Card>

        <div style={{ display:'flex', gap:10, marginTop:10 }}>
          <Card style={{ flex:1, padding:13, textAlign:'center' }}><Mini>Pontos</Mini>
            <div style={{ fontFamily:'var(--ff-d)', fontWeight:700, fontSize:17, color:'#fff', marginTop:4 }}>{s.pontosA}<span style={{color:C.n500}}> × </span>{s.pontosB}</div></Card>
          <Card style={{ flex:1, padding:13, textAlign:'center' }}><Mini>Winners</Mini>
            <div style={{ fontFamily:'var(--ff-d)', fontWeight:700, fontSize:17, color:C.ok, marginTop:4 }}>{s.winners}</div></Card>
          <Card style={{ flex:1, padding:13, textAlign:'center' }}><Mini>Erros</Mini>
            <div style={{ fontFamily:'var(--ff-d)', fontWeight:700, fontSize:17, color:C.warn, marginTop:4 }}>{s.erros}</div></Card>
        </div>

        {s.topGolpes.length>0 && <Card style={{ marginTop:10 }}>
          <Mini>Pontos por golpe</Mini>
          <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:9 }}>
            {s.topGolpes.map(([g,n])=>
              <div key={g}><div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:5 }}>
                <span style={{color:C.ink}}>{g}</span><span style={{color:C.inkDim,fontFamily:'var(--ff-m)',fontSize:11}}>{n}</span></div>
                <Progress value={n/maxG*100}/></div>)}
          </div>
        </Card>}

        {s.topOutcomes.length>0 && <Card style={{ marginTop:10 }}>
          <Mini>Desfechos</Mini>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:10 }}>
            {s.topOutcomes.map(([o,n])=><Badge key={o} tone={/winner/i.test(o)?'ok':/erro/i.test(o)?'warn':'neutral'}>{o} · {n}</Badge>)}
          </div>
        </Card>}

        {d.pts.length>0 && <Card style={{ marginTop:10 }}>
          <Mini>Últimos pontos</Mini>
          <div style={{ marginTop:8 }}>
            {d.pts.slice(-12).reverse().map((pt,i)=>
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, padding:'7px 0', borderBottom:`1px solid ${C.line}` }}>
                <span style={{ fontFamily:'var(--ff-m)', color:C.turq, width:54 }}>{pt.score_after||'—'}</span>
                <span style={{ flex:1, color:C.ink }}>{pt.outcome||'—'}</span>
                <span style={{ color:C.inkDim }}>{pt.shot||''}</span>
              </div>)}
          </div>
        </Card>}
      </Body>
      {d.pts.length>0 && <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'12px 20px 30px',
        background:'linear-gradient(transparent,'+C.navy900+' 30%)' }}>
        <Btn kind="primary" style={{ width:'100%' }} icon="clip"
          onClick={()=>nav.go('plano',{ contexto: scoutContext(d), titulo: d.titulo })}>Gerar plano deste scout</Btn>
      </div>}
    </Screen>
  );
}
function ScoutBtn({ label, big, c, onClick, n }) {
  return <div className="bf-tap" onClick={onClick} style={{ aspectRatio:'1', borderRadius:14,
    border:`1px solid ${c}55`, background:`${c}14`, display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center', gap:3, position:'relative' }}>
    <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:24, color:c }}>{big}</div>
    <div style={{ fontFamily:'var(--ff-m)', fontSize:9, textTransform:'uppercase', color:C.inkDim }}>{label}</div>
    <div style={{ position:'absolute', top:7, right:9, fontFamily:'var(--ff-m)', fontSize:11, color:C.ink }}>{n}</div>
  </div>;
}

// ---------- SCOUT: NOVA PARTIDA (setup) ----------
function ScreenScoutNovo({ nav }) {
  const [alunos,setAlunos] = React.useState(null);
  const [turmas,setTurmas] = React.useState(null);
  const [titulo,setTitulo] = React.useState('Partida ao vivo');
  const [singles,setSingles] = React.useState(false);
  const [mode,setMode] = React.useState('lesson4');
  const [classId,setClassId] = React.useState('');
  const [sel,setSel] = React.useState({ a1:'', a2:'', b1:'', b2:'' });
  const [busy,setBusy] = React.useState(false);
  React.useEffect(()=>{ let alive=true;
    const alunosPromise = authEnabled ? listAlunos() : Promise.resolve(ALUNOS);
    const turmasPromise = authEnabled ? listTurmas() : Promise.resolve(DEMO_TURMAS);
    Promise.all([alunosPromise, turmasPromise]).then(([r,t])=>{ if(!alive) return; setAlunos(r); setTurmas(t);
      if(t.length){ setClassId(t[0].id); setTitulo(`Scout · ${t[0].nome}`); }
      if(r.length>=2) setSel({ a1:r[0].id, a2:(r[1]||r[0]).id, b1:(r[2]||r[1]||r[0]).id, b2:(r[3]||r[2]||r[1]||r[0]).id });
    });
    return ()=>{alive=false;};
  },[]);
  const byId = (id)=> (alunos||[]).find(a=>a.id===id);
  const turmaById = (id)=> (turmas||[]).find(t=>t.id===id);
  const selStyle = { width:'100%', marginTop:4, background:'rgba(255,255,255,.05)', color:C.ink,
    border:`1px solid ${C.line2}`, borderRadius:10, padding:'9px 11px', fontFamily:'var(--ff-u)', fontSize:13.5, outline:'none' };
  const Sel = ({ k, label }) => <div style={{ flex:1 }}>
    <span style={{ fontFamily:'var(--ff-m)', fontSize:9, letterSpacing:'.08em', textTransform:'uppercase', color:C.n500 }}>{label}</span>
    <select value={sel[k]} onChange={e=>setSel(s=>({...s,[k]:e.target.value}))} style={selStyle}>
      {(alunos||[]).map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
    </select></div>;
  const iniciar = async ()=>{
    const a1=byId(sel.a1), b1=byId(sel.b1);
    if(!a1||!b1) return;
    if(!singles && (!byId(sel.a2)||!byId(sel.b2))) return;
    setBusy(true);
    const m = await criarPartida({ titulo, mode, singles,
      a1:{id:a1.id,name:a1.nome}, a2: singles?null:{id:sel.a2,name:byId(sel.a2).nome},
      b1:{id:b1.id,name:b1.nome}, b2: singles?null:{id:sel.b2,name:byId(sel.b2).nome},
      classId: classId || null });
    setBusy(false);
    if(m) nav.go('scoutAoVivo',{ match:{ ...m, className: turmaById(classId)?.nome || null, classLevel: turmaById(classId)?.nivel || null } }); else alert('Não foi possível criar a partida.');
  };
  return (
    <Screen>
      <Header onBack={nav.back} kicker="Scout" title="Nova partida"/>
      <Body top={16} bottom={26}>
        {alunos===null && <div style={{ textAlign:'center', color:C.inkDim, fontSize:13, marginTop:30 }}>Carregando alunos…</div>}
        {alunos && alunos.length<2 && <Card style={{ textAlign:'center', padding:'24px 16px' }}>
          <div style={{ fontSize:13, color:C.ink }}>Você precisa de pelo menos 2 alunos cadastrados.</div></Card>}
        {alunos && alunos.length>=2 && <>
          <span style={{ fontFamily:'var(--ff-m)', fontSize:9, letterSpacing:'.08em', textTransform:'uppercase', color:C.n500 }}>Título</span>
          <input value={titulo} onChange={e=>setTitulo(e.target.value)} style={selStyle}/>
          <div style={{ marginTop:14 }}>
            <span style={{ fontFamily:'var(--ff-m)', fontSize:9, letterSpacing:'.08em', textTransform:'uppercase', color:C.n500 }}>Turma vinculada</span>
            <select value={classId} onChange={e=>{ const id=e.target.value; setClassId(id); const t=turmaById(id); if(t && titulo==='Partida ao vivo') setTitulo(`Scout · ${t.nome}`); }} style={selStyle}>
              <option value="">Sem turma</option>
              {(turmas||[]).map(t=><option key={t.id} value={t.id}>{t.nome} · {t.nivel}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            {[['Duplas',false],['Simples',true]].map(([l,v])=>
              <div key={l} className="bf-tap" onClick={()=>setSingles(v)} style={{ flex:1, textAlign:'center', padding:'10px 0',
                borderRadius:11, fontSize:13, fontWeight:600, border:`1px solid ${singles===v?C.turq:C.line2}`,
                color:singles===v?C.turq:C.inkDim, background:singles===v?'rgba(22,194,163,.12)':'transparent' }}>{l}</div>)}
          </div>
          <div style={{ marginTop:14 }}>
            <span style={{ fontFamily:'var(--ff-m)', fontSize:9, letterSpacing:'.08em', textTransform:'uppercase', color:C.n500 }}>Formato</span>
            <select value={mode} onChange={e=>setMode(e.target.value)} style={selStyle}>
              {MODES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <Card style={{ marginTop:14 }}>
            <Mini color={C.turq}>Dupla A</Mini>
            <div style={{ display:'flex', gap:10, marginTop:6 }}>
              <Sel k="a1" label="Jogador A1"/>{!singles && <Sel k="a2" label="Jogador A2"/>}</div>
          </Card>
          <Card style={{ marginTop:10 }}>
            <Mini color={C.coral}>Dupla B</Mini>
            <div style={{ display:'flex', gap:10, marginTop:6 }}>
              <Sel k="b1" label="Jogador B1"/>{!singles && <Sel k="b2" label="Jogador B2"/>}</div>
          </Card>
        </>}
      </Body>
      {alunos && alunos.length>=2 &&
        <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'12px 20px 30px',
          background:'linear-gradient(transparent,'+C.navy900+' 30%)' }}>
          <Btn kind="primary" style={{ width:'100%' }} icon="play" onClick={iniciar}>{busy?'…':'Iniciar scout'}</Btn>
        </div>}
    </Screen>
  );
}

// ---------- SCOUT: AO VIVO ----------
function ScreenScoutAoVivo({ nav, params }) {
  const m = params.match;
  const [score,setScore] = React.useState(m ? m.score : null);
  const [pts,setPts] = React.useState([]);
  const [draft,setDraft] = React.useState(null);
  const [busy,setBusy] = React.useState(false);
  if(!m) return <Screen><Header onBack={nav.back} title="Scout"/><Body top={20}><div style={{textAlign:'center',color:C.inkDim}}>Partida não encontrada.</div></Body></Screen>;
  const players = [...m.players.a, ...m.players.b];
  const fn = (nm='')=> nm.split(' ')[0];
  const teamName = (t)=> (t==='a'?m.players.a:m.players.b).map(p=>fn(p.name)).join(' & ');
  const serveEvent = draft && (draft.outcome==='Ace' || draft.outcome==='Erro de saque');
  const nextServeDraft = ()=>{
    const next = nextScoutServe(score);
    const team = m.players[next.team] || [];
    const server = team.length ? team[next.playerIndex % team.length].id : players[0]?.id || '';
    return { server, serve_side:next.serve_side, winner:'a', outcome:'Winner', technique:'', zone:'' };
  };
  const upd = (k,v)=> setDraft(d=>({...d,[k]:v}));
  const Choice = ({ k, v, label }) => <div className="bf-tap" onClick={()=>upd(k,v)}
    style={{ padding:'9px 4px', borderRadius:9, textAlign:'center', fontSize:11.5, lineHeight:1.15,
      border:`1px solid ${draft[k]===v?C.turq:C.line2}`, background:draft[k]===v?'rgba(22,194,163,.14)':'transparent',
      color:draft[k]===v?C.turq:C.inkDim }}>{label}</div>;
  const grid = (cols)=>({ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:7, marginTop:7 });
  const lbl = { fontFamily:'var(--ff-m)', fontSize:9.5, letterSpacing:'.06em', textTransform:'uppercase', color:C.n500, marginTop:13, display:'block' };

  const salvar = async ()=>{
    if(!draft.server||!draft.winner||!draft.outcome) return;
    if(!serveEvent && !draft.technique) return;
    setBusy(true);
    const after = await salvarPonto(m, draft, score, pts.length+1);
    setBusy(false);
    setScore(after);
    setPts(p=>[...p,{ outcome:draft.outcome, shot: serveEvent?'Saque':draft.technique, winner:draft.winner, score_after: scoutScoreText(after) }]);
    setDraft(null);
  };
  const encerrar = async ()=>{ await encerrarPartida(m.id); nav.go('partida',{ id:m.id }); };

  return (
    <Screen>
      <Header onBack={nav.back} kicker={modeLabel(m.mode)} title={m.titulo}/>
      <Body top={14} bottom={draft?12:90}>
        {/* placar */}
        <Card glow>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ flex:1, fontSize:13, color:C.ink }}>{teamName('a')}</div>
            <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:26, color:C.turq }}>{score.games.a} × {score.games.b}</div>
            <div style={{ flex:1, fontSize:13, color:C.ink, textAlign:'right' }}>{teamName('b')}</div>
          </div>
          <div style={{ textAlign:'center', marginTop:8 }}>
            <span style={{ fontFamily:'var(--ff-d)', fontWeight:700, fontSize:18, color:'#fff' }}>{scoutScoreText(score)}</span>
            <div style={{ marginTop:4 }}><Mini>{m.className?`${m.className} · `:''}{m.mode==='pro3'?`Sets ${score.sets.a}-${score.sets.b} · `:''}{score.superTie?'Super tiebreak':score.tie?'Tiebreak':`Set ${score.set_number}`}{scoutDeciding(score)?' · ponto decisivo':''}</Mini></div>
          </div>
          {score.finished && <div style={{ marginTop:10, textAlign:'center' }}>
            <Badge tone="ok">Partida encerrada</Badge></div>}
        </Card>

        {/* form de ponto */}
        {draft ? <Card style={{ marginTop:12 }}>
          <span style={{ ...lbl, marginTop:0 }}>Sacador</span>
          <div style={grid(2)}>{players.map(p=><Choice key={p.id} k="server" v={p.id} label={fn(p.name)}/>)}</div>
          <span style={lbl}>Posição do saque</span>
          <div style={grid(3)}>{SERVE_SIDES.map(x=><Choice key={x} k="serve_side" v={x} label={x}/>)}</div>
          <span style={lbl}>Quem venceu o ponto?</span>
          <div style={grid(2)}>
            <Choice k="winner" v="a" label={teamName('a')}/><Choice k="winner" v="b" label={teamName('b')}/></div>
          <span style={lbl}>Como terminou?</span>
          <div style={grid(2)}>{OUTCOMES.map(x=><Choice key={x} k="outcome" v={x} label={x}/>)}</div>
          {!serveEvent && <>
            <span style={lbl}>Técnica principal</span>
            <div style={grid(3)}>{TECHNIQUES.map(x=><Choice key={x} k="technique" v={x} label={x}/>)}</div>
            <span style={lbl}>Zona <span style={{textTransform:'none',color:C.n500}}>(opcional)</span></span>
            <div style={grid(3)}>{ZONES.map(x=><Choice key={x} k="zone" v={x} label={x}/>)}</div>
          </>}
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <Btn kind="ghost" style={{ flex:1 }} onClick={()=>setDraft(null)}>Cancelar</Btn>
            <Btn kind="secondary" style={{ flex:2 }} icon="check" onClick={salvar}>{busy?'…':'Salvar ponto'}</Btn>
          </div>
        </Card> : <>
          {pts.length>0 && <Card style={{ marginTop:12 }}>
            <Mini>Pontos ({pts.length})</Mini>
            <div style={{ marginTop:8 }}>
              {pts.slice(-8).reverse().map((p,i)=>
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, padding:'7px 0', borderBottom:`1px solid ${C.line}` }}>
                  <span style={{ fontFamily:'var(--ff-m)', color:C.turq, width:54 }}>{p.score_after}</span>
                  <span style={{ flex:1, color:C.ink }}>{p.outcome}</span>
                  <span style={{ color:C.inkDim }}>{p.shot} · {teamName(p.winner)}</span>
                </div>)}
            </div>
          </Card>}
        </>}
      </Body>
      {!draft && <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'12px 20px 30px',
        background:'linear-gradient(transparent,'+C.navy900+' 30%)', display:'flex', gap:10 }}>
        <Btn kind="ghost" style={{ flex:1 }} onClick={encerrar}>Encerrar</Btn>
        {!score.finished
          ? <Btn kind="primary" style={{ flex:2 }} icon="plus" onClick={()=>setDraft(nextServeDraft())}>Novo ponto</Btn>
          : <Btn kind="secondary" style={{ flex:2 }} onClick={()=>nav.go('partida',{id:m.id})}>Ver resumo</Btn>}
      </div>}
    </Screen>
  );
}

// ---------- DIAGNÓSTICO ----------
function ScreenDiagnostico({ nav, params }) {
  const a = (params && params.aluno) || ALUNOS[0];
  const [st,setSt] = React.useState({ loading:true, plano:null, fonte:null, id:null });
  React.useEffect(()=>{
    let alive=true; setSt({ loading:true, plano:null, fonte:null, id:null });
    gerarPlano(contextFromParams({ aluno:a })).then(r=>{ if(alive) setSt({ loading:false, plano:r.plano, fonte:r.fonte, id:r.id }); });
    return ()=>{ alive=false; };
  }, [a && a.id]);

  if(st.loading){
    return <Screen>
      <Header onBack={nav.back} kicker="Analisando" title="Diagnóstico"/>
      <Body top={20}><LoadingSteps/></Body>
    </Screen>;
  }

  const p = st.plano || {};
  const dg = p.diagnostico || {};
  const dec = p.decisaoPedagogica || {};
  const recs = [p.objetivo, dec.focoTatico, p.scoutValidacao].filter(Boolean);

  return (
    <Screen>
      <Header onBack={nav.back} kicker="Diagnóstico por IA" title={a.nome.split(' ')[0]}/>
      <Body top={16} bottom={92}>
        <Card style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Avatar initials={a.ini} color={a.cor} size={40}/>
          <div style={{ flex:1 }}><div style={{ fontSize:15, color:C.ink, fontWeight:600 }}>{a.nome}</div>
            <div style={{ fontSize:11.5, color:C.inkDim }}>{a.turma}</div></div>
          {dg.confianca && <Badge tone={confTone(dg.confianca)}>{dg.confianca}</Badge>}
        </Card>

        {/* gap headline */}
        <div style={{ marginTop:14, borderRadius:16, padding:16,
          background:'linear-gradient(150deg,rgba(255,106,69,.2),rgba(255,106,69,.04))',
          border:'1px solid rgba(255,106,69,.3)' }}>
          <Mini color={C.coral}>● Gap principal detectado</Mini>
          <div style={{ fontFamily:'var(--ff-d)', fontWeight:700, fontSize:19, color:'#fff', marginTop:8, lineHeight:1.18 }}>
            {dg.gapPrincipal}</div>
          {dg.contexto && <div style={{ fontSize:12.5, color:C.inkDim, marginTop:8, lineHeight:1.4 }}>{dg.contexto}</div>}
        </div>

        {/* fonte + justificativa da confiança */}
        {(dg.fonte || dg.justificativaConfianca) && <Card style={{ marginTop:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <Mini>Confiança do diagnóstico</Mini>
            {dg.fonte && <span style={{ fontFamily:'var(--ff-m)', fontSize:10, color:C.inkDim }}>fonte: {dg.fonte}</span>}
          </div>
          {dg.justificativaConfianca && <div style={{ fontSize:12, color:C.inkDim, marginTop:7, lineHeight:1.4 }}>{dg.justificativaConfianca}</div>}
        </Card>}

        {/* recomendação derivada do plano */}
        <Card style={{ marginTop:12 }}>
          <Mini>Recomendação pedagógica</Mini>
          <ul style={{ listStyle:'none', marginTop:10, display:'flex', flexDirection:'column', gap:9 }}>
            {recs.map((t,i)=>
              <li key={i} style={{ display:'flex', gap:9, fontSize:13, color:C.inkDim }}>
                <Icon name="check" size={16} color={C.turq}/><span>{t}</span></li>)}
          </ul>
        </Card>

        {st.fonte==='exemplo' &&
          <div style={{ marginTop:12, fontSize:11, color:C.n500, textAlign:'center' }}>
            Diagnóstico de exemplo · configure a IA para usar dados reais</div>}
      </Body>
      <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'12px 20px 30px',
        background:'linear-gradient(transparent,'+C.navy900+' 30%)' }}>
        <Btn kind="primary" style={{ width:'100%' }} icon="clip"
          onClick={()=>nav.go('plano',{ aluno:a, plano:st.plano, fonte:st.fonte, id:st.id })}>Gerar plano de treino</Btn>
      </div>
    </Screen>
  );
}
function Stat({ n, l, tone }) {
  return <Card style={{ flex:1, padding:12 }}>
    <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:21, color:tone, letterSpacing:'-.02em' }}>{n}</div>
    <div style={{ fontSize:10.5, color:C.inkDim, marginTop:2, lineHeight:1.2 }}>{l}</div></Card>;
}

Object.assign(window, { ScreenAulas, ScreenPlano, ScreenScout, ScreenDiagnostico });


/* ===== app/ScreensC.jsx ===== */
/* BeachFlow — Screens C: Avaliação técnica, Autoavaliação, Evolução, Financeiro */

// ---------- AVALIAÇÃO TÉCNICA (professor) ----------
function ScreenAvaliacao({ nav, params }) {
  const a = (params && params.aluno) || ALUNOS[0];
  const FUND = ['Saque','Devolução','Ataque','Defesa','Posicionamento','Constância'];
  const [vals,setVals] = React.useState(a.radar.map(v=>Math.round(v*5)));
  const [nota,setNota] = React.useState('');
  const [salvando,setSalvando] = React.useState(false);
  const set = (i,n)=>setVals(s=>s.map((v,j)=>j===i?n:v));
  const salvar = async ()=>{
    setSalvando(true);
    const notas = {}; FUND.forEach((f,i)=>{ notas[f]=vals[i]; });
    await salvarAvaliacao(a.id, notas, nota.trim()||null);
    setSalvando(false);
    // leva ao diagnóstico já usando a avaliação real recém-salva
    nav.go('diagnostico',{ aluno:a });
  };
  return (
    <Screen>
      <Header onBack={nav.back} kicker={'Avaliação técnica · '+a.nome.split(' ')[0]} title="Avaliar"/>
      <Body top={16} bottom={92}>
        <Card style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Avatar initials={a.ini} color={a.cor} size={38}/>
          <div style={{ flex:1 }}><div style={{ fontSize:14, color:C.ink, fontWeight:600 }}>{a.nome}</div>
            <div style={{ fontSize:11.5, color:C.inkDim }}>{a.turma}</div></div>
          <Badge tone="turq">{Math.round(vals.reduce((x,y)=>x+y,0)/vals.length*20)}%</Badge>
        </Card>
        <Mini style={{ marginTop:16 }}>Toque para pontuar cada fundamento</Mini>
        {FUND.map((f,i)=>
          <Card key={f} style={{ marginTop:8, padding:'13px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:14, color:C.ink }}>{f}</span>
              <span style={{ fontFamily:'var(--ff-m)', fontSize:11, color:C.turq }}>{vals[i]}/5</span></div>
            <div style={{ display:'flex', gap:8, marginTop:11 }}>
              {[1,2,3,4,5].map(n=><div key={n} className="bf-tap" onClick={()=>set(i,n)}
                style={{ flex:1, height:30, borderRadius:8, background: n<=vals[i]?C.turq:'rgba(255,255,255,.06)',
                  border:`1px solid ${n<=vals[i]?'transparent':C.line}` }}/>) }
            </div>
          </Card>)}
        <Card style={{ marginTop:12 }}>
          <Mini>Nota livre do professor (a IA usa no diagnóstico)</Mini>
          <textarea value={nota} onChange={e=>setNota(e.target.value)} rows={2}
            placeholder="Ex.: ainda recua na devolução cruzada sob saque profundo…"
            style={{ width:'100%', marginTop:8, background:'rgba(255,255,255,.05)', color:C.ink,
              border:`1px solid ${C.line2}`, borderRadius:10, padding:'9px 11px', fontFamily:'var(--ff-u)',
              fontSize:13, lineHeight:1.4, outline:'none', resize:'vertical' }}/>
        </Card>
      </Body>
      <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'12px 20px 30px',
        background:'linear-gradient(transparent,'+C.navy900+' 30%)' }}>
        <Btn kind="primary" style={{ width:'100%' }} icon="check" onClick={salvar}>
          {salvando ? 'Salvando…' : 'Salvar e ver diagnóstico'}</Btn>
      </div>
    </Screen>
  );
}

// ---------- AUTOAVALIAÇÃO (aluno) ----------
function ScreenAutoaval({ nav }) {
  const Q = ['Como você se sentiu no saque hoje?','Conseguiu ler o jogo da dupla?','Sua recepção foi consistente?'];
  const [ans,setAns] = React.useState([2,1,2]);
  const set=(i,n)=>setAns(s=>s.map((v,j)=>j===i?n:v));
  const faces=['😟','😕','🙂','😄'];
  return (
    <Screen bg={C.navy850}>
      <Header onBack={nav.back} kicker="Aluno · após a aula" title="Como foi hoje?"/>
      <Body top={16} bottom={92}>
        <Card glow><div style={{ fontSize:13.5, color:C.ink, lineHeight:1.4 }}>
          Sua percepção ajuda o professor a montar o próximo treino. <b style={{color:C.turq}}>Leva 30 segundos.</b></div></Card>
        {Q.map((q,i)=>
          <Card key={i} style={{ marginTop:10 }}>
            <div style={{ fontSize:14, color:C.ink }}>{q}</div>
            <div style={{ display:'flex', gap:8, marginTop:13 }}>
              {faces.map((f,n)=><div key={n} className="bf-tap" onClick={()=>set(i,n)}
                style={{ flex:1, textAlign:'center', padding:'10px 0', borderRadius:12, fontSize:22,
                  background:ans[i]===n?'rgba(22,194,163,.16)':'rgba(255,255,255,.04)',
                  border:`1px solid ${ans[i]===n?C.turq:C.line}`, filter:ans[i]===n?'none':'grayscale(.6) opacity(.7)' }}>{f}</div>)}
            </div>
          </Card>)}
        <Card style={{ marginTop:10 }}>
          <Mini>O que você quer treinar mais?</Mini>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginTop:10 }}>
            {['Saque','Devolução','Ataque','Defesa','Constância'].map((t,i)=>
              <span key={t} className="bf-tap" style={{ fontFamily:'var(--ff-m)', fontSize:11.5, padding:'7px 12px',
                borderRadius:9, border:`1px solid ${i===1?C.coral:C.line2}`, color:i===1?C.coral:C.inkDim,
                background:i===1?'rgba(255,106,69,.1)':'transparent' }}>{t}</span>)}
          </div>
        </Card>
      </Body>
      <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'12px 20px 30px',
        background:'linear-gradient(transparent,'+C.navy850+' 30%)' }}>
        <Btn kind="secondary" style={{ width:'100%' }} icon="check" onClick={nav.back}>Enviar para o professor</Btn>
      </div>
    </Screen>
  );
}

// ---------- EVOLUÇÃO PERCEBIDA ----------
function ScreenEvolucao({ nav }) {
  return (
    <Screen>
      <Header onBack={nav.back} kicker="Turma B · 7 semanas" title="Evolução"/>
      <Body top={16} bottom={26}>
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <Mini>Índice de evolução percebida</Mini>
            <span style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:22, color:C.turq, letterSpacing:'-.02em' }}>+18%</span></div>
          <div style={{ marginTop:14 }}><Line values={[40,42,48,46,55,60,64]} height={100}/></div>
          <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--ff-m)', fontSize:9.5, color:C.n500, marginTop:6 }}>
            {['S1','S2','S3','S4','S5','S6','S7'].map(s=><span key={s}>{s}</span>)}</div>
        </Card>

        <Mini style={{ marginTop:18 }}>Por fundamento</Mini>
        {[['Recepção',64,'+22%',C.turq],['Saque',58,'+9%',C.turq],['Devolução',38,'-4%',C.warn],['Defesa',71,'+15%',C.turq]].map(([l,v,d,t])=>
          <Card key={l} style={{ marginTop:8, padding:'13px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:9 }}>
              <span style={{ fontSize:13.5, color:C.ink }}>{l}</span>
              <span style={{ fontFamily:'var(--ff-m)', fontSize:11.5, color:t }}>{d}</span></div>
            <Progress value={v} tone={t}/>
          </Card>)}

        <Card style={{ marginTop:14, display:'flex', gap:12, alignItems:'center' }}>
          <Bars values={[3,5,4,6,5,7,6]} hi={5} height={48}/>
          <div style={{ flex:1 }}><Mini>Aulas com plano</Mini>
            <div style={{ fontSize:13, color:C.ink, marginTop:4 }}>6 de 7 semanas com plano gerado</div>
            <div style={{ fontSize:11.5, color:C.inkDim, marginTop:2 }}>Consistência puxa a evolução</div></div>
        </Card>
      </Body>
    </Screen>
  );
}

// ---------- FINANCEIRO ----------
function ScreenFinanceiro({ nav }) {
  const mov = [
    { t:'Mensalidade · Júlia', v:'+ R$ 360', tone:'ok' },
    { t:'Particular · Léo', tag:'PENDENTE', tone:'warn' },
    { t:'Mensalidade · Carla', v:'+ R$ 320', tone:'ok' },
    { t:'Particular · João', tag:'ATRASADO', tone:'err' },
  ];
  return (
    <Screen>
      <Body top={50} bottom={12}>
        <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:26, letterSpacing:'-.02em', color:'#fff' }}>Financeiro</div>
        <Card glow style={{ marginTop:12 }}>
          <Mini>Recebido · maio</Mini>
          <div style={{ fontFamily:'var(--ff-d)', fontWeight:800, fontSize:30, color:'#fff', letterSpacing:'-.02em', marginTop:4 }}>R$ 8.420</div>
          <div style={{ marginTop:12 }}><Bars values={[5,7,6,9,10]} hi={4} height={36}/></div>
          <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'var(--ff-m)', fontSize:9.5, color:C.n500, marginTop:7 }}>
            {['Jan','Fev','Mar','Abr','Mai'].map(m=><span key={m}>{m}</span>)}</div>
        </Card>
        <div style={{ display:'flex', gap:10, marginTop:10 }}>
          <Card style={{ flex:1, padding:13 }}><Mini>A receber</Mini>
            <div style={{ fontSize:17, fontWeight:700, color:C.ink, marginTop:4 }}>R$ 1.260</div></Card>
          <Card style={{ flex:1, padding:13 }}><Mini>Atrasado</Mini>
            <div style={{ fontSize:17, fontWeight:700, color:C.err, marginTop:4 }}>R$ 320</div></Card>
        </div>
        <Mini style={{ marginTop:18 }}>Movimentações</Mini>
        {mov.map((m,i)=>
          <div key={i} style={{ display:'flex', alignItems:'center', gap:11, padding:'13px 2px', borderBottom:`1px solid ${C.line}` }}>
            <div style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,.05)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="dollar" size={17} color={C.turq}/></div>
            <div style={{ flex:1, fontSize:13.5, color:C.ink }}>{m.t}</div>
            {m.v ? <span style={{ fontFamily:'var(--ff-m)', fontSize:12.5, color:C.ok }}>{m.v}</span>
                 : <Badge tone={m.tone}>{m.tag}</Badge>}
          </div>)}
      </Body>
      <TabBar active="financeiro" onTab={nav.tab}/>
    </Screen>
  );
}

Object.assign(window, { ScreenAvaliacao, ScreenAutoaval, ScreenEvolucao, ScreenFinanceiro });

// ---------- HISTÓRICO DE PLANOS ----------
function ScreenHistorico({ nav }) {
  const [items,setItems] = React.useState(null);
  React.useEffect(()=>{ let alive=true; listarPlanos().then(r=>{ if(alive) setItems(r); }); return ()=>{ alive=false; }; },[]);
  return (
    <Screen>
      <Header onBack={nav.back} kicker="Seus planos" title="Histórico"/>
      <Body top={16} bottom={26}>
        {items===null &&
          <div style={{ textAlign:'center', color:C.inkDim, fontSize:13, marginTop:30 }}>Carregando…</div>}
        {items && items.length===0 &&
          <Card style={{ textAlign:'center', padding:'26px 18px' }}>
            <div style={{ fontSize:13.5, color:C.ink }}>Nenhum plano salvo ainda.</div>
            <div style={{ fontSize:12, color:C.inkDim, marginTop:5 }}>Gere um plano e ele aparece aqui.</div>
          </Card>}
        {items && items.map(it=>{
          const p = it.plano_editado || it.plano || {};
          const editado = !!it.plano_editado;
          const data = (()=>{ try{ return new Date(it.criado_em).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}); }catch{ return ''; } })();
          return (
            <Card key={it.id} onClick={()=>nav.go('plano',{ plano:p, fonte:'cache', id:it.id })} style={{ marginTop:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <Mini>{(it.nome||it.escopo||'plano')} · {data}</Mini>
                {editado && <Badge tone="coral">editado</Badge>}
              </div>
              <div style={{ fontSize:14, color:C.ink, fontWeight:600, marginTop:5 }}>{p.titulo||'Plano'}</div>
              {p.diagnostico?.gapPrincipal &&
                <div style={{ fontSize:12, color:C.inkDim, marginTop:3, lineHeight:1.35 }}>{p.diagnostico.gapPrincipal}</div>}
            </Card>
          );
        })}
      </Body>
    </Screen>
  );
}

function ScreenConfirmacao({ token }) {
  const [st,setSt] = React.useState({ loading:true, data:null, error:'', done:'' });
  React.useEffect(()=>{
    let alive=true;
    getConfirmacao(token)
      .then(data=>{ if(alive) setSt({ loading:false, data, error:data?'':'Confirmação não encontrada.', done:'' }); })
      .catch(e=>{ if(alive) setSt({ loading:false, data:null, error:e.message || 'Não foi possível abrir a confirmação.', done:'' }); });
    return ()=>{ alive=false; };
  }, [token]);
  const responder = async (status)=>{
    setSt(s=>({ ...s, loading:true, error:'' }));
    try {
      await responderConfirmacao(token, status);
      setSt(s=>({ ...s, loading:false, done:status }));
    } catch(e) {
      setSt(s=>({ ...s, loading:false, error:e.message || 'Não foi possível responder.' }));
    }
  };
  const d = st.data || {};
  const studentName = d.student_name || d.nome_aluno || d.name || 'Aluno';
  const className = d.class_name || d.nome_turma || d.turma || 'aula';
  return <Screen>
    <div className="bf-scroll" style={{ flex:1, overflowY:'auto', padding:'70px 26px 34px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
      <div style={{ display:'flex', justifyContent:'center' }}><BFMark w={56}/></div>
      <div style={{ textAlign:'center', fontFamily:'var(--ff-d)', fontWeight:800, fontSize:25, color:'#fff', marginTop:18 }}>Confirmar presença</div>
      <Card glow style={{ marginTop:22, textAlign:'center', padding:'24px 18px' }}>
        {st.loading && <div style={{ fontSize:13, color:C.inkDim }}>Carregando…</div>}
        {!st.loading && st.error && <div style={{ fontSize:13, color:C.err, lineHeight:1.4 }}>{st.error}</div>}
        {!st.loading && !st.error && <>
          <div style={{ fontSize:14, color:C.ink }}>Oi, <b>{studentName}</b>.</div>
          <div style={{ fontSize:13, color:C.inkDim, marginTop:8, lineHeight:1.4 }}>Você vai participar da aula <b style={{color:C.ink}}>{className}</b>?</div>
          {st.done ? <div style={{ marginTop:18 }}>
            <Badge tone={st.done==='confirmed'?'ok':'coral'}>{st.done==='confirmed'?'Presença confirmada':'Vaga liberada'}</Badge>
            <div style={{ fontSize:12.5, color:C.inkDim, marginTop:10 }}>Obrigado pela resposta.</div>
          </div> : <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:20 }}>
            <Btn kind="primary" style={{ width:'100%' }} icon="check" onClick={()=>responder('confirmed')}>Vou participar</Btn>
            <Btn kind="ghost" style={{ width:'100%' }} icon="x" onClick={()=>responder('declined')}>Não irei</Btn>
          </div>}
        </>}
      </Card>
    </div>
  </Screen>;
}

function ScreenAutoavaliacaoPublica({ token }) {
  const aluno = new URLSearchParams(window.location.search).get('aluno') || 'aluno';
  const [scores,setScores] = React.useState(()=>Object.fromEntries(AUTO_FUNDAMENTOS.map(f=>[f,3])));
  const [st,setSt] = React.useState({ loading:false, done:false, error:'' });
  const set = (f,n)=>setScores(s=>({ ...s, [f]:n }));
  const enviar = async ()=>{
    setSt({ loading:true, done:false, error:'' });
    try {
      const payload = Object.fromEntries(Object.entries(scores).map(([f,v])=>[f, Number(v) * 2]));
      await salvarAutoavaliacaoToken(token, payload);
      setSt({ loading:false, done:true, error:'' });
    } catch(e) {
      const msg = String(e.message || 'Não foi possível enviar.');
      setSt({ loading:false, done:false, error:/ja foi enviada|já foi enviada|utilizad/i.test(msg)
        ? 'Esta autoavaliação já foi enviada. Peça um novo link ao professor se quiser responder novamente.'
        : msg });
    }
  };
  return <Screen>
    <div className="bf-scroll" style={{ flex:1, overflowY:'auto', padding:'46px 22px 34px' }}>
      <div style={{ display:'flex', justifyContent:'center' }}><BFMark w={52}/></div>
      <div style={{ textAlign:'center', fontFamily:'var(--ff-d)', fontWeight:800, fontSize:24, color:'#fff', marginTop:16 }}>Autoavaliação</div>
      <Card glow style={{ marginTop:18, textAlign:'center' }}>
        <div style={{ fontSize:14, color:C.ink }}>Oi, <b>{aluno}</b>.</div>
        <div style={{ fontSize:12.5, color:C.inkDim, lineHeight:1.45, marginTop:8 }}>
          Escolha como você se sente hoje em cada fundamento. Não precisa acertar: seja sincero.
        </div>
      </Card>
      {st.done ? <Card style={{ marginTop:14, textAlign:'center', padding:'28px 18px' }}>
        <div style={{ fontSize:17, color:C.ink, fontWeight:700 }}>Avaliação enviada.</div>
        <div style={{ fontSize:12.5, color:C.inkDim, lineHeight:1.4, marginTop:8 }}>Obrigado. Seu professor já pode usar essas respostas para ajustar os treinos.</div>
      </Card> : <>
        {AUTO_FUNDAMENTOS.map(f=>
          <Card key={f} style={{ marginTop:9, padding:'12px 13px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13.5, color:C.ink }}>{f}</span>
              <span style={{ fontFamily:'var(--ff-m)', fontSize:11.5, color:C.turq }}>{scores[f]}/5</span>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:10 }}>
              {[1,2,3,4,5].map(n=><button key={n} className="bf-tap" onClick={()=>set(f,n)}
                style={{ flex:1, height:31, borderRadius:8, border:`1px solid ${scores[f]===n?C.turq:C.line}`,
                  background:scores[f]===n?'rgba(22,194,163,.18)':'rgba(255,255,255,.04)',
                  color:scores[f]===n?C.turq:C.inkDim, fontFamily:'var(--ff-m)', fontSize:12 }}>{n}</button>)}
            </div>
          </Card>)}
        {st.error && <Card style={{ marginTop:12, borderColor:'rgba(242,84,91,.35)' }}>
          <div style={{ fontSize:12.5, color:C.err, lineHeight:1.4 }}>{st.error}</div>
        </Card>}
        <Btn kind="secondary" style={{ width:'100%', marginTop:14 }} icon="check" onClick={enviar}>
          {st.loading?'Enviando…':'Enviar avaliação'}
        </Btn>
      </>}
    </div>
  </Screen>;
}

/* ===== BeachFlow — App shell (mobile / PWA real) ===== */
const REG = {
  login: ScreenLogin, hoje: ScreenHoje, alunos: ScreenAlunos, aulas: ScreenAulas,
  scout: ScreenScout, financeiro: ScreenFinanceiro, aluno: ScreenAluno, alunoForm: ScreenAlunoForm, turma: ScreenTurma, turmaForm: ScreenTurmaForm, plano: ScreenPlano,
  diagnostico: ScreenDiagnostico, avaliacao: ScreenAvaliacao, autoavaliacao: ScreenAutoaval,
  evolucao: ScreenEvolucao, historico: ScreenHistorico, partida: ScreenPartida,
  scoutNovo: ScreenScoutNovo, scoutAoVivo: ScreenScoutAoVivo,
};
const TAB_ROUTES = ['hoje', 'alunos', 'aulas', 'scout', 'financeiro'];

export function App() {
  const confirmToken = new URLSearchParams(window.location.search).get('confirm');
  const autoToken = new URLSearchParams(window.location.search).get('auto');
  const [stack, setStack] = React.useState([{ r: 'login' }]);
  const top = stack[stack.length - 1];

  // pula o login se já houver sessão ativa
  React.useEffect(()=>{
    if(confirmToken || autoToken) return;
    if(!authEnabled) return;
    supabase.auth.getSession().then(({ data })=>{ if(data?.session) setStack([{ r:'hoje' }]); });
  },[confirmToken, autoToken]);

  const nav = {
    go: (r, params) => {
      if (TAB_ROUTES.includes(r)) setStack([{ r, params }]);
      else setStack(s => [...s, { r, params }]);
    },
    tab: (r) => setStack([{ r }]),
    back: () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)),
    logout: async () => { if(authEnabled){ try{ await supabase.auth.signOut(); }catch{} } setStack([{ r:'login' }]); },
  };

  const Comp = REG[top.r] || ScreenHoje;
  if(confirmToken) return <div className="bf-app"><ScreenConfirmacao token={confirmToken}/></div>;
  if(autoToken) return <div className="bf-app"><ScreenAutoavaliacaoPublica token={autoToken}/></div>;
  return (
    <div className="bf-app">
      <Comp nav={nav} params={top.params || {}} />
    </div>
  );
}
