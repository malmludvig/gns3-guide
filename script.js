(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ================= Tema & meny ================= */
  const root = document.documentElement;
  const themeBtn = $('#themeToggle');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignorera */ } },
  };
  const savedTheme = store.get('gns3-theme');
  if (savedTheme) root.dataset.theme = savedTheme;
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  const syncTheme = () => {
    themeBtn.textContent = isDark() ? '☀' : '☾';
    themeBtn.setAttribute('aria-label', isDark() ? 'Byt till ljust tema' : 'Byt till mörkt tema');
  };
  themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    store.set('gns3-theme', next);
    syncTheme();
  });
  syncTheme();

  const nav = $('#mainNav');
  const menuBtn = $('#menuToggle');
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('a', nav).forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));

  // Markera aktiv sektion i menyn
  const navLinks = $$('a', nav);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach((a) => { const s = $(a.getAttribute('href')); if (s) io.observe(s); });

  /* ================= Emulering vs simulering ================= */
  const EMU_SIM = {
    emu: {
      left: `<h3>Så fungerar emulering</h3>
        <ul>
          <li>Kör <strong>det riktiga operativsystemet</strong> (t.ex. Cisco IOS) i en virtuell maskin.</li>
          <li>Alla kommandon och funktioner som finns i images:en fungerar.</li>
          <li>Kräver mer RAM och CPU – varje router är en egen process.</li>
          <li>Du måste själv tillhandahålla images.</li>
        </ul>`,
      right: `<h3>Kedjan</h3>
        <div class="flow"><span>GNS3 GUI</span><i>→</i><span>GNS3 Server</span><i>→</i><span>QEMU / Dynamips</span><i>→</i><span>Äkta Cisco IOS</span></div>
        <p class="muted" style="margin-top:12px">Resultat: beteendet är identiskt med fysisk utrustning – även buggar och tidsberoenden.</p>`,
    },
    sim: {
      left: `<h3>Så fungerar simulering</h3>
        <ul>
          <li>Programmet <strong>härmar</strong> hur en enhet beter sig, utan att köra det riktiga OS:et.</li>
          <li>Bara de kommandon som utvecklarna byggt in finns.</li>
          <li>Väldigt lätt – hundratals enheter på en vanlig laptop.</li>
          <li>Perfekt för att lära sig grunderna.</li>
        </ul>`,
      right: `<h3>Kedjan</h3>
        <div class="flow"><span>Packet Tracer</span><i>→</i><span>Inbyggd modell av en router</span></div>
        <p class="muted" style="margin-top:12px">Resultat: snabbt och enkelt, men avancerade funktioner kan saknas eller bete sig annorlunda.</p>`,
    },
  };
  const emuBody = $('#emuSimBody');
  const setEmu = (mode) => {
    emuBody.innerHTML = `<div>${EMU_SIM[mode].left}</div><div>${EMU_SIM[mode].right}</div>`;
    $$('.compare-toggle [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
  };
  $$('.compare-toggle [role=tab]').forEach((b) => b.addEventListener('click', () => setEmu(b.dataset.mode)));
  setEmu('emu');

  /* ================= Arkitektur ================= */
  const ARCH = {
    gui: { t: 'GNS3 GUI', d: 'Det grafiska programmet du arbetar i. Här ritar du topologier, startar enheter och öppnar konsoler. GUI:t gör inga emuleringar själv – det skickar instruktioner till en server.', tags: ['Python + Qt', 'Windows', 'macOS', 'Linux'] },
    web: { t: 'Web-UI', d: 'Ett webbgränssnitt som pratar med samma server som GUI:t. Praktiskt när servern körs på en annan maskin eller när du vill komma åt labbet från webbläsaren.', tags: ['Webbläsare', 'Inbyggt i servern'] },
    local: { t: 'Lokal server', d: 'Installeras tillsammans med GUI:t och körs på din egen dator. Bra för lätta enheter som VPCS och Dynamips, men kan inte köra IOU och har sämre prestanda för QEMU på Windows/macOS.', tags: ['Enkelt', 'Begränsat på Windows/macOS'] },
    vm: { t: 'GNS3 VM (rekommenderas)', d: 'En färdig Linux-maskin som kör GNS3-servern i VMware eller VirtualBox. Ger tillgång till KVM-acceleration, IOU och Docker – det rekommenderade upplägget på Windows och macOS.', tags: ['Linux', 'KVM-acceleration', 'Samma version som GUI'] },
    remote: { t: 'Fjärrserver', d: 'GNS3-servern kan köras på en kraftfull maskin i ditt nätverk eller i molnet. Flera användare kan ansluta till samma server och dela resurser.', tags: ['Bare metal', 'Moln', 'Delade labb'] },
    dynamips: { t: 'Dynamips', d: 'Emulerar äldre Cisco-routrar på hårdvarunivå (bl.a. 1700, 2600, 3600, 3700 och 7200). Lätt att komma igång med, men stödjer bara äldre IOS-versioner.', tags: ['Cisco klassiskt', 'Låg resursåtgång'] },
    qemu: { t: 'QEMU / KVM', d: 'En generell emulator som kan köra nästan vad som helst: Cisco IOSv, CSR1000v, Juniper vMX, Arista vEOS, pfSense, Linux och Windows. Med KVM blir den mycket snabb.', tags: ['Multivendor', 'Mest använd'] },
    iou: { t: 'IOU / IOL', d: 'IOS on Unix/Linux – Cisco-images som körs som vanliga Linux-processer. Väldigt resurssnåla och stödjer både L2-switchning och L3-routing. Kräver Linux (GNS3 VM).', tags: ['Cisco', 'Lätt', 'Kräver Linux'] },
    vpcs: { t: 'VPCS', d: 'Virtual PC Simulator – en minimal “dator” som kan pinga, köra traceroute och få IP via DHCP. Perfekt för att testa anslutningar utan att starta ett helt OS.', tags: ['Inbyggd', 'Nästan ingen RAM'] },
    docker: { t: 'Docker', d: 'Kör containrar som noder, t.ex. en webbserver, ett nätverksverktyg eller en Linux-klient. Startar på sekunder.', tags: ['Containrar', 'Snabbt'] },
    virt: { t: 'VirtualBox / VMware', d: 'Befintliga virtuella maskiner (t.ex. Windows Server eller en brandvägg) kan kopplas in direkt i topologin.', tags: ['Fullständiga VM:ar'] },
  };
  const archDetail = $('#archDetail');
  const showArch = (key) => {
    const a = ARCH[key];
    archDetail.innerHTML = `<p class="eyebrow">Komponent</p><h3>${a.t}</h3><p>${a.d}</p><div class="tags">${a.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>`;
    $$('.arch-node').forEach((b) => b.classList.toggle('active', b.dataset.arch === key));
  };
  $$('.arch-node').forEach((b) => b.addEventListener('click', () => showArch(b.dataset.arch)));
  showArch('vm');

  /* ================= Arbetsflöde ================= */
  const STEPS = [
    { i: '📁', t: 'Skapa ett projekt', d: 'Ett projekt är en mapp som innehåller topologin, konfigurationer och diskavbilder. Allt sparas i en .gns3-fil.', tip: 'File → New blank project' },
    { i: '🧱', t: 'Lägg till templates', d: 'En template beskriver en enhetstyp – vilken image, hur mycket RAM och hur många nätverksportar den har. Du skapar den en gång och återanvänder den.', tip: 'Importera färdiga appliances från GNS3 Marketplace för att slippa manuell konfiguration.' },
    { i: '🖱️', t: 'Dra in enheter', d: 'Dra routrar, switchar och datorer från enhetspanelen till arbetsytan. Varje kopia blir en egen nod med egen konfiguration.', tip: 'Håll Shift och dra för att lägga till flera noder samtidigt.' },
    { i: '🔌', t: 'Koppla kablar', d: 'Välj kabelverktyget och klicka på två noder. Du väljer vilka portar som ska användas, t.ex. GigabitEthernet0/0.', tip: 'Röda prickar vid kabeländarna betyder att noden är avstängd, gröna att den är igång.' },
    { i: '▶️', t: 'Starta noderna', d: 'Tryck på den gröna play-knappen. GNS3-servern startar nu emulatorerna – det kan ta allt från en sekund (VPCS) till flera minuter (stora VM:ar).', tip: 'Starta inte allt på en gång om du har lite RAM – starta stegvis.' },
    { i: '⌨️', t: 'Konfigurera via konsolen', d: 'Dubbelklicka på en nod för att öppna konsolen. Du får en telnet-session mot enhetens seriella port, precis som med en konsolkabel.', tip: 'Konsolportarna börjar ofta på 5000 och ökar för varje nod.' },
    { i: '🦈', t: 'Fånga och analysera trafik', d: 'Högerklicka på en kabel och välj “Start capture”. Wireshark öppnas och visar paketen live när de passerar länken.', tip: 'Utmärkt för att förstå OSPF, STP, ARP och andra protokoll på riktigt.' },
  ];
  let step = 0;
  const stepDots = $('#stepDots');
  STEPS.forEach((s, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button">${i + 1}. ${s.t}</button>`;
    li.firstChild.addEventListener('click', () => { step = i; renderStep(); });
    stepDots.appendChild(li);
  });
  function renderStep() {
    const s = STEPS[step];
    $('#stepCard').innerHTML = `<div class="step-num">${s.i}</div><div><p class="eyebrow">Steg ${step + 1} av ${STEPS.length}</p><h3>${s.t}</h3><p>${s.d}</p><p class="step-tip">💡 ${s.tip}</p></div>`;
    $$('button', stepDots).forEach((b, i) => {
      b.classList.toggle('current', i === step);
      b.classList.toggle('done', i < step);
    });
    $('#stepPrev').disabled = step === 0;
    $('#stepNext').textContent = step === STEPS.length - 1 ? 'Till labbet →' : 'Nästa →';
  }
  $('#stepPrev').addEventListener('click', () => { if (step > 0) { step--; renderStep(); } });
  $('#stepNext').addEventListener('click', () => {
    if (step < STEPS.length - 1) { step++; renderStep(); } else { $('#labb').scrollIntoView(); }
  });
  renderStep();

  /* ================= Labb ================= */
  const NS = 'http://www.w3.org/2000/svg';
  const topo = $('#topo');
  const gLinks = $('#topoLinks');
  const gNodes = $('#topoNodes');
  const gPackets = $('#topoPackets');
  const rubber = $('#rubber');
  const logBox = $('#labLog');
  const W = 900, H = 460;
  const TYPE_INFO = {
    router: { prefix: 'R', name: 'Router', model: 'Cisco c7200 (Dynamips)' },
    switch: { prefix: 'SW', name: 'Switch', model: 'Ethernet switch (inbyggd)' },
    pc: { prefix: 'PC', name: 'PC', model: 'VPCS' },
  };

  let nodes, links, counters, selected, mode, pending, captures, linkSeq, busy, capNo, capT0, userNodes;

  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const byId = (id) => nodes.find((n) => n.id === id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function log(text, cls = '') {
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = text;
    logBox.appendChild(d);
    logBox.scrollTop = logBox.scrollHeight;
  }

  function addNode(type, x, y, user = false) {
    counters[type]++;
    const n = { id: TYPE_INFO[type].prefix + counters[type], type, x, y, running: false };
    if (type === 'pc') n.ip = `192.168.${counters.pc}.10`;
    if (user) userNodes.add(n.id);
    nodes.push(n);
    return n;
  }

  function addLink(a, b) {
    if (a === b) return 'Du kan inte koppla en enhet till sig själv.';
    if (links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) return 'Det finns redan en kabel mellan dessa enheter.';
    for (const id of [a, b]) {
      const n = byId(id);
      if (n.type === 'pc' && links.some((l) => l.a === id || l.b === id)) return `${id} (VPCS) har bara ett nätverkskort som redan används.`;
    }
    links.push({ id: 'L' + (++linkSeq), a, b });
    return null;
  }

  function initLab() {
    nodes = []; links = []; counters = { router: 0, switch: 0, pc: 0 };
    selected = null; mode = 'move'; pending = null; captures = new Set();
    linkSeq = 0; busy = false; capNo = 0; capT0 = performance.now(); userNodes = new Set();
    addNode('router', 330, 110); addNode('router', 590, 110);
    addNode('switch', 220, 260); addNode('switch', 700, 260);
    addNode('pc', 120, 380); addNode('pc', 320, 380); addNode('pc', 780, 380);
    [['R1', 'R2'], ['R1', 'SW1'], ['R2', 'SW2'], ['SW1', 'PC1'], ['SW1', 'PC2'], ['SW2', 'PC3']].forEach(([a, b]) => addLink(a, b));
    logBox.innerHTML = '';
    $('#captureBody').innerHTML = '';
    $$('#labChallenges li').forEach((li) => li.classList.remove('done'));
    log('GNS3-projektet “Mitt första labb” öppnat.', 'info');
    log('Alla noder är avstängda. Tryck ▶ Starta alla.', 'hint');
    setMode('move');
    updateCapturePanel();
    render();
  }

  function drawIcon(g, type) {
    if (type === 'router') {
      svgEl('circle', { r: 24, class: 'shape' }, g);
      svgEl('path', { class: 'glyph', d: 'M-12 -5 H11 M5 -10 L11 -5 L5 0 M12 5 H-11 M-5 0 L-11 5 L-5 10' }, g);
    } else if (type === 'switch') {
      svgEl('rect', { x: -28, y: -18, width: 56, height: 36, rx: 7, class: 'shape' }, g);
      svgEl('path', { class: 'glyph', d: 'M-16 -6 H15 M9 -11 L15 -6 L9 -1 M16 6 H-15 M-9 1 L-15 6 L-9 11' }, g);
    } else {
      svgEl('rect', { x: -24, y: -21, width: 48, height: 32, rx: 4, class: 'shape' }, g);
      svgEl('rect', { x: -19, y: -16, width: 38, height: 22, rx: 2, class: 'screen' }, g);
      svgEl('path', { class: 'glyph', d: 'M0 11 V17 M-9 18 H9' }, g);
    }
  }

  function render() {
    gLinks.replaceChildren();
    gNodes.replaceChildren();
    for (const l of links) {
      const a = byId(l.a), b = byId(l.b);
      const cap = captures.has(l.id);
      const g = svgEl('g', { class: 'link' + (cap ? ' capturing' : ''), 'data-id': l.id }, gLinks);
      const pos = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
      svgEl('line', { ...pos, class: 'link-line' }, g);
      svgEl('line', { ...pos, class: 'link-hit' }, g);
      const up = a.running && b.running;
      for (const [p, q] of [[a, b], [b, a]]) {
        const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
        svgEl('circle', { cx: p.x + (dx / len) * 40, cy: p.y + (dy / len) * 40, r: 5, class: 'port ' + (up ? 'up' : 'down') }, g);
      }
      if (cap) {
        const badge = svgEl('g', { class: 'cap-badge', transform: `translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})` }, g);
        svgEl('circle', { r: 11 }, badge);
        const t = svgEl('text', {}, badge); t.textContent = 'W';
      }
    }
    for (const n of nodes) {
      const cls = ['node', n.type, n.running ? 'running' : '', selected === n.id ? 'selected' : '', pending === n.id ? 'pending' : ''].join(' ');
      const g = svgEl('g', { class: cls, 'data-id': n.id, transform: `translate(${n.x} ${n.y})` }, gNodes);
      svgEl('circle', { r: 36, class: 'node-hit' }, g);
      svgEl('circle', { r: 33, class: 'halo' }, g);
      drawIcon(g, n.type);
      svgEl('circle', { cx: 24, cy: -20, r: 6, class: 'status ' + (n.running ? 'on' : 'off') }, g);
      const label = svgEl('text', { y: 44, class: 'label' }, g); label.textContent = n.id;
      if (n.ip) { const ip = svgEl('text', { y: 58, class: 'ip' }, g); ip.textContent = n.ip; }
    }
    renderPanel();
    renderPingSelects();
  }

  function renderPanel() {
    const panel = $('#nodePanel');
    const n = selected && byId(selected);
    if (!n) {
      panel.innerHTML = '<h3>Vald enhet</h3><p class="muted">Ingen enhet vald. Klicka på en router, switch eller PC.</p>';
      return;
    }
    const neigh = links.filter((l) => l.a === n.id || l.b === n.id).map((l) => (l.a === n.id ? l.b : l.a));
    panel.innerHTML = `<h3>Vald enhet: ${n.id}</h3>
      <div class="node-info">
        <dl>
          <dt>Typ</dt><dd>${TYPE_INFO[n.type].name}</dd>
          <dt>Emulator</dt><dd>${TYPE_INFO[n.type].model}</dd>
          <dt>Status</dt><dd><span class="pill ${n.running ? 'on' : 'off'}">${n.running ? 'Igång' : 'Stoppad'}</span></dd>
          ${n.ip ? `<dt>IP</dt><dd>${n.ip}/24</dd>` : ''}
          <dt>Kopplad till</dt><dd>${neigh.length ? neigh.join(', ') : '–'}</dd>
        </dl>
        <div class="actions">
          <button class="btn ${n.running ? '' : 'primary'}" data-act="toggle" type="button">${n.running ? '■ Stoppa' : '▶ Starta'}</button>
          ${n.type === 'router' ? '<button class="btn" data-act="console" type="button">⌨ Konsol</button>' : ''}
          <button class="btn" data-act="delete" type="button">🗑 Ta bort</button>
        </div>
      </div>`;
  }

  $('#nodePanel').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    const n = selected && byId(selected);
    if (!btn || !n) return;
    const act = btn.dataset.act;
    if (act === 'toggle') setRunning(n, !n.running);
    if (act === 'console') {
      $('#terminal').scrollIntoView();
      setTimeout(() => $('#termIn').focus({ preventScroll: true }), 400);
    }
    if (act === 'delete') {
      links.filter((l) => l.a === n.id || l.b === n.id).forEach((l) => captures.delete(l.id));
      links = links.filter((l) => l.a !== n.id && l.b !== n.id);
      nodes = nodes.filter((x) => x !== n);
      log(`${n.id} borttagen.`, 'info');
      selected = null;
      updateCapturePanel();
    }
    render();
  });

  function setRunning(n, on) {
    if (n.running === on) return;
    n.running = on;
    log(on ? `${n.id} startad.` : `${n.id} stoppad.`, on ? 'ok' : 'err');
  }

  function renderPingSelects() {
    const pcs = nodes.filter((n) => n.type === 'pc');
    for (const [sel, fallbackIdx] of [[$('#pingSrc'), 0], [$('#pingDst'), pcs.length - 1]]) {
      const prev = sel.value;
      sel.innerHTML = pcs.map((p) => `<option value="${p.id}">${p.id} (${p.ip})</option>`).join('');
      if (pcs.some((p) => p.id === prev)) sel.value = prev;
      else if (pcs[fallbackIdx]) sel.value = pcs[fallbackIdx].id;
    }
  }

  function setMode(m) {
    mode = m;
    pending = null;
    rubber.setAttribute('visibility', 'hidden');
    topo.classList.toggle('link-mode', m === 'link');
    $$('.tool.mode').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    $('#canvasHint').textContent = m === 'link'
      ? 'Kabelläge: klicka på första enheten, sedan på den andra.'
      : 'Klicka på en enhet för att välja den. Dra för att flytta. Klicka på en kabel för Wireshark.';
  }
  $$('.tool.mode').forEach((b) => b.addEventListener('click', () => { setMode(b.dataset.mode); render(); }));

  $$('[data-add]').forEach((b) => b.addEventListener('click', () => {
    const type = b.dataset.add;
    let x, y, tries = 0;
    do {
      x = 80 + Math.random() * (W - 160);
      y = 70 + Math.random() * (H - 150);
      tries++;
    } while (tries < 60 && nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 110));
    const n = addNode(type, Math.round(x), Math.round(y), true);
    selected = n.id;
    log(`${n.id} tillagd från template “${TYPE_INFO[type].model}”.`, 'info');
    if (mode !== 'link') log('Tips: välj 🔌 Dra kabel för att koppla in den.', 'hint');
    render();
  }));

  $('#startAll').addEventListener('click', async () => {
    const stopped = nodes.filter((n) => !n.running);
    if (!stopped.length) { log('Alla noder är redan igång.', 'info'); return; }
    log(`Startar ${stopped.length} noder…`, 'info');
    for (const n of stopped) {
      setRunning(n, true);
      render();
      await sleep(reduceMotion ? 0 : 140);
    }
  });
  $('#stopAll').addEventListener('click', () => {
    nodes.forEach((n) => setRunning(n, false));
    render();
  });
  $('#resetLab').addEventListener('click', () => { if (!busy) initLab(); });

  // Pekarhantering
  const svgPoint = (e) => {
    const pt = topo.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(topo.getScreenCTM().inverse());
  };
  let drag = null;

  gNodes.addEventListener('pointerdown', (e) => {
    const g = e.target.closest('.node');
    if (!g) return;
    e.preventDefault();
    const n = byId(g.dataset.id);
    if (mode === 'link') { handleLinkClick(n); return; }
    const p = svgPoint(e);
    drag = { n, dx: p.x - n.x, dy: p.y - n.y, moved: false };
    topo.setPointerCapture(e.pointerId);
  });

  topo.addEventListener('pointermove', (e) => {
    if (drag) {
      const p = svgPoint(e);
      const nx = clamp(p.x - drag.dx, 40, W - 40);
      const ny = clamp(p.y - drag.dy, 40, H - 70);
      if (Math.abs(nx - drag.n.x) + Math.abs(ny - drag.n.y) > 2) drag.moved = true;
      if (drag.moved) { drag.n.x = Math.round(nx); drag.n.y = Math.round(ny); render(); }
    } else if (mode === 'link' && pending) {
      const p = svgPoint(e);
      rubber.setAttribute('x2', p.x);
      rubber.setAttribute('y2', p.y);
    }
  });

  const endDrag = () => {
    if (!drag) return;
    if (!drag.moved) { selected = selected === drag.n.id ? null : drag.n.id; render(); }
    drag = null;
  };
  topo.addEventListener('pointerup', endDrag);
  topo.addEventListener('pointercancel', endDrag);

  function handleLinkClick(n) {
    if (!pending) {
      pending = n.id;
      rubber.setAttribute('x1', n.x); rubber.setAttribute('y1', n.y);
      rubber.setAttribute('x2', n.x); rubber.setAttribute('y2', n.y);
      rubber.setAttribute('visibility', 'visible');
      render();
      return;
    }
    const a = pending;
    pending = null;
    rubber.setAttribute('visibility', 'hidden');
    const err = addLink(a, n.id);
    if (err) log(err, 'err');
    else log(`Kabel kopplad: ${a} ↔ ${n.id}`, 'ok');
    render();
  }

  gLinks.addEventListener('click', (e) => {
    const g = e.target.closest('.link');
    if (!g || mode !== 'move') return;
    const l = links.find((x) => x.id === g.dataset.id);
    if (captures.has(l.id)) {
      captures.delete(l.id);
      log(`Wireshark-fångst stoppad på ${l.a}–${l.b}.`, 'info');
    } else {
      captures.add(l.id);
      log(`Wireshark-fångst startad på ${l.a}–${l.b}.`, 'info');
    }
    updateCapturePanel();
    render();
  });

  topo.addEventListener('click', (e) => {
    if (e.target.classList.contains('topo-bg')) {
      if (pending) { pending = null; rubber.setAttribute('visibility', 'hidden'); }
      selected = null;
      render();
    }
  });

  function updateCapturePanel() {
    $('#capturePanel').hidden = captures.size === 0 && !$('#captureBody').children.length;
  }
  $('#clearCapture').addEventListener('click', () => {
    $('#captureBody').innerHTML = '';
    capNo = 0;
    updateCapturePanel();
  });

  function findPath(src, dst) {
    const prev = { [src]: null };
    const queue = [src];
    while (queue.length) {
      const cur = queue.shift();
      if (cur === dst) break;
      for (const l of links) {
        const nxt = l.a === cur ? l.b : l.b === cur ? l.a : null;
        if (nxt && !(nxt in prev)) { prev[nxt] = cur; queue.push(nxt); }
      }
    }
    if (!(dst in prev)) return null;
    const path = [];
    for (let c = dst; c !== null; c = prev[c]) path.unshift(c);
    return path;
  }

  function animatePacket(ids, kind) {
    return new Promise((resolve) => {
      const pts = ids.map((id) => byId(id)).filter(Boolean).map((n) => ({ x: n.x, y: n.y }));
      if (pts.length < 2) { resolve(); return; }
      const dot = svgEl('circle', { r: 8, class: 'packet ' + kind, cx: pts[0].x, cy: pts[0].y }, gPackets);
      const total = (reduceMotion ? 60 : 300) * (pts.length - 1);
      const t0 = performance.now();
      const frame = (t) => {
        const k = Math.min((t - t0) / total, 1);
        const f = k * (pts.length - 1);
        const i = Math.min(Math.floor(f), pts.length - 2);
        const r = f - i;
        dot.setAttribute('cx', pts[i].x + (pts[i + 1].x - pts[i].x) * r);
        dot.setAttribute('cy', pts[i].y + (pts[i + 1].y - pts[i].y) * r);
        if (k < 1) requestAnimationFrame(frame);
        else { setTimeout(() => { dot.remove(); resolve(); }, kind === 'fail' ? 250 : 0); }
      };
      requestAnimationFrame(frame);
    });
  }

  function capture(path, kind, seq, src, dst) {
    const body = $('#captureBody');
    for (let i = 0; i < path.length - 1; i++) {
      const l = links.find((x) => (x.a === path[i] && x.b === path[i + 1]) || (x.b === path[i] && x.a === path[i + 1]));
      if (!l || !captures.has(l.id)) continue;
      const tr = document.createElement('tr');
      tr.className = kind;
      const time = ((performance.now() - capT0) / 1000).toFixed(6);
      const info = kind === 'req' ? `Echo (ping) request seq=${seq}` : `Echo (ping) reply seq=${seq}`;
      tr.innerHTML = `<td>${++capNo}</td><td>${time}</td><td>${l.a}–${l.b}</td><td>${src}</td><td>${dst}</td><td>ICMP</td><td>${info}</td>`;
      body.appendChild(tr);
      const wrap = body.closest('.table-scroll');
      wrap.scrollTop = wrap.scrollHeight;
      markLab('capture');
    }
    updateCapturePanel();
  }

  function markLab(key) {
    const li = $(`#labChallenges li[data-key="${key}"]`);
    if (li && !li.classList.contains('done')) {
      li.classList.add('done');
      log('✓ Utmaning klarad!', 'ok');
    }
  }

  $('#pingBtn').addEventListener('click', async () => {
    if (busy) return;
    const s = $('#pingSrc').value, d = $('#pingDst').value;
    if (!s || !d) { log('Du behöver minst två PC-noder för att pinga.', 'err'); return; }
    if (s === d) { log('Välj två olika datorer.', 'err'); return; }
    const src = byId(s), dst = byId(d);
    log(`${s}> ping ${dst.ip}`, 'cmd');
    if (!src.running) { log(`${s} är avstängd – starta den först.`, 'err'); return; }
    const path = findPath(s, d);
    if (!path) {
      log(`host (${dst.ip}) not reachable`, 'err');
      log(`Tips: det finns ingen kabelväg mellan ${s} och ${d}.`, 'hint');
      return;
    }
    const stoppedIdx = path.findIndex((id) => !byId(id).running);
    const routers = path.filter((id) => byId(id).type === 'router').length;
    const pingBtn = $('#pingBtn');
    busy = true; pingBtn.disabled = true;
    for (let seq = 1; seq <= 3; seq++) {
      if (stoppedIdx !== -1) {
        await animatePacket(path.slice(0, stoppedIdx + 1), 'fail');
        capture(path.slice(0, stoppedIdx + 1), 'req', seq, src.ip, dst.ip);
        log(`${dst.ip} icmp_seq=${seq} timeout`, 'err');
      } else {
        await animatePacket(path, 'req');
        capture(path, 'req', seq, src.ip, dst.ip);
        await animatePacket([...path].reverse(), 'rep');
        capture([...path].reverse(), 'rep', seq, dst.ip, src.ip);
        const ms = (1 + routers * 2.5 + Math.random() * 4).toFixed(3);
        log(`84 bytes from ${dst.ip} icmp_seq=${seq} ttl=${64 - routers} time=${ms} ms`, 'ok');
      }
    }
    busy = false; pingBtn.disabled = false;
    if (stoppedIdx !== -1) {
      const bad = path[stoppedIdx];
      log(`Paketen stannade vid ${bad}, som är avstängd. Starta den och försök igen.`, 'hint');
      if (byId(bad).type === 'router') markLab('fail');
    } else {
      log(`Vägen: ${path.join(' → ')}`, 'info');
      if (routers >= 2) markLab('ping');
      if (userNodes.has(s) || userNodes.has(d)) markLab('build');
    }
  });

  initLab();

  /* ================= Terminal ================= */
  const termOut = $('#termOut');
  const termIn = $('#termIn');
  const termPrompt = $('#termPrompt');
  const T = {
    mode: 'user', host: 'R1', iface: null, history: [], hIdx: 0, busy: false, arpDone: new Set(),
    ifs: {
      'GigabitEthernet0/0': { ip: null, mask: null, up: false, desc: '' },
      'GigabitEthernet0/1': { ip: null, mask: null, up: false, desc: '' },
    },
  };
  const PROMPTS = { user: '>', priv: '#', config: '(config)#', if: '(config-if)#' };
  const promptStr = () => T.host + PROMPTS[T.mode];
  const out = (text, cls = '') => {
    const d = document.createElement('div');
    d.className = 't-line ' + cls;
    d.textContent = text;
    termOut.appendChild(d);
    termOut.scrollTop = termOut.scrollHeight;
  };
  const kw = (word, full, min = 1) => !!word && word.length >= min && full.startsWith(word.toLowerCase());
  const stamp = () => {
    const d = new Date();
    const mon = d.toLocaleString('en-US', { month: 'short' });
    return `*${mon} ${String(d.getDate()).padStart(2, ' ')} ${d.toTimeString().slice(0, 8)}.${String(d.getMilliseconds()).padStart(3, '0')}:`;
  };
  const normIf = (s) => {
    const m = s.replace(/\s+/g, '').match(/^g[a-z]*(0\/[01])$/i);
    return m ? 'GigabitEthernet' + m[1] : null;
  };
  const ipToInt = (ip) => ip.split('.').reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;
  const validIp = (ip) => /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').every((o) => Number(o) <= 255);
  const validMask = (m) => {
    if (!validIp(m)) return false;
    const n = ipToInt(m);
    return n !== 0 && ((~n >>> 0) & ((~n >>> 0) + 1)) === 0;
  };
  const missionDone = (key) => {
    const li = $(`#termMissions li[data-key="${key}"]`);
    if (li) li.classList.add('done');
  };
  const invalid = () => {
    out(' '.repeat(promptStr().length) + '^', 'err');
    out("% Invalid input detected at '^' marker.", 'err');
  };

  const HELP = {
    user: ['enable              Gå till privilegierat läge', 'ping <ip>           Skicka ICMP echo', 'show version        Visa systeminformation', 'show ip int brief   Översikt av interface'],
    priv: ['configure terminal  Gå till konfigurationsläge', 'show ip int brief   Översikt av interface', 'show running-config Visa aktuell konfiguration', 'show version        Visa systeminformation', 'ping <ip>           Skicka ICMP echo', 'write memory        Spara konfigurationen', 'disable             Tillbaka till användarläge'],
    config: ['hostname <namn>     Byt namn på routern', 'interface <namn>    Konfigurera ett interface (t.ex. g0/0)', 'do <kommando>       Kör privilegierat kommando', 'end / exit          Lämna konfigurationsläget'],
    if: ['ip address <ip> <mask>  Sätt IP-adress', 'no shutdown             Aktivera interfacet', 'shutdown                Stäng av interfacet', 'description <text>      Beskrivning', 'exit / end              Lämna interfacet'],
  };

  function showCmd(args) {
    const [a, b, c] = args;
    if (kw(a, 'ip', 1) && kw(b, 'interface', 3) && kw(c, 'brief', 2)) {
      out('Interface                  IP-Address      OK? Method Status                Protocol');
      for (const [name, i] of Object.entries(T.ifs)) {
        const status = i.up ? 'up' : 'administratively down';
        out(`${name.padEnd(27)}${(i.ip || 'unassigned').padEnd(16)}YES ${(i.ip ? 'manual' : 'unset').padEnd(7)}${status.padEnd(22)}${i.up ? 'up' : 'down'}`);
      }
      if (T.ifs['GigabitEthernet0/0'].up && T.ifs['GigabitEthernet0/0'].ip) missionDone('brief');
      return true;
    }
    if (kw(a, 'running-config', 3)) {
      if (T.mode === 'user') { invalid(); return true; }
      out('Building configuration...\n\nCurrent configuration : 1024 bytes\n!\nversion 15.2\n!');
      out(`hostname ${T.host}\n!`);
      for (const [name, i] of Object.entries(T.ifs)) {
        let s = `interface ${name}\n`;
        if (i.desc) s += ` description ${i.desc}\n`;
        s += i.ip ? ` ip address ${i.ip} ${i.mask}\n` : ' no ip address\n';
        if (!i.up) s += ' shutdown\n';
        out(s + '!');
      }
      out('line con 0\n logging synchronous\n!\nend');
      return true;
    }
    if (kw(a, 'version', 1)) {
      out(`Cisco IOS Software, 7200 Software (C7200-ADVENTERPRISEK9-M), Version 15.2(4)M11\nROM: ROMMON Emulation Microcode\n${T.host} uptime is 12 minutes\ncisco 7206VXR (NPE400) processor with 491520K/32768K bytes of memory.\n2 Gigabit Ethernet interfaces\n\n(Emulerad av Dynamips i GNS3)`);
      return true;
    }
    if (!a) { out('% Incomplete command.', 'err'); return true; }
    return false;
  }

  async function pingCmd(target) {
    if (!target) { out('% Incomplete command.', 'err'); return; }
    if (!validIp(target)) { out('% Unrecognized host or address, or protocol not running.', 'err'); return; }
    out('Type escape sequence to abort.');
    out(`Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`);
    const t = ipToInt(target);
    let reachable = false, own = false;
    for (const i of Object.values(T.ifs)) {
      if (!i.up || !i.ip) continue;
      const m = ipToInt(i.mask);
      if ((ipToInt(i.ip) & m) === (t & m)) {
        reachable = true;
        if (i.ip === target) own = true;
        const host = t & (~m >>> 0);
        if (host === 0 || host === (~m >>> 0)) reachable = false;
      }
    }
    const line = document.createElement('div');
    line.className = 't-line';
    termOut.appendChild(line);
    let ok = 0;
    for (let k = 0; k < 5; k++) {
      let ch;
      if (!reachable) ch = '.';
      else if (k === 0 && !own && !T.arpDone.has(target)) ch = '.';
      else ch = '!';
      if (ch === '!') ok++;
      await sleep(reduceMotion ? 0 : ch === '.' ? 500 : 140);
      line.textContent += ch;
      termOut.scrollTop = termOut.scrollHeight;
    }
    if (reachable) T.arpDone.add(target);
    const pct = ok * 20;
    out(`Success rate is ${pct} percent (${ok}/5)${ok ? ', round-trip min/avg/max = 1/3/8 ms' : ''}`, ok ? 'ok' : 'err');
    if (ok && target === '10.0.0.2') missionDone('ping');
    if (!reachable) out('(Tips: adressen ligger inte i något aktivt, konfigurerat nät. Kontrollera ip address och no shutdown.)', 'dim');
    else if (ok < 5) out('(Den första punkten beror på ARP – routern måste först ta reda på grannens MAC-adress.)', 'dim');
  }

  async function exec(raw) {
    const line = raw.trim();
    if (!line) return;
    if (line === '?' || line.toLowerCase() === 'help') {
      HELP[T.mode].forEach((h) => out('  ' + h));
      return;
    }
    const [p0, ...rest] = line.split(/\s+/);

    // "do" i konfigurationsläge
    if ((T.mode === 'config' || T.mode === 'if') && p0.toLowerCase() === 'do') {
      const saved = T.mode; T.mode = 'priv';
      await exec(rest.join(' '));
      if (T.mode === 'priv') T.mode = saved;
      return;
    }

    if (T.mode === 'user' || T.mode === 'priv') {
      if (T.mode === 'user' && kw(p0, 'enable', 2)) { T.mode = 'priv'; missionDone('enable'); return; }
      if (kw(p0, 'show', 2)) { if (!showCmd(rest)) invalid(); return; }
      if (kw(p0, 'ping', 2)) { await pingCmd(rest[0]); return; }
      if (kw(p0, 'exit', 2) || kw(p0, 'logout', 4)) {
        T.mode = 'user';
        out(`\n${T.host} con0 is now available\n\nPress RETURN to get started.\n`, 'dim');
        return;
      }
      if (T.mode === 'priv') {
        if (kw(p0, 'configure', 4) && kw(rest[0], 'terminal', 1)) {
          T.mode = 'config';
          out('Enter configuration commands, one per line.  End with CNTL/Z.');
          missionDone('conf');
          return;
        }
        if (kw(p0, 'configure', 4)) { out('% Incomplete command. (Prova: configure terminal)', 'err'); return; }
        if (kw(p0, 'disable', 4)) { T.mode = 'user'; return; }
        if (kw(p0, 'write', 2) || (kw(p0, 'copy', 3) && kw(rest[0], 'running-config', 3))) {
          out('Building configuration...');
          await sleep(reduceMotion ? 0 : 500);
          out('[OK]', 'ok');
          return;
        }
        if (kw(p0, 'reload', 3)) { out('(Omstart är avstängd i den här demon.)', 'dim'); return; }
      }
      if (T.mode === 'user' && (kw(p0, 'configure', 4) || kw(p0, 'write', 2))) {
        invalid();
        out('(Tips: du måste först skriva enable.)', 'dim');
        return;
      }
      invalid();
      return;
    }

    if (kw(p0, 'end', 2)) { T.mode = 'priv'; T.iface = null; out(`${stamp()} %SYS-5-CONFIG_I: Configured from console by console`, 'sys'); return; }

    if (T.mode === 'config') {
      if (kw(p0, 'exit', 2)) { T.mode = 'priv'; return; }
      if (kw(p0, 'hostname', 4)) {
        if (!rest[0]) { out('% Incomplete command.', 'err'); return; }
        T.host = rest[0].slice(0, 20);
        $('.term-title').textContent = `${T.host} — telnet localhost 5000`;
        return;
      }
      if (kw(p0, 'interface', 3)) {
        const name = normIf(rest.join(''));
        if (!name) { invalid(); out('(Tillgängliga interface: g0/0 och g0/1)', 'dim'); return; }
        T.mode = 'if'; T.iface = name;
        if (name === 'GigabitEthernet0/0') missionDone('int');
        return;
      }
      if (kw(p0, 'router', 3)) { out('(Routingprotokoll stöds inte i den här demon – men fungerar i riktiga GNS3!)', 'dim'); return; }
      invalid();
      return;
    }

    if (T.mode === 'if') {
      const i = T.ifs[T.iface];
      if (kw(p0, 'exit', 2)) { T.mode = 'config'; T.iface = null; return; }
      if (kw(p0, 'interface', 3)) {
        const name = normIf(rest.join(''));
        if (!name) { invalid(); return; }
        T.iface = name;
        if (name === 'GigabitEthernet0/0') missionDone('int');
        return;
      }
      if (kw(p0, 'ip', 2) && kw(rest[0], 'address', 3)) {
        const [, ip, mask] = rest;
        if (!ip || !mask) { out('% Incomplete command.', 'err'); return; }
        if (!validIp(ip) || !validMask(mask)) { invalid(); out('(Format: ip address 10.0.0.1 255.255.255.0)', 'dim'); return; }
        const m = ipToInt(mask), host = ipToInt(ip) & (~m >>> 0);
        if (host === 0 || host === (~m >>> 0)) { out('Bad mask /' + mask + ' for address ' + ip, 'err'); return; }
        i.ip = ip; i.mask = mask;
        if (T.iface === 'GigabitEthernet0/0' && ip === '10.0.0.1' && mask === '255.255.255.0') missionDone('ip');
        return;
      }
      if (kw(p0, 'no', 2) && kw(rest[0], 'shutdown', 4)) {
        if (!i.up) {
          i.up = true;
          await sleep(reduceMotion ? 0 : 300);
          out(`${stamp()} %LINK-3-UPDOWN: Interface ${T.iface}, changed state to up`, 'sys');
          await sleep(reduceMotion ? 0 : 400);
          out(`${stamp()} %LINEPROTO-5-UPDOWN: Line protocol on Interface ${T.iface}, changed state to up`, 'sys');
        }
        if (T.iface === 'GigabitEthernet0/0') missionDone('noshut');
        return;
      }
      if (kw(p0, 'shutdown', 4)) {
        if (i.up) {
          i.up = false;
          out(`${stamp()} %LINK-5-CHANGED: Interface ${T.iface}, changed state to administratively down`, 'sys');
          out(`${stamp()} %LINEPROTO-5-UPDOWN: Line protocol on Interface ${T.iface}, changed state to down`, 'sys');
        }
        return;
      }
      if (kw(p0, 'description', 4)) { i.desc = rest.join(' ').slice(0, 60); return; }
      invalid();
    }
  }

  const syncPrompt = () => { termPrompt.textContent = promptStr(); };

  $('#termForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (T.busy) return;
    const val = termIn.value;
    termIn.value = '';
    out(promptStr() + val, 'cmd');
    if (val.trim()) { T.history.push(val); }
    T.hIdx = T.history.length;
    T.busy = true;
    termIn.disabled = true;
    try { await exec(val); } finally {
      T.busy = false;
      termIn.disabled = false;
      syncPrompt();
      termIn.focus({ preventScroll: true });
    }
  });

  termIn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (T.hIdx > 0) { T.hIdx--; termIn.value = T.history[T.hIdx]; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (T.hIdx < T.history.length - 1) { T.hIdx++; termIn.value = T.history[T.hIdx]; } else { T.hIdx = T.history.length; termIn.value = ''; }
    }
  });
  $('#termBox').addEventListener('click', (e) => {
    if (!window.getSelection().toString() && e.target.tagName !== 'INPUT') termIn.focus({ preventScroll: true });
  });

  out('Connected to Dynamips VM "R1" (ID 1, type c7200) - Console port', 'dim');
  out('Press ENTER to get the prompt.\n', 'dim');
  out('Välkommen! Skriv ? för att se tillgängliga kommandon.', 'ok');
  syncPrompt();

  /* ================= Jämförelse ================= */
  const NEEDS = {
    beginner: { col: 'pt', text: 'Packet Tracer är enklast att börja med. Gå vidare till GNS3 när du vill ha riktiga images.' },
    real: { col: ['gns3', 'eve'], text: 'Både GNS3 och EVE-NG kör äkta operativsystem.' },
    multi: { col: ['gns3', 'eve'], text: 'GNS3 och EVE-NG stödjer Cisco, Juniper, Arista, Fortinet, Linux och mycket mer.' },
    team: { col: 'eve', text: 'EVE-NG är byggt för webbläsaren och fleranvändarmiljöer. GNS3 klarar det också via fjärrserver och Web-UI.' },
    free: { col: 'gns3', text: 'GNS3 är helt gratis och öppen källkod, utan begränsningar i funktioner.' },
  };
  const compareTable = $('#compareTable');
  $$('#needChips .chip').forEach((chip) => chip.addEventListener('click', () => {
    const wasActive = chip.classList.contains('active');
    $$('#needChips .chip').forEach((c) => c.classList.remove('active'));
    $$('.hl', compareTable).forEach((c) => c.classList.remove('hl'));
    if (wasActive) { $('#needResult').textContent = ''; return; }
    chip.classList.add('active');
    const need = NEEDS[chip.dataset.need];
    const cols = [].concat(need.col);
    const heads = $$('thead th', compareTable);
    heads.forEach((th, idx) => {
      if (!cols.includes(th.dataset.col)) return;
      th.classList.add('hl');
      $$('tbody tr', compareTable).forEach((tr) => tr.children[idx].classList.add('hl'));
    });
    $('#needResult').textContent = '→ ' + need.text;
  }));

  /* ================= Installation ================= */
  $$('.tabs [role=tab]').forEach((b) => b.addEventListener('click', () => {
    $$('.tabs [role=tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $$('[data-os-panel]').forEach((p) => { p.hidden = p.dataset.osPanel !== b.dataset.os; });
  }));
  // Välj rätt OS automatiskt
  const ua = navigator.userAgent;
  const guessOs = /Mac/i.test(ua) ? 'mac' : /Linux|X11/i.test(ua) && !/Android/i.test(ua) ? 'linux' : null;
  if (guessOs) $(`.tabs [data-os="${guessOs}"]`).click();

  /* ================= Quiz ================= */
  const QUIZ = [
    { q: 'Vad står GNS3 för?', o: ['General Network System 3', 'Graphical Network Simulator-3', 'Global Node Switch 3', 'Gateway Network Service 3'], a: 1, e: 'GNS3 = Graphical Network Simulator-3. Trots namnet är det tekniskt sett en emulator.' },
    { q: 'Vad är den största skillnaden mellan GNS3 och Packet Tracer?', o: ['GNS3 kostar pengar', 'GNS3 kör riktiga operativsystem-images', 'Packet Tracer stödjer fler tillverkare', 'Det finns ingen skillnad'], a: 1, e: 'GNS3 emulerar och kör äkta images, medan Packet Tracer simulerar beteendet.' },
    { q: 'Vad rekommenderas på Windows och macOS för bäst prestanda?', o: ['Att bara använda den lokala servern', 'GNS3 VM', 'Att köra GNS3 i webbläsaren', 'Att stänga av Wireshark'], a: 1, e: 'GNS3 VM ger KVM-acceleration och stöd för IOU och Docker.' },
    { q: 'Vilket verktyg används för att fånga trafik på en länk?', o: ['PuTTY', 'Wireshark', 'Nmap', 'VirtualBox'], a: 1, e: 'Högerklicka på en kabel → Start capture så öppnas Wireshark.' },
    { q: 'Följer Cisco IOS-images med när du installerar GNS3?', o: ['Ja, alla Cisco-images ingår', 'Bara för studenter', 'Nej, du måste själv ha licensierade images', 'Ja, men bara IOSv'], a: 2, e: 'Av licensskäl ingår inga kommersiella images. Du får skaffa dem själv, t.ex. via Cisco Modeling Labs.' },
    { q: 'Vilken nod använder du för att koppla labbet till ditt riktiga nätverk?', o: ['VPCS', 'Ethernet hub', 'Cloud', 'Frame Relay switch'], a: 2, e: 'Cloud-noden binder topologin till ett nätverkskort på värddatorn. NAT-noden ger enkel internetåtkomst.' },
    { q: 'Vad betyder röda prickar vid kabeländarna i GNS3?', o: ['Kabeln är trasig', 'Noden är avstängd', 'Paket tappas', 'Wireshark är aktivt'], a: 1, e: 'Röd = noden är stoppad, grön = noden är igång.' },
  ];
  let qi = 0, score = 0, answered = false;
  const quizBox = $('#quizBox');
  function renderQuiz() {
    if (qi >= QUIZ.length) {
      const pct = Math.round((score / QUIZ.length) * 100);
      const msg = pct === 100 ? 'Perfekt! Du är redo att bygga egna labb. 🎉' : pct >= 70 ? 'Snyggt jobbat! Du har bra koll på GNS3.' : 'Bra början – läs igenom sidan igen och försök en gång till.';
      quizBox.innerHTML = `<div class="quiz-result"><p class="quiz-meta">Resultat</p><p class="score">${score}/${QUIZ.length}</p><p>${msg}</p><button class="btn primary" id="quizRestart" type="button">Gör om quizet</button></div>`;
      $('#quizRestart').addEventListener('click', () => { qi = 0; score = 0; renderQuiz(); });
      return;
    }
    const item = QUIZ[qi];
    answered = false;
    quizBox.innerHTML = `
      <div class="quiz-progress"><span style="width:${(qi / QUIZ.length) * 100}%"></span></div>
      <p class="quiz-meta">Fråga ${qi + 1} av ${QUIZ.length} · Poäng: ${score}</p>
      <h3>${esc(item.q)}</h3>
      <div class="options">${item.o.map((o, i) => `<button class="option" data-i="${i}" type="button">${esc(o)}</button>`).join('')}</div>
      <div id="quizExplain"></div>
      <div class="quiz-actions"><button class="btn primary" id="quizNext" type="button" hidden>${qi === QUIZ.length - 1 ? 'Se resultat' : 'Nästa fråga →'}</button></div>`;
    $$('.option', quizBox).forEach((btn) => btn.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const pick = Number(btn.dataset.i);
      if (pick === item.a) score++;
      $$('.option', quizBox).forEach((b, i) => {
        b.disabled = true;
        if (i === item.a) b.classList.add('correct');
        else if (i === pick) b.classList.add('wrong');
      });
      $('#quizExplain').innerHTML = `<div class="explain">${pick === item.a ? '✅ Rätt! ' : '❌ Inte riktigt. '}${esc(item.e)}</div>`;
      const next = $('#quizNext');
      next.hidden = false;
      next.focus({ preventScroll: true });
    }));
    $('#quizNext').addEventListener('click', () => { qi++; renderQuiz(); });
  }
  renderQuiz();
})();
