/* =========================================================
   Barbearia — protótipo de agendamento
   Os dados ficam no localStorage do navegador (banco "falso").
   O login fica no sessionStorage, então cada aba pode ter um
   usuário diferente (ex.: cliente numa aba, ADM na outra).
   ========================================================= */

const DB_KEY = 'barbearia_db_v1';
const SESSION_KEY = 'barbearia_sessao';

// Funcionamento da barbearia
const HORARIO = { abre: '09:00', fecha: '19:00', intervalo: 30, diasFechados: [0] }; // 0 = domingo
const DIAS_PARA_AGENDAR = 14;

const STATUS = {
  pending:   { texto: 'Aguardando confirmação', classe: 'st-pending' },
  confirmed: { texto: 'Confirmado',             classe: 'st-confirmed' },
  rejected:  { texto: 'Recusado',               classe: 'st-rejected' },
  cancelled: { texto: 'Cancelado',              classe: 'st-cancelled' },
};
// Pedidos que "ocupam" o horário na agenda
const ATIVOS = ['pending', 'confirmed'];

/* ---------------- Banco de dados ---------------- */

const CATALOGO_VERSAO = 2;
function catalogoServicos() {
  return [
    { id: 'caio-corte', name: 'Corte', duration: 60, price: 40, active: true },
    { id: 'caio-penteado', name: 'Penteado', duration: 60, price: 20, active: true },
    { id: 'caio-sobrancelha', name: 'Sobrancelha', duration: 30, price: 15, active: true },
    { id: 'caio-barba', name: 'Barba', duration: 30, price: 20, active: true },
    { id: 'caio-freestyle', name: 'Freestyle', duration: 60, price: 10, active: true },
  ];
}
function resumoServicos(ids) {
  const itens = ids.map(id => porId('services', id)).filter(Boolean);
  if (!itens.length) return null;
  return {
    name: itens.map(s => s.name).join(' + '),
    price: itens.reduce((total, s) => total + s.price, 0),
    duration: itens.every(s => ['barba', 'sobrancelha'].includes(s.name.toLowerCase())) ? 30 : 60,
  };
}
function resumoAgendamento(a) {
  return a.serviceSnapshot || (a.serviceIds ? resumoServicos(a.serviceIds) : porId('services', a.serviceId));
}

function dadosIniciais() {
  return {
    seq: 100,
    catalogVersion: CATALOGO_VERSAO,
    users: [
      { id: 'u1', name: 'Administrador', login: 'admin', password: 'admin123', role: 'admin', phone: '' },
      { id: 'u2', name: 'Cliente Teste', login: 'cliente', password: '123456', role: 'client', phone: '(11) 99999-0000' },
    ],
    professionals: [
      { id: 'p1', name: 'Carlos', active: true },
      { id: 'p2', name: 'Ana', active: true },
    ],
    services: catalogoServicos(),
    appointments: [],
    // Avisos para o cliente (ex.: "seu horário foi confirmado")
    notifications: [],
  };
}

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(DB_KEY));
    if (salvo && salvo.users) {
      if (salvo.catalogVersion !== CATALOGO_VERSAO) {
        salvo.appointments.forEach(a => {
          if (!a.serviceSnapshot) {
            const antigo = salvo.services.find(s => s.id === a.serviceId);
            if (antigo) a.serviceSnapshot = { name: antigo.name, price: antigo.price, duration: antigo.duration };
          }
        });
        salvo.services.forEach(s => { s.active = false; });
        catalogoServicos().forEach(serv => {
          const existente = salvo.services.find(s => s.id === serv.id);
          if (existente) Object.assign(existente, serv);
          else salvo.services.push(serv);
        });
        salvo.catalogVersion = CATALOGO_VERSAO;
        localStorage.setItem(DB_KEY, JSON.stringify(salvo));
      }
      return salvo;
    }
  } catch (e) { /* dados corrompidos: recomeça */ }
  const novo = dadosIniciais();
  localStorage.setItem(DB_KEY, JSON.stringify(novo));
  return novo;
}

let db = carregar();

function salvar() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function novoId(prefixo) {
  db.seq += 1;
  return prefixo + db.seq;
}

const porId = (lista, id) => db[lista].find(x => x.id === id);

/* ---------------- Sessão ---------------- */

function usuarioAtual() {
  const id = sessionStorage.getItem(SESSION_KEY);
  return id ? porId('users', id) : null;
}
function entrar(user) { sessionStorage.setItem(SESSION_KEY, user.id); }
function sair() { sessionStorage.removeItem(SESSION_KEY); location.hash = '#/login'; }

/* ---------------- Utilitários ---------------- */

function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const paraMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const paraHora = min => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
const dinheiro = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function dataISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const hojeISO = () => dataISO(new Date());
function dataDeISO(iso) { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); }
function dataBonita(iso) {
  return dataDeISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}
function dataCurta(iso) {
  const d = dataDeISO(iso);
  return { semana: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''), dia: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) };
}

function proximosDias() {
  const dias = [];
  const d = new Date();
  for (let i = 0; i < DIAS_PARA_AGENDAR; i++) {
    if (!HORARIO.diasFechados.includes(d.getDay())) dias.push(dataISO(d));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

// Um agendamento já passou? (usado para bloquear cancelamento)
function jaPassou(appt) {
  if (appt.date !== hojeISO()) return appt.date < hojeISO();
  const agora = new Date();
  return paraMin(appt.start) <= agora.getHours() * 60 + agora.getMinutes();
}

function ordenarAppts(lista) {
  return [...lista].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

/* ---------------- Regras de agenda ---------------- */

// Retorna todos os horários do dia com a situação de cada um
function horariosDoDia(data, profissionalId, duracao) {
  const abre = paraMin(HORARIO.abre);
  const fecha = paraMin(HORARIO.fecha);
  const agora = new Date();
  const minAgora = data === hojeISO() ? agora.getHours() * 60 + agora.getMinutes() : -1;

  const ocupados = db.appointments
    .filter(a => a.date === data && a.professionalId === profissionalId && ATIVOS.includes(a.status))
    .map(a => ({ ini: paraMin(a.start), fim: paraMin(a.start) + resumoAgendamento(a).duration }));

  const slots = [];
  for (let ini = abre; ini + duracao <= fecha; ini += HORARIO.intervalo) {
    const fim = ini + duracao;
    let situacao = 'livre';
    if (ini <= minAgora) situacao = 'passado';
    else if (ocupados.some(o => ini < o.fim && fim > o.ini)) situacao = 'ocupado';
    slots.push({ hora: paraHora(ini), situacao });
  }
  return slots;
}

function horarioDisponivel(data, profissionalId, serviceIds, hora) {
  const serv = resumoServicos(serviceIds);
  if (!serv || serviceIds.some(id => !porId('services', id)?.active)) return false;
  const slot = horariosDoDia(data, profissionalId, serv.duration).find(s => s.hora === hora);
  return slot && slot.situacao === 'livre';
}

/* ---------------- Notificações na tela ---------------- */

function toast(msg, alerta = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (alerta ? ' alert' : '');
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.frequency.value = 880;
    vol.gain.value = 0.1;
    osc.connect(vol).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) { /* sem som, tudo bem */ }
}

function avisoNavegador(titulo, corpo) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(titulo, { body: corpo });
  }
}

/* ---------------- Barra superior ---------------- */

function desenharTopo(user, rota) {
  const topo = document.getElementById('topbar');
  if (!user) { topo.classList.add('hidden'); return; }
  topo.classList.remove('hidden');

  const link = (href, texto, extra = '') =>
    `<a href="#/${href}" class="${rota === href ? 'active' : ''}">${texto}${extra}</a>`;
  const badge = n => (n > 0 ? `<span class="badge">${n}</span>` : '');

  if (user.role === 'admin') {
    const pendentes = db.appointments.filter(a => a.status === 'pending').length;
    document.title = (pendentes ? `(${pendentes}) ` : '') + 'Barbearia do Caio — ADM';
    topo.innerHTML = `
      <span class="brand">Barbearia do Caio · ADM</span>
      ${link('pedidos', 'Pedidos', badge(pendentes))}
      ${link('agenda', 'Agenda')}
      ${link('profissionais', 'Profissionais')}
      ${link('servicos', 'Serviços')}
      <button class="link" id="btn-sair">Sair</button>`;
  } else {
    const naoLidas = db.notifications.filter(n => n.userId === user.id && !n.read).length;
    document.title = (naoLidas ? `(${naoLidas}) ` : '') + 'Barbearia do Caio';
    topo.innerHTML = `
      <span class="brand">Barbearia do Caio</span>
      ${link('home', 'Início')}
      ${link('agendar', 'Agendar horário')}
      ${link('conta', 'Minha conta', badge(naoLidas))}
      <button class="link" id="btn-sair">Sair</button>`;
  }
  document.getElementById('btn-sair').onclick = sair;
}

/* =========================================================
   TELAS
   ========================================================= */

const app = document.getElementById('app');

/* ---------- Login ---------- */
function telaLogin() {
  app.innerHTML = `
    <div class="auth">
      <h1>Barbearia do Caio</h1>
      <p class="sub">Entre para agendar seu horário</p>
      <form class="card stack" id="form-login">
        <div class="field"><label for="login">Login</label><input id="login" autocomplete="username" required></div>
        <div class="field"><label for="senha">Senha</label><input id="senha" type="password" autocomplete="current-password" required></div>
        <div class="error" id="erro"></div>
        <button class="btn block">Entrar</button>
        <p style="text-align:center;margin:12px 0 0">Não tem conta? <a href="#/cadastro">Criar conta</a></p>
      </form>
    </div>`;

  document.getElementById('form-login').onsubmit = e => {
    e.preventDefault();
    const login = document.getElementById('login').value.trim().toLowerCase();
    const senha = document.getElementById('senha').value;
    const user = db.users.find(u => u.login === login && u.password === senha);
    if (!user) { document.getElementById('erro').textContent = 'Login ou senha incorretos.'; return; }
    entrar(user);
    location.hash = user.role === 'admin' ? '#/pedidos' : '#/home';
  };
}

/* ---------- Cadastro ---------- */
function telaCadastro() {
  app.innerHTML = `
    <div class="auth">
      <h1>Criar conta</h1>
      <p class="sub">Leva menos de um minuto</p>
      <form class="card stack" id="form-cad">
        <div class="field"><label for="nome">Nome</label><input id="nome" required></div>
        <div class="field"><label for="tel">Telefone</label><input id="tel" type="tel" placeholder="(11) 90000-0000" required></div>
        <div class="field"><label for="login">Login</label><input id="login" autocomplete="username" required></div>
        <div class="field"><label for="senha">Senha (mín. 6 caracteres)</label><input id="senha" type="password" minlength="6" autocomplete="new-password" required></div>
        <div class="error" id="erro"></div>
        <button class="btn block">Criar conta</button>
        <p style="text-align:center;margin:12px 0 0"><a href="#/login">Já tenho conta</a></p>
      </form>
    </div>`;

  document.getElementById('form-cad').onsubmit = e => {
    e.preventDefault();
    const login = document.getElementById('login').value.trim().toLowerCase();
    if (db.users.some(u => u.login === login)) {
      document.getElementById('erro').textContent = 'Esse login já está em uso.';
      return;
    }
    const user = {
      id: novoId('u'),
      name: document.getElementById('nome').value.trim(),
      phone: document.getElementById('tel').value.trim(),
      login,
      password: document.getElementById('senha').value,
      role: 'client',
    };
    db.users.push(user);
    salvar();
    entrar(user);
    location.hash = '#/home';
  };
}

/* ---------- Cartão de agendamento (usado em várias telas) ---------- */
function cartaoAppt(a, { paraAdmin = false } = {}) {
  const serv = resumoAgendamento(a);
  const prof = porId('professionals', a.professionalId);
  const cliente = porId('users', a.clientId);
  const st = STATUS[a.status];
  const ehHoje = a.date === hojeISO();

  let acoes = '';
  if (paraAdmin) {
    if (a.status === 'pending') {
      acoes = `<button class="btn ok small" data-acao="aceitar" data-id="${a.id}">Aceitar</button>
               <button class="btn bad small" data-acao="recusar" data-id="${a.id}">Recusar</button>`;
    } else if (a.status === 'confirmed' && !a.paid) {
      acoes = `<button class="btn secondary small" data-acao="pagar" data-id="${a.id}" ${ehHoje ? '' : 'disabled title="O pagamento só pode ser registrado no dia do atendimento"'}>Registrar pagamento</button>`;
    }
  } else if (ATIVOS.includes(a.status) && !jaPassou(a)) {
    acoes = `<button class="btn secondary small" data-acao="cancelar" data-id="${a.id}">Cancelar</button>`;
  }

  let pagamento = '';
  if (a.status === 'confirmed') {
    pagamento = a.paid
      ? '<span class="status st-paid">Pago</span>'
      : `<div class="meta">💳 Pagamento ${ehHoje ? '<strong>hoje</strong>, no local' : 'somente no dia do atendimento, no local'}</div>`;
  }

  return `
    <div class="card appt">
      <div class="info">
        <strong>${esc(serv.name)} · ${dinheiro(serv.price)}</strong>
        <div class="meta">📅 ${esc(dataBonita(a.date))} às ${a.start} (${serv.duration} min)</div>
        <div class="meta">✂ ${esc(prof.name)}${paraAdmin ? ` · 👤 ${esc(cliente.name)} ${esc(cliente.phone)}` : ''}</div>
        ${pagamento}
      </div>
      <span class="status ${st.classe}">${st.texto}</span>
      ${acoes ? `<div class="row actions">${acoes}</div>` : ''}
    </div>`;
}

// Liga os botões de ação dos cartões (aceitar, recusar, cancelar, pagar)
function ligarAcoes(user) {
  app.querySelectorAll('[data-acao]').forEach(btn => {
    btn.onclick = () => {
      const a = porId('appointments', btn.dataset.id);
      const acao = btn.dataset.acao;
      const serv = resumoAgendamento(a);
      const quando = `${dataBonita(a.date)} às ${a.start}`;

      if (acao === 'cancelar') {
        if (!confirm('Cancelar este agendamento?')) return;
        a.status = 'cancelled';
        toast('Agendamento cancelado.');
      } else if (acao === 'aceitar') {
        a.status = 'confirmed';
        notificarCliente(a.clientId, `Seu horário de ${serv.name} em ${quando} foi CONFIRMADO ✅`);
        toast('Pedido aceito. O cliente será avisado.');
      } else if (acao === 'recusar') {
        if (!confirm('Recusar este pedido? O horário ficará livre novamente.')) return;
        a.status = 'rejected';
        notificarCliente(a.clientId, `Seu pedido de ${serv.name} em ${quando} foi recusado. Escolha outro horário.`);
        toast('Pedido recusado.');
      } else if (acao === 'pagar') {
        if (a.date !== hojeISO()) return;
        a.paid = true;
        toast('Pagamento registrado.');
      }
      a.updatedAt = Date.now();
      salvar();
      render();
    };
  });
}

function notificarCliente(userId, texto) {
  db.notifications.push({ id: novoId('n'), userId, text: texto, read: false, createdAt: Date.now() });
}

/* ---------- Cliente: Início ---------- */
function telaHome(user) {
  const proximos = ordenarAppts(db.appointments.filter(a => a.clientId === user.id && ATIVOS.includes(a.status) && !jaPassou(a)));
  const servicos = db.services.filter(s => s.active);

  app.innerHTML = `
    <h1>Olá, ${esc(user.name.split(' ')[0])}!</h1>
    <p class="sub">Seu estilo, seu momento. Escolha seu próximo horário.</p>
    <a class="btn" href="#/agendar">Agendar horário</a>

    <h2>Seu próximo horário</h2>
    ${proximos.length ? cartaoAppt(proximos[0]) : '<div class="card empty">Você não tem horários marcados.</div>'}

    <h2>Nossos serviços</h2>
    <div class="grid">
      ${servicos.map(s => `
        <div class="card">
          <strong>${esc(s.name)}</strong>
          <div class="meta" style="color:var(--muted)">${s.duration} min</div>
          <div style="font-size:18px;margin-top:6px">${dinheiro(s.price)}</div>
        </div>`).join('')}
    </div>`;
  ligarAcoes(user);
}

/* ---------- Cliente: Agendar ---------- */
const escolha = { serviceIds: [], professionalId: null, date: null, start: null };

function telaAgendar(user) {
  const servicos = db.services.filter(s => s.active);
  const profs = db.professionals.filter(p => p.active);
  const dias = proximosDias();
  if (escolha.date && !dias.includes(escolha.date)) escolha.date = null;

  escolha.serviceIds = escolha.serviceIds.filter(id => servicos.some(s => s.id === id));
  const serv = resumoServicos(escolha.serviceIds);
  const prof = escolha.professionalId && porId('professionals', escolha.professionalId);

  let blocoHorarios = '<p class="sub">Escolha serviço, profissional e dia para ver os horários.</p>';
  if (serv && prof && escolha.date) {
    const slots = horariosDoDia(escolha.date, prof.id, serv.duration);
    if (escolha.start && !slots.some(s => s.hora === escolha.start && s.situacao === 'livre')) escolha.start = null;
    blocoHorarios = `
      <div class="choices">
        ${slots.map(s => `
          <button type="button" class="choice slot ${s.situacao === 'ocupado' ? 'busy' : ''} ${s.situacao === 'passado' ? 'past' : ''} ${escolha.start === s.hora ? 'selected' : ''}"
            data-campo="start" data-valor="${s.hora}" ${s.situacao !== 'livre' ? 'disabled' : ''}>
            ${s.hora}${s.situacao === 'ocupado' ? '<small>Ocupado</small>' : ''}
          </button>`).join('')}
      </div>
      <div class="legend"><span class="l-free">Livre</span><span class="l-busy">Ocupado por outro cliente</span><span class="l-past">Indisponível</span></div>`;
  }

  const pronto = serv && prof && escolha.date && escolha.start;

  app.innerHTML = `
    <h1>Agendar horário</h1>
    <p class="sub">O pagamento é feito no dia do atendimento, direto na barbearia.</p>

    <h2>1. Serviços</h2>
    <p class="sub">Escolha um ou mais. Somente barba e/ou sobrancelha: 30 min. Com qualquer outro serviço: 1 hora.</p>
    <div class="choices">
      ${servicos.map(s => `
        <button type="button" class="choice ${escolha.serviceIds.includes(s.id) ? 'selected' : ''}" aria-pressed="${escolha.serviceIds.includes(s.id)}" data-campo="serviceIds" data-valor="${s.id}">
          ${esc(s.name)}<small>${s.duration} min · ${dinheiro(s.price)}</small>
        </button>`).join('')}
    </div>

    <h2>2. Profissional</h2>
    <div class="choices">
      ${profs.length ? profs.map(p => `
        <button type="button" class="choice ${escolha.professionalId === p.id ? 'selected' : ''}" data-campo="professionalId" data-valor="${p.id}">
          ✂ ${esc(p.name)}
        </button>`).join('') : '<p class="sub">Nenhum profissional disponível no momento.</p>'}
    </div>

    <h2>3. Dia</h2>
    <div class="choices">
      ${dias.map(d => { const c = dataCurta(d); return `
        <button type="button" class="choice ${escolha.date === d ? 'selected' : ''}" data-campo="date" data-valor="${d}" style="text-align:center">
          <small>${d === hojeISO() ? 'hoje' : c.semana}</small>${c.dia}
        </button>`; }).join('')}
    </div>

    <h2>4. Horário</h2>
    ${blocoHorarios}

    <h2>Resumo</h2>
    <div class="card summary stack">
      ${pronto
        ? `<div><strong>${esc(serv.name)}</strong> com <strong>${esc(prof.name)}</strong></div>
           <div>${esc(dataBonita(escolha.date))} às <strong>${escolha.start}</strong> · ${serv.duration} min</div>
           <div>Valor: <strong>${dinheiro(serv.price)}</strong> — pago no dia, no local</div>`
        : '<div class="sub" style="margin:0">Complete as etapas acima.</div>'}
      <button class="btn" id="btn-confirmar" ${pronto ? '' : 'disabled'}>Enviar pedido</button>
    </div>`;

  app.querySelectorAll('[data-campo]').forEach(btn => {
    btn.onclick = () => {
      if (btn.dataset.campo === 'serviceIds') {
        const id = btn.dataset.valor;
        escolha.serviceIds = escolha.serviceIds.includes(id) ? escolha.serviceIds.filter(x => x !== id) : [...escolha.serviceIds, id];
      } else escolha[btn.dataset.campo] = btn.dataset.valor;
      if (btn.dataset.campo !== 'start') escolha.start = null;
      telaAgendar(user);
    };
  });

  document.getElementById('btn-confirmar').onclick = () => {
    db = carregar(); // pega a versão mais recente (outro cliente pode ter marcado)
    if (!horarioDisponivel(escolha.date, escolha.professionalId, escolha.serviceIds, escolha.start)) {
      toast('Ops! Esse horário acabou de ser ocupado. Escolha outro.', true);
      escolha.start = null;
      telaAgendar(user);
      return;
    }
    db.appointments.push({
      id: novoId('a'),
      clientId: user.id,
      professionalId: escolha.professionalId,
      serviceIds: [...escolha.serviceIds],
      serviceSnapshot: resumoServicos(escolha.serviceIds),
      date: escolha.date,
      start: escolha.start,
      status: 'pending',
      paid: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    salvar();
    Object.assign(escolha, { serviceIds: [], professionalId: null, date: null, start: null });
    toast('Pedido enviado! Você será avisado quando o barbeiro responder.');
    location.hash = '#/conta';
  };
}

/* ---------- Cliente: Minha conta ---------- */
function telaConta(user) {
  const meus = db.appointments.filter(a => a.clientId === user.id);
  const futuros = ordenarAppts(meus.filter(a => !jaPassou(a) && a.status !== 'cancelled'));
  const historico = ordenarAppts(meus.filter(a => jaPassou(a) || a.status === 'cancelled')).reverse();
  const avisos = db.notifications.filter(n => n.userId === user.id).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  app.innerHTML = `
    <h1>Minha conta</h1>
    <p class="sub">${esc(user.name)} · ${esc(user.phone)} · login: ${esc(user.login)}</p>
    <a class="btn" href="#/agendar">Agendar horário</a>

    ${avisos.length ? `
      <h2>Avisos</h2>
      <div class="stack">
        ${avisos.map(n => `<div class="card" style="${n.read ? '' : 'border-color:var(--primary)'}">${n.read ? '' : '🔔 '}${esc(n.text)}</div>`).join('')}
      </div>` : ''}

    <h2>Próximos agendamentos</h2>
    <div class="stack">${futuros.length ? futuros.map(a => cartaoAppt(a)).join('') : '<div class="card empty">Nenhum agendamento futuro.</div>'}</div>

    <h2>Histórico</h2>
    <div class="stack">${historico.length ? historico.map(a => cartaoAppt(a)).join('') : '<div class="card empty">Nada por aqui ainda.</div>'}</div>`;

  // Marca os avisos como lidos depois de exibir
  let mudou = false;
  db.notifications.forEach(n => { if (n.userId === user.id && !n.read) { n.read = true; mudou = true; } });
  if (mudou) { salvar(); desenharTopo(user, 'conta'); }
  ligarAcoes(user);
}

/* ---------- ADM: Pedidos ---------- */
function telaPedidos(user) {
  const pendentes = ordenarAppts(db.appointments.filter(a => a.status === 'pending'));
  const recentes = db.appointments.filter(a => a.status !== 'pending').sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
  const podeAvisar = 'Notification' in window && Notification.permission === 'default';

  app.innerHTML = `
    <h1>Pedidos</h1>
    <p class="sub">Aceite ou recuse os pedidos de agendamento. Novos pedidos aparecem aqui automaticamente.</p>
    ${podeAvisar ? '<button class="btn secondary small" id="btn-avisos">🔔 Ativar avisos do navegador</button>' : ''}

    <h2>Aguardando sua resposta (${pendentes.length})</h2>
    <div class="stack">${pendentes.length ? pendentes.map(a => cartaoAppt(a, { paraAdmin: true })).join('') : '<div class="card empty">Nenhum pedido pendente. 🎉</div>'}</div>

    <h2>Respondidos recentemente</h2>
    <div class="stack">${recentes.length ? recentes.map(a => cartaoAppt(a, { paraAdmin: true })).join('') : '<div class="card empty">Nada ainda.</div>'}</div>`;

  const btnAvisos = document.getElementById('btn-avisos');
  if (btnAvisos) btnAvisos.onclick = () => Notification.requestPermission().then(() => render());
  ligarAcoes(user);
}

/* ---------- ADM: Agenda do dia ---------- */
let agendaData = null;
let agendaProf = 'todos';

function telaAgenda(user) {
  agendaData = agendaData || hojeISO();
  const profs = db.professionals;
  const doDia = ordenarAppts(db.appointments.filter(a =>
    a.date === agendaData && ATIVOS.includes(a.status) && (agendaProf === 'todos' || a.professionalId === agendaProf)));

  app.innerHTML = `
    <h1>Agenda</h1>
    <p class="sub">${esc(dataBonita(agendaData))}</p>
    <div class="row">
      <div class="grow"><label for="ag-data">Dia</label><input type="date" id="ag-data" value="${agendaData}"></div>
      <div class="grow"><label for="ag-prof">Profissional</label>
        <select id="ag-prof">
          <option value="todos">Todos</option>
          ${profs.map(p => `<option value="${p.id}" ${agendaProf === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <h2>Atendimentos (${doDia.length})</h2>
    <div class="stack">${doDia.length ? doDia.map(a => cartaoAppt(a, { paraAdmin: true })).join('') : '<div class="card empty">Nenhum atendimento neste dia.</div>'}</div>`;

  document.getElementById('ag-data').onchange = e => { agendaData = e.target.value || hojeISO(); render(); };
  document.getElementById('ag-prof').onchange = e => { agendaProf = e.target.value; render(); };
  ligarAcoes(user);
}

/* ---------- ADM: Profissionais ---------- */
function telaProfissionais() {
  app.innerHTML = `
    <h1>Profissionais</h1>
    <p class="sub">Os clientes escolhem entre os profissionais ativos.</p>
    <form class="card row" id="form-prof">
      <div class="grow"><label for="prof-nome">Novo profissional</label><input id="prof-nome" placeholder="Nome" required></div>
      <button class="btn" style="align-self:flex-end">Adicionar</button>
    </form>
    <h2>Equipe</h2>
    <div class="card">
      <table class="table">
        <thead><tr><th>Nome</th><th>Situação</th><th></th></tr></thead>
        <tbody>
          ${db.professionals.map(p => `
            <tr>
              <td>${esc(p.name)}</td>
              <td><span class="status ${p.active ? 'st-confirmed' : 'st-cancelled'}">${p.active ? 'Ativo' : 'Inativo'}</span></td>
              <td style="text-align:right"><button class="btn secondary small" data-toggle="${p.id}">${p.active ? 'Desativar' : 'Ativar'}</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  document.getElementById('form-prof').onsubmit = e => {
    e.preventDefault();
    const nome = document.getElementById('prof-nome').value.trim();
    if (!nome) return;
    db.professionals.push({ id: novoId('p'), name: nome, active: true });
    salvar();
    toast(`${nome} foi adicionado(a) à equipe.`);
    render();
  };
  app.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.onclick = () => {
      const p = porId('professionals', btn.dataset.toggle);
      p.active = !p.active;
      salvar();
      render();
    };
  });
}

/* ---------- ADM: Serviços ---------- */
function telaServicos() {
  app.innerHTML = `
    <h1>Serviços</h1>
    <p class="sub">Defina o que a barbearia oferece, quanto tempo leva e o preço.</p>
    <form class="card row" id="form-serv">
      <div class="grow"><label for="sv-nome">Serviço</label><input id="sv-nome" placeholder="Ex.: Pigmentação" required></div>
      <div style="width:130px"><label for="sv-dur">Duração</label>
        <select id="sv-dur">${[30, 60, 90, 120].map(m => `<option value="${m}">${m} min</option>`).join('')}</select>
      </div>
      <div style="width:130px"><label for="sv-preco">Preço (R$)</label><input id="sv-preco" type="number" min="0" step="0.01" required></div>
      <button class="btn" style="align-self:flex-end">Adicionar</button>
    </form>
    <h2>Lista de serviços</h2>
    <div class="card">
      <table class="table">
        <thead><tr><th>Serviço</th><th>Duração</th><th>Preço</th><th></th></tr></thead>
        <tbody>
          ${db.services.map(s => `
            <tr style="${s.active ? '' : 'opacity:.5'}">
              <td>${esc(s.name)}</td><td>${s.duration} min</td><td>${dinheiro(s.price)}</td>
              <td style="text-align:right"><button class="btn secondary small" data-toggle="${s.id}">${s.active ? 'Desativar' : 'Ativar'}</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  document.getElementById('form-serv').onsubmit = e => {
    e.preventDefault();
    db.services.push({
      id: novoId('s'),
      name: document.getElementById('sv-nome').value.trim(),
      duration: Number(document.getElementById('sv-dur').value),
      price: Number(document.getElementById('sv-preco').value),
      active: true,
    });
    salvar();
    render();
  };
  app.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.onclick = () => {
      const s = porId('services', btn.dataset.toggle);
      s.active = !s.active;
      salvar();
      render();
    };
  });
}

/* =========================================================
   Rotas
   ========================================================= */

const ROTAS_CLIENTE = { home: telaHome, agendar: telaAgendar, conta: telaConta };
const ROTAS_ADMIN = { pedidos: telaPedidos, agenda: telaAgenda, profissionais: telaProfissionais, servicos: telaServicos };

function render() {
  const user = usuarioAtual();
  let rota = location.hash.replace('#/', '') || '';

  if (!user) {
    desenharTopo(null);
    if (rota === 'cadastro') return telaCadastro();
    if (rota !== 'login') { location.hash = '#/login'; return; }
    return telaLogin();
  }

  const rotas = user.role === 'admin' ? ROTAS_ADMIN : ROTAS_CLIENTE;
  if (!rotas[rota]) {
    location.hash = user.role === 'admin' ? '#/pedidos' : '#/home';
    return;
  }
  desenharTopo(user, rota);
  rotas[rota](user);
}

// Toca a animação de entrada só quando muda de página
// (e não a cada clique dentro da mesma tela)
let timerEntrada;
function animarEntrada() {
  app.classList.remove('entrando');
  void app.offsetWidth; // reinicia a animação
  app.classList.add('entrando');
  clearTimeout(timerEntrada);
  timerEntrada = setTimeout(() => app.classList.remove('entrando'), 1200);
}

window.addEventListener('hashchange', () => { animarEntrada(); render(); });

/* Quando outra aba muda os dados (ex.: cliente faz um pedido),
   esta aba é avisada. É assim que o ADM recebe o aviso na hora. */
window.addEventListener('storage', e => {
  if (e.key !== DB_KEY) return;
  const antes = db;
  db = carregar();
  const user = usuarioAtual();
  if (!user) return;

  if (user.role === 'admin') {
    const idsAntes = new Set(antes.appointments.map(a => a.id));
    db.appointments
      .filter(a => !idsAntes.has(a.id) && a.status === 'pending')
      .forEach(a => {
        const cli = porId('users', a.clientId);
        const serv = resumoAgendamento(a);
        const msg = `${cli.name} pediu ${serv.name} em ${dataBonita(a.date)} às ${a.start}`;
        toast('🔔 Novo pedido! ' + msg, true);
        avisoNavegador('Novo pedido de agendamento', msg);
        bip();
      });
  } else {
    const idsAntes = new Set(antes.notifications.map(n => n.id));
    db.notifications
      .filter(n => n.userId === user.id && !idsAntes.has(n.id))
      .forEach(n => toast('🔔 ' + n.text, true));
  }

  // Redesenha a tela; na tela de agendar, as escolhas do cliente são mantidas
  render();
});

animarEntrada();
render();

