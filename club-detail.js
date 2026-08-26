(function(){
  'use strict';
  if (window.__PNI_CLUB_DETAIL_LOADED__) return;
  window.__PNI_CLUB_DETAIL_LOADED__ = true;

  const PANEL_ID = 'pniClubDetailPanel';
  const BACKDROP_ID = 'pniClubDetailBackdrop';
  const EMPTY = 'Pendiente de carga';
  const fmt = new Intl.NumberFormat('es-UY');

  const norm = v => String(v ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/\s+/g,' ').trim();

  const esc = v => String(v ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  const text = v => {
    if (v === null || v === undefined) return '';
    return String(v).trim();
  };

  const hasText = v => {
    const s = norm(v);
    return !!s && !['sin dato','s/d','sd','n/a','na','no disponible','pendiente de carga'].includes(s);
  };

  const num = v => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    let s = String(v).trim().replace(/\s/g,'');
    if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) s=s.replace(/\./g,'').replace(',','.');
    else if (/^-?\d+,\d+$/.test(s)) s=s.replace(',','.');
    else s=s.replace(/[^0-9.-]/g,'');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const shown = v => hasText(v) ? esc(v) : `<span class="pni-empty">${EMPTY}</span>`;
  const countShown = v => (v === 0 || num(v) || String(v).trim()==='0') ? fmt.format(num(v)) : `<span class="pni-empty">${EMPTY}</span>`;
  const metricNumber = v => num(v) > 0 ? fmt.format(Math.round(num(v))) : `<span class="pni-empty">${EMPTY}</span>`;

  function readJsonScript(id){
    try{
      const el=document.getElementById(id);
      if(!el) return [];
      const parsed=JSON.parse(el.textContent||'[]');
      return Array.isArray(parsed)?parsed:[];
    }catch(e){return [];}
  }

  function readJsonStorage(key){
    try{
      const raw=localStorage.getItem(key);
      if(!raw) return [];
      const parsed=JSON.parse(raw);
      return Array.isArray(parsed)?parsed:[];
    }catch(e){return [];}
  }

  function sources(){
    const storedData=readJsonStorage('pni_dashboard_socio_data');
    const storedContext=readJsonStorage('pni_dashboard_socio_context');
    const storedDept=readJsonStorage('pni_dashboard_socio_departments');
    return {
      data: storedData.length ? storedData : readJsonScript('embeddedData'),
      context: storedContext.length ? storedContext : readJsonScript('embeddedContext'),
      departments: storedDept.length ? storedDept : readJsonScript('embeddedDepartmentData')
    };
  }

  function tableHeaders(table){
    return [...table.querySelectorAll('thead th')].map(th=>norm(th.textContent));
  }

  function headerIndex(headers, candidates){
    for (const c of candidates){
      const nc=norm(c);
      const exact=headers.findIndex(h=>h===nc);
      if(exact>=0) return exact;
      const partial=headers.findIndex(h=>h.includes(nc));
      if(partial>=0) return partial;
    }
    return -1;
  }

  function getClubTable(row){
    const table=row.closest('table');
    if(!table) return null;
    const h=tableHeaders(table);
    return h.includes('club') && h.some(x=>x.includes('departamento')) ? table : null;
  }

  function rowSnapshot(row){
    const table=getClubTable(row);
    if(!table) return null;
    const headers=tableHeaders(table);
    const cells=[...row.children].map(td=>text(td.textContent));
    const val=(...names)=>{
      const i=headerIndex(headers,names);
      return i>=0 ? (cells[i]||'') : '';
    };
    return {
      nombre:val('Club'),
      departamento:val('Departamento'),
      ciudad:val('Localidad','Ciudad'),
      codigoINE:val('Código INE','Codigo INE'),
      liga:val('Liga'),
      estadoIluminacion:val('Iluminación','Estado de iluminación'),
      estadoProyecto:val('Proyecto','Estado del proyecto'),
      prioridad:val('Prioridad'),
      ninos:val('Niños','Ninos'),
      ninas:val('Niñas','Ninas'),
      totalJugadores:val('Total')
    };
  }

  function samePlace(a,b){
    const na=norm(a), nb=norm(b);
    return !na || !nb || na===nb;
  }

  function findRecord(snap, data){
    const club=norm(snap.nombre);
    if(!club) return null;
    let candidates=(data||[]).filter(r=>{
      const rn=norm(r.nombre), rl=norm(r.nombreLargo);
      return rn===club || rl===club;
    });
    if(!candidates.length){
      candidates=(data||[]).filter(r=>{
        const rn=norm(r.nombre), rl=norm(r.nombreLargo);
        return (rn && (rn.includes(club)||club.includes(rn))) || (rl && (rl.includes(club)||club.includes(rl)));
      });
    }
    if(candidates.length>1 && snap.departamento){
      const d=candidates.filter(r=>samePlace(r.departamento,snap.departamento));
      if(d.length) candidates=d;
    }
    if(candidates.length>1 && snap.ciudad){
      const c=candidates.filter(r=>samePlace(r.ciudad,snap.ciudad));
      if(c.length) candidates=c;
    }
    return candidates[0]||null;
  }

  function territoryKey(d,c){ return `${norm(d)}|${norm(c)}`; }

  function findContext(record, snap, context){
    const dept=record?.departamento||snap.departamento;
    const city=record?.ciudad||snap.ciudad;
    const target=territoryKey(dept,city);
    let match=(context||[]).find(c=>norm(c.claveTerritorial).replace(/\s*\|\s*/g,'|')===target);
    if(match) return match;
    match=(context||[]).find(c=>samePlace(c.departamento,dept)&&samePlace(c.localidad,city));
    return match||null;
  }

  function findDepartment(record,snap,departments){
    const dept=record?.departamento||snap.departamento;
    return (departments||[]).find(d=>norm(d.departamento)===norm(dept))||null;
  }

  function enrich(snap){
    const src=sources();
    const record=findRecord(snap,src.data)||{};
    const merged={...snap,...Object.fromEntries(Object.entries(record).filter(([,v])=>v!==''&&v!==null&&v!==undefined))};
    const context=findContext(merged,snap,src.context)||{};
    const dept=findDepartment(merged,snap,src.departments)||{};
    return {club:merged,context,dept};
  }

  function kv(label,value,wide=false){
    return `<div class="pni-kv${wide?' pni-kv-wide':''}"><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
  }

  function metric(label,value,foot=''){
    return `<div class="pni-metric"><div class="pni-metric-label">${esc(label)}</div><div class="pni-metric-value">${value}</div>${foot?`<div class="pni-metric-foot">${esc(foot)}</div>`:''}</div>`;
  }

  function indicator(label,value){
    const n=num(value);
    const has=n>0;
    const width=Math.max(0,Math.min(100,n));
    return `<div class="pni-indicator">
      <div class="pni-indicator-head"><span>${esc(label)}</span><strong>${has?n.toFixed(1).replace('.',',')+'%':'Sin dato'}</strong></div>
      <div class="pni-indicator-track"><span style="width:${has?width:0}%"></span></div>
    </div>`;
  }

  function section(id,numLabel,title,body,subtitle=''){
    return `<section class="pni-detail-section" data-pni-section="${id}">
      <div class="pni-section-head"><span class="pni-section-num">${numLabel}</span><div><h3>${esc(title)}</h3>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div></div>
      ${body}
    </section>`;
  }

  function statusPill(value){
    const s=text(value);
    if(!s) return `<span class="pni-status pni-status-muted">${EMPTY}</span>`;
    const n=norm(s);
    let cls='pni-status-neutral';
    if(/final|buena|complet/.test(n)) cls='pni-status-good';
    else if(/mala|sin red|sin ilumin/.test(n)) cls='pni-status-bad';
    else if(/regular|relev|valid|ejec|proceso/.test(n)) cls='pni-status-warn';
    return `<span class="pni-status ${cls}">${esc(s)}</span>`;
  }

  function communityPlaceholder(label){
    return kv(label,`<span class="pni-empty">${EMPTY}</span>`);
  }

  function render(data){
    const c=data.club||{}, ctx=data.context||{}, dept=data.dept||{};
    const ninos=num(c.ninos), ninas=num(c.ninas), total=num(c.totalJugadores)||(ninos+ninas);
    const female=total>0 ? (ninas/total*100) : 0;
    const pop= num(ctx.poblacion)||num(c.poblacionLocalidad);
    const pop014=num(ctx.poblacion014)||num(c.poblacion014);
    const schools=num(dept.escuelasDGEIP2025)||num(ctx.escuelasDGEIP);
    const enrollment=num(dept.matriculaDGEIP2025)||num(ctx.matriculaDGEIP);
    const depPop=num(dept.poblacion2023);
    const poverty=num(dept.pobrezaPct)||num(dept.povertyPct)||num(dept.pobreza);
    const unemployment=num(dept.desempleoPct)||num(dept.unemploymentPct)||num(dept.desempleo);

    const general = `<div class="pni-kv-grid">
      ${kv('Departamento',shown(c.departamento))}
      ${kv('Localidad',shown(c.ciudad))}
      ${kv('Liga',shown(c.liga))}
      ${kv('Código INE',shown(c.codigoINE||ctx.codigoINE2023||ctx.codigoINE))}
      ${kv('Estado de iluminación',statusPill(c.estadoIluminacion))}
      ${kv('Estado del proyecto',statusPill(c.estadoProyecto))}
      ${kv('Prioridad',statusPill(c.prioridad))}
      ${kv('Conectividad WiFi',shown(c.wifi))}
      ${kv('Avance',num(c.avance)>0?`${num(c.avance)<=1?Math.round(num(c.avance)*100):Math.round(num(c.avance))}%`:`<span class="pni-empty">${EMPTY}</span>`)}
      ${kv('Empresa / ejecutor',shown(c.empresa))}
      ${kv('Intervención prevista',shown(c.intervencion),true)}
    </div>`;

    const territorial = `<div class="pni-metrics-grid">
      ${metric('Población de la localidad',metricNumber(pop),'INE · Censo 2023')}
      ${metric('Población 0–14',metricNumber(pop014),'Localidad, cuando esté disponible')}
      ${metric('Matrícula Primaria',metricNumber(enrollment),'DGEIP 2025 · dato departamental')}
      ${metric('Escuelas públicas',metricNumber(schools),'DGEIP 2025 · dato departamental')}
      ${metric('Población departamental',metricNumber(depPop),'INE · Censo 2023')}
      ${metric('Viviendas localidad',metricNumber(num(ctx.viviendas)||num(c.viviendasLocalidad)),'INE · Censo 2023')}
    </div>
    <div class="pni-territory-grid">
      <div class="pni-soft-card">
        <h4>Indicadores territoriales</h4>
        ${indicator('Falta de internet',ctx.pctSinInternet||c.pctSinInternet)}
        ${indicator('Sin saneamiento',ctx.pctSinSaneamiento||c.pctSinSaneamiento)}
        ${indicator('Hacinamiento',ctx.pctHacinamiento||c.pctHacinamiento)}
        ${indicator('Índice de vulnerabilidad',ctx.indiceVulnerabilidad||c.indiceVulnerabilidad)}
        <div class="pni-inline-note">Nivel de vulnerabilidad: ${shown(ctx.nivelVulnerabilidad||c.nivelVulnerabilidad)}</div>
      </div>
      <div class="pni-soft-card pni-location-card">
        <h4>Localización y alcance del dato</h4>
        <div class="pni-location-pin">⌖</div>
        <strong>${esc(c.ciudad||'Localidad pendiente')}</strong>
        <span>${esc(c.departamento||'Departamento pendiente')}</span>
        <p>${hasText(ctx.alcanceDato)?esc(ctx.alcanceDato):'Visualización preparada para el cruce territorial.'}</p>
        ${hasText(ctx.estadoCruce)?`<small>${esc(ctx.estadoCruce)}</small>`:''}
      </div>
    </div>
    ${(poverty||unemployment)?`<div class="pni-dept-strip">${poverty?`<span><b>Pobreza departamental</b> ${poverty.toFixed(1).replace('.',',')}%</span>`:''}${unemployment?`<span><b>Desempleo departamental</b> ${unemployment.toFixed(1).replace('.',',')}%</span>`:''}</div>`:''}`;

    const community = `<div class="pni-kv-grid">
      ${communityPlaceholder('Año de fundación')}
      ${communityPlaceholder('Categorías / equipos')}
      ${communityPlaceholder('Días y horarios de actividad')}
      ${communityPlaceholder('Referentes / voluntarios activos')}
      ${communityPlaceholder('Vínculo con escuela / CAIF / municipio')}
      ${communityPlaceholder('Otras actividades comunitarias')}
    </div>
    <div class="pni-narrative-grid">
      <div class="pni-narrative"><label>¿Qué representa el club para esta comunidad?</label><p class="pni-empty">Campo preparado para registrar la dimensión territorial y humana del club.</p></div>
      <div class="pni-narrative"><label>Historia, referente o rasgo significativo</label><p class="pni-empty">Pendiente de relevamiento.</p></div>
    </div>`;

    const infrastructure = `<div class="pni-kv-grid">
      ${kv('Estado de iluminación',statusPill(c.estadoIluminacion))}
      ${kv('Conectividad WiFi',shown(c.wifi))}
      ${communityPlaceholder('Energía eléctrica de base')}
      ${communityPlaceholder('Baños')}
      ${communityPlaceholder('Fuente de agua')}
      ${communityPlaceholder('Efluentes / saneamiento')}
      ${communityPlaceholder('Situación del predio')}
      ${kv('Tipo de intervención',shown(c.intervencion),true)}
    </div>`;

    const impact = `<div class="pni-baseline-note">Línea de base preparada para medir antes de la intervención y volver a evaluar después.</div>
    <div class="pni-impact-list">
      <div class="pni-impact-row"><span>Horas semanales de uso de cancha</span><div><b>Antes</b><i></i><em>—</em></div><div><b>Después</b><i></i><em>—</em></div></div>
      <div class="pni-impact-row"><span>Entrenamientos suspendidos por falta de luz</span><div><b>Antes</b><i></i><em>—</em></div><div><b>Después</b><i></i><em>—</em></div></div>
      <div class="pni-impact-row"><span>Horario máximo de actividad</span><div><b>Antes</b><i></i><em>—</em></div><div><b>Después</b><i></i><em>—</em></div></div>
    </div>
    <div class="pni-metrics-grid pni-impact-metrics">
      ${metric('Participación actual de niñas',total>0?`${female.toFixed(1).replace('.',',')}%`:`<span class="pni-empty">${EMPTY}</span>`,total>0?`${fmt.format(ninas)} niñas de ${fmt.format(total)} participantes`:'')}
      ${metric('Nuevos turnos / categorías',`<span class="pni-empty">${EMPTY}</span>`,'Evaluación posterior')}
      ${metric('Nuevas actividades comunitarias',`<span class="pni-empty">${EMPTY}</span>`,'Evaluación posterior')}
    </div>`;

    const timeline = `<div class="pni-current-state">Estado actual registrado: ${statusPill(c.estadoProyecto)}</div>
      <ol class="pni-timeline">
        ${['Relevamiento inicial','Validación técnica UTE','Carga de ficha territorial','Obra finalizada','Inauguración'].map((x,i)=>`<li><span>${i+1}</span><div><strong>${x}</strong><small>Pendiente de registrar</small></div></li>`).join('')}
      </ol>`;

    return `
      <div class="pni-panel-inner">
        <header class="pni-panel-header">
          <div class="pni-panel-title-wrap">
            <div class="pni-eyebrow">Ficha del club</div>
            <h2>${esc(c.nombreLargo||c.nombre||'Club')}</h2>
            <p>${esc([c.ciudad,c.departamento].filter(Boolean).join(' · '))}</p>
          </div>
          <button class="pni-close" type="button" aria-label="Cerrar ficha">×</button>
        </header>
        <div class="pni-summary-strip">
          <div><span>Niños</span><strong>${countShown(ninos)}</strong></div>
          <div><span>Niñas</span><strong>${countShown(ninas)}</strong></div>
          <div><span>Total</span><strong>${countShown(total)}</strong></div>
          <div><span>WiFi</span><strong>${hasText(c.wifi)?esc(c.wifi):'—'}</strong></div>
        </div>
        <nav class="pni-tabs" aria-label="Secciones de la ficha">
          <button type="button" class="is-active" data-pni-tab="all">Resumen</button>
          <button type="button" data-pni-tab="territorial">Dimensión territorial</button>
          <button type="button" data-pni-tab="community">Dimensión humana</button>
          <button type="button" data-pni-tab="infrastructure">Infraestructura</button>
          <button type="button" data-pni-tab="impact">Impacto</button>
          <button type="button" data-pni-tab="registry">Registro</button>
        </nav>
        <div class="pni-panel-scroll">
          ${section('general','1','Datos generales',general)}
          ${section('territorial','2','Dimensión territorial',territorial,'Contexto sociodemográfico y educativo vinculado al territorio del club.')}
          ${section('community','3','Dimensión comunitaria y humana',community,'Campos preparados para el relevamiento cualitativo del club y su comunidad.')}
          ${section('infrastructure','4','Infraestructura y condiciones',infrastructure,'Condiciones de partida y solución prevista.')}
          ${section('impact','5','Impacto esperado / línea de base',impact,'Variables preparadas para comparar la situación antes y después de la intervención.')}
          ${section('registry','6','Registro',timeline,'Hitos del proceso para construir trazabilidad y memoria de la intervención.')}
        </div>
      </div>`;
  }

  function ensureUI(){
    let panel=document.getElementById(PANEL_ID);
    if(!panel){
      panel=document.createElement('aside');
      panel.id=PANEL_ID;
      panel.className='pni-club-panel';
      panel.setAttribute('aria-hidden','true');
      panel.setAttribute('aria-label','Ficha del club');
      document.body.appendChild(panel);
    }
    let backdrop=document.getElementById(BACKDROP_ID);
    if(!backdrop){
      backdrop=document.createElement('button');
      backdrop.id=BACKDROP_ID;
      backdrop.className='pni-club-backdrop';
      backdrop.type='button';
      backdrop.setAttribute('aria-label','Cerrar ficha del club');
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click',closePanel);
    }
    return panel;
  }

  function selectTab(panel,tab){
    panel.querySelectorAll('[data-pni-tab]').forEach(b=>b.classList.toggle('is-active',b.dataset.pniTab===tab));
    panel.querySelectorAll('.pni-detail-section').forEach(s=>{
      s.hidden = tab!=='all' && s.dataset.pniSection!==tab;
    });
    const scroll=panel.querySelector('.pni-panel-scroll');
    if(scroll) scroll.scrollTop=0;
  }

  function openPanel(snapshot){
    const panel=ensureUI();
    panel.innerHTML=render(enrich(snapshot));
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden','false');
    document.body.classList.add('pni-club-panel-open');
    document.getElementById(BACKDROP_ID)?.classList.add('is-open');
    panel.querySelector('.pni-close')?.addEventListener('click',closePanel);
    panel.querySelectorAll('[data-pni-tab]').forEach(btn=>btn.addEventListener('click',()=>selectTab(panel,btn.dataset.pniTab)));
  }

  function closePanel(){
    const panel=document.getElementById(PANEL_ID);
    if(panel){ panel.classList.remove('is-open'); panel.setAttribute('aria-hidden','true'); }
    document.getElementById(BACKDROP_ID)?.classList.remove('is-open');
    document.body.classList.remove('pni-club-panel-open');
  }

  function markClubCells(root=document){
    root.querySelectorAll('table').forEach(table=>{
      const headers=tableHeaders(table);
      const idx=headerIndex(headers,['Club']);
      if(idx<0 || !headers.some(h=>h.includes('departamento'))) return;
      table.querySelectorAll('tbody tr').forEach(row=>{
        const cell=row.children[idx];
        if(cell){
          cell.classList.add('pni-club-clickable');
          cell.setAttribute('title','Ver ficha territorial del club');
          cell.setAttribute('tabindex','0');
          cell.setAttribute('role','button');
        }
      });
    });
  }

  function rowFromTarget(target){
    const cell=target.closest('td');
    if(!cell || !cell.classList.contains('pni-club-clickable')) return null;
    return cell.closest('tr');
  }

  document.addEventListener('click',e=>{
    const row=rowFromTarget(e.target);
    if(!row) return;
    const snap=rowSnapshot(row);
    if(snap?.nombre) openPanel(snap);
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') closePanel();
    if((e.key==='Enter'||e.key===' ') && e.target?.classList?.contains('pni-club-clickable')){
      e.preventDefault();
      const row=e.target.closest('tr');
      const snap=rowSnapshot(row);
      if(snap?.nombre) openPanel(snap);
    }
  });

  const init=()=>{
    ensureUI();
    markClubCells();
    const obs=new MutationObserver(mutations=>{
      let needs=false;
      for(const m of mutations){
        if(m.addedNodes?.length){ needs=true; break; }
      }
      if(needs) markClubCells();
    });
    obs.observe(document.body,{subtree:true,childList:true});
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
