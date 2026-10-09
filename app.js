/* =========================================================
   Barbearia do Caio — agendamento
   Os dados ficam no Supabase (banco de dados online), então
   clientes e ADM veem a mesma agenda em qualquer aparelho.
   As regras de segurança estão em supabase/schema.sql.
   ========================================================= */

// Funcionamento da barbearia (o banco confere as mesmas regras)
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

/* ---------------- Conexão com o Supabase ---------------- */

const cfg = window.BARBEARIA_CONFIG || {};
const configurado = Boolean(cfg.supabaseUrl && cfg.supabaseKey && !cfg.supabaseUrl.startsWith('COLE'));
const sb = configurado ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;

// Usuário logado: { id, email, name, phone, role } ou null
let sessao = null;
// Cópia local dos dados que o usuário pode ver
let db = { professionals: [], services: [], appointments: [], notifications: [] };
// Horários ocupados por dia (de todos os clientes, sem nomes): { '2026-10-09': [...] }
let ocupadosPorDia = {};

const porId = (lista, id) => db[lista].find(x => x.id === id);

// Converte as linhas do banco para o formato usado nas telas
function linhaParaAgendamento(r) {
  return {
    id: r.id,
    clientId: r.client_id,
    professionalId: r.professional_id,
    serviceIds: r.service_ids,
    service: { name: r.service_name, price: Number(r.price), duration: r.duration },
    date: r.date,
    start: r.start_time.slice(0, 5),
    status: r.status,
    paid: r.paid,
    updatedAt: r.updated_at,
    cliente: r.cliente || null, // só o ADM recebe nome e telefone
  };
}

async function carregarDados() {
  const ehAdmin = sessao.role === 'admin';
  const desde = new Date();
  desde.setDate(desde.getDate() - 60);

  const [profs, servs, appts, avisos] = await Promise.all([
    sb.from('professionals').select('*').order('created_at'),
    sb.from('services').select('*').order('created_at'),
    ehAdmin
      ? sb.from('appointments').select('*, cliente:profiles(name, phone)').gte('date', dataISO(desde))
      : sb.from('appointments').select('*').eq('client_id', sessao.id),
    ehAdmin
      ? Promise.resolve({ data: [] })
      : sb.from('notifications').select('*').eq('user_id', sessao.id).order('created_at', { ascending: false }).limit(20),
  ]);
  for (const r of [profs, servs, appts, avisos]) if (r.error) throw r.error;

  db.professionals = profs.data;
  db.services = servs.data.map(s => ({ ...s, price: Number(s.price) }));
  db.appointments = appts.data.map(linhaParaAgendamento);
  db.notifications = avisos.data;
}

async function buscarOcupados(data) {
  const { data: linhas, error } = await sb.rpc('horarios_ocupados', { p_data: data });
  if (error) throw error;
  ocupadosPorDia[data] = linhas.map(o => ({
    professionalId: o.professional_id,
    ini: paraMin(o.start_time.slice(0, 5)),
    fim: paraMin(o.end_time.slice(0, 5)),
  }));
}

/* ---------------- Sessão ---------------- */

async function iniciarSessao() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { sessao = null; return; }

  const { data: perfil, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if (error) throw error;
  sessao = { id: perfil.id, email: session.user.email, name: perfil.name, phone: perfil.phone, role: perfil.role };
  await carregarDados();
  assinarTempoReal();
}

async function sair() {
  if (canal) { sb.removeChannel(canal); canal = null; }
  await sb.auth.signOut();
  sessao = null;
  db = { professionals: [], services: [], appointments: [], notifications: [] };
  ocupadosPorDia = {};
  location.hash = '#/login';
  render();
}

// Traduz os erros mais comuns para o cliente
function mensagemDeErro(error) {
  const msg = error?.message || String(error);
  if (error?.code === '23P01') return 'Ops! Esse horário acabou de ser ocupado. Escolha outro.';
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(msg)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (/already registered|already been registered/i.test(msg)) return 'Esse e-mail já tem uma conta. Faça login.';
  if (/password should be at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate limit|too many/i.test(msg)) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  if (/failed to fetch|network/i.test(msg)) return 'Sem conexão com o servidor. Verifique sua internet.';
  return msg;
}

/* ---------------- Utilitários ---------------- */

function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const paraMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const paraHora = min => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
const dinheiro = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

// Vários serviços juntos: soma o preço; a duração é a do serviço mais longo
// (só barba e/ou sobrancelha = 30 min; com qualquer outro = 1 hora)
function resumoServicos(ids) {
  const itens = ids.map(id => porId('services', id)).filter(Boolean);
  if (!itens.length) return null;
  return {
    name: itens.map(s => s.name).join(' + '),
    price: itens.reduce((total, s) => total + s.price, 0),
    duration: Math.max(...itens.map(s => s.duration)),
  };
}

// Retorna todos os horários do dia com a situação de cada um
function horariosDoDia(data, profissionalId, duracao) {
  const abre = paraMin(HORARIO.abre);
  const fecha = paraMin(HORARIO.fecha);
  const agora = new Date();
  const minAgora = data === hojeISO() ? agora.getHours() * 60 + agora.getMinutes() : -1;
  const ocupados = (ocupadosPorDia[data] || []).filter(o => o.professionalId === profissionalId);

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

/* ---------------- Tempo real ---------------- */

let canal = null;

function assinarTempoReal() {
  if (canal) sb.removeChannel(canal);
  canal = sb.channel('barbearia-' + sessao.id);

  if (sessao.role === 'admin') {
    // O ADM fica sabendo na hora de pedidos novos e cancelamentos
    canal.on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, async payload => {
      await recarregarEmSegundoPlano();
      if (payload.eventType === 'INSERT') {
        const a = porId('appointments', payload.new.id);
        if (!a) return;
        const msg = `${a.cliente?.name || 'Cliente'} pediu ${a.service.name} em ${dataBonita(a.date)} às ${a.start}`;
        toast('🔔 Novo pedido! ' + msg, true);
        avisoNavegador('Novo pedido de agendamento', msg);
        bip();
      }
    });
  } else {
    // O cliente recebe na hora o aviso de confirmado/recusado
    canal.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${sessao.id}` }, async payload => {
      toast('🔔 ' + payload.new.text, true);
      bip();
      await recarregarEmSegundoPlano();
    });
  }
  canal.subscribe();
}

// Atualiza os dados sem atrapalhar quem está digitando num formulário
async function recarregarEmSegundoPlano() {
  try {
    await carregarDados();
  } catch (e) {
    return;
  }
  const rota = rotaAtual();
  if (['pedidos', 'agenda', 'home', 'conta'].includes(rota)) render();
  else desenharTopo(sessao, rota);
}

/* ---------------- Barra superior ---------------- */

function desenharTopo(user, rota) {
  const topo = document.getElementById('topbar');
  if (!user) { topo.classList.add('hidden'); document.title = 'Barbearia do Caio'; return; }
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
    const naoLidas = db.notifications.filter(n => !n.read).length;
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

// Desliga o botão enquanto espera o servidor responder
async function comBotaoOcupado(btn, tarefa) {
  const texto = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Aguarde…';
  try {
    return await tarefa();
  } finally {
    if (btn.isConnected) { btn.disabled = false; btn.textContent = texto; }
  }
}

/* ---------- Aviso de configuração / carregando / erro ---------- */
function telaSemConfiguracao() {
  app.innerHTML = `
    <div class="auth">
      <h1>Barbearia do Caio</h1>
      <div class="card stack">
        <strong>Falta ligar o site ao banco de dados.</strong>
        <p class="sub" style="margin:0">Preencha o arquivo <code>config.js</code> com a Project URL e a chave publishable do Supabase.</p>
      </div>
    </div>`;
}

function telaCarregando() {
  app.innerHTML = '<div class="empty">Carregando…</div>';
}

function telaErro(error) {
  app.innerHTML = `
    <div class="auth">
      <div class="card stack">
        <strong>Não foi possível carregar a barbearia.</strong>
        <p class="sub" style="margin:0">${esc(mensagemDeErro(error))}</p>
        <div class="row">
          <button class="btn" onclick="location.reload()">Tentar de novo</button>
          <button class="btn secondary" id="btn-erro-sair">Sair da conta</button>
        </div>
      </div>
    </div>`;
  document.getElementById('btn-erro-sair').onclick = sair;
}

/* ---------- Login ---------- */
function telaLogin() {
  app.innerHTML = `
    <div class="auth">
      <h1>Barbearia do Caio</h1>
      <p class="sub">Entre para agendar seu horário</p>
      <form class="card stack" id="form-login">
        <div class="field"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="senha">Senha</label><input id="senha" type="password" autocomplete="current-password" required></div>
        <div class="error" id="erro"></div>
        <button class="btn block">Entrar</button>
        <p style="text-align:center;margin:12px 0 0">Não tem conta? <a href="#/cadastro">Criar conta</a></p>
      </form>
    </div>`;

  const form = document.getElementById('form-login');
  form.onsubmit = async e => {
    e.preventDefault();
    const erro = document.getElementById('erro');
    erro.textContent = '';
    await comBotaoOcupado(form.querySelector('button'), async () => {
      const { error } = await sb.auth.signInWithPassword({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('senha').value,
      });
      if (error) { erro.textContent = mensagemDeErro(error); return; }
      try {
        await iniciarSessao();
      } catch (err) {
        erro.textContent = mensagemDeErro(err);
        return;
      }
      location.hash = sessao.role === 'admin' ? '#/pedidos' : '#/home';
    });
  };
}

/* ---------- Cadastro ---------- */
function telaCadastro() {
  app.innerHTML = `
    <div class="auth">
      <h1>Criar conta</h1>
      <p class="sub">Leva menos de um minuto</p>
      <form class="card stack" id="form-cad">
        <div class="field"><label for="nome">Nome</label><input id="nome" autocomplete="name" required></div>
        <div class="field"><label for="tel">Telefone</label><input id="tel" type="tel" autocomplete="tel" placeholder="(11) 90000-0000" required></div>
        <div class="field"><label for="email">E-mail</label><input id="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="senha">Senha (mín. 6 caracteres)</label><input id="senha" type="password" minlength="6" autocomplete="new-password" required></div>
        <div class="error" id="erro"></div>
        <button class="btn block">Criar conta</button>
        <p style="text-align:center;margin:12px 0 0"><a href="#/login">Já tenho conta</a></p>
      </form>
    </div>`;

  const form = document.getElementById('form-cad');
  form.onsubmit = async e => {
    e.preventDefault();
    const erro = document.getElementById('erro');
    erro.textContent = '';
    await comBotaoOcupado(form.querySelector('button'), async () => {
      const { data, error } = await sb.auth.signUp({
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('senha').value,
        options: {
          data: {
            name: document.getElementById('nome').value.trim(),
            phone: document.getElementById('tel').value.trim(),
          },
          emailRedirectTo: location.origin + location.pathname,
        },
      });
      if (error) { erro.textContent = mensagemDeErro(error); return; }

      // Se o Supabase exigir confirmação de e-mail, ainda não há sessão
      if (!data.session) {
        app.innerHTML = `
          <div class="auth">
            <div class="card stack">
              <strong>Quase lá! 📩</strong>
              <p style="margin:0">Enviamos um link de confirmação para <strong>${esc(data.user?.email || '')}</strong>. Abra seu e-mail, confirme e depois faça login.</p>
              <a class="btn block" href="#/login" style="text-align:center">Ir para o login</a>
            </div>
          </div>`;
        return;
      }
      try {
        await iniciarSessao();
      } catch (err) {
        erro.textContent = mensagemDeErro(err);
        return;
      }
      location.hash = '#/home';
    });
  };
}

/* ---------- Cartão de agendamento (usado em várias telas) ---------- */
function cartaoAppt(a, { paraAdmin = false } = {}) {
  const serv = a.service;
  const prof = porId('professionals', a.professionalId);
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

  const cliente = a.cliente ? ` · 👤 ${esc(a.cliente.name)} ${esc(a.cliente.phone)}` : '';
  const fim = paraHora(paraMin(a.start) + serv.duration);

  return `
    <div class="card appt">
      <div class="info">
        <strong>${esc(serv.name)} · ${dinheiro(serv.price)}</strong>
        <div class="meta">📅 ${esc(dataBonita(a.date))} · ${a.start} às ${fim} (${serv.duration} min)</div>
        <div class="meta">✂ ${esc(prof?.name || '—')}${paraAdmin ? cliente : ''}</div>
        ${pagamento}
      </div>
      <span class="status ${st.classe}">${st.texto}</span>
      ${acoes ? `<div class="row actions">${acoes}</div>` : ''}
    </div>`;
}

// Liga os botões de ação dos cartões (aceitar, recusar, cancelar, pagar)
function ligarAcoes() {
  app.querySelectorAll('[data-acao]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const acao = btn.dataset.acao;

      if (acao === 'cancelar' && !confirm('Cancelar este agendamento?')) return;
      if (acao === 'recusar' && !confirm('Recusar este pedido? O horário ficará livre novamente.')) return;

      const chamadas = {
        cancelar: () => sb.rpc('cancelar_agendamento', { p_id: id }),
        aceitar:  () => sb.rpc('responder_pedido', { p_id: id, p_aceitar: true }),
        recusar:  () => sb.rpc('responder_pedido', { p_id: id, p_aceitar: false }),
        pagar:    () => sb.rpc('registrar_pagamento', { p_id: id }),
      };
      const mensagens = {
        cancelar: 'Agendamento cancelado.',
        aceitar: 'Pedido aceito. O cliente será avisado.',
        recusar: 'Pedido recusado.',
        pagar: 'Pagamento registrado.',
      };

      await comBotaoOcupado(btn, async () => {
        const { error } = await chamadas[acao]();
        if (error) { toast(mensagemDeErro(error), true); return; }
        toast(mensagens[acao]);
        ocupadosPorDia = {};
        await carregarDados();
        render();
      });
    };
  });
}

/* ---------- Cliente: Início ---------- */
function telaHome(user) {
  const proximos = ordenarAppts(db.appointments.filter(a => ATIVOS.includes(a.status) && !jaPassou(a)));
  const servicos = db.services.filter(s => s.active);

  app.innerHTML = `
    <h1>Olá, ${esc((user.name || 'cliente').split(' ')[0])}!</h1>
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
  ligarAcoes();
}

/* ---------- Cliente: Agendar ---------- */
const escolha = { serviceIds: [], professionalId: null, date: null, start: null };

function telaAgendar(user) {
  const servicos = db.services.filter(s => s.active);
  const profs = db.professionals.filter(p => p.active);
  const dias = proximosDias();
  if (escolha.date && !dias.includes(escolha.date)) escolha.date = null;
  if (escolha.professionalId && !profs.some(p => p.id === escolha.professionalId)) escolha.professionalId = null;

  escolha.serviceIds = escolha.serviceIds.filter(id => servicos.some(s => s.id === id));
  const serv = resumoServicos(escolha.serviceIds);
  const prof = escolha.professionalId && porId('professionals', escolha.professionalId);

  let blocoHorarios = '<p class="sub">Escolha serviço, profissional e dia para ver os horários.</p>';
  if (serv && prof && escolha.date) {
    if (!ocupadosPorDia[escolha.date]) {
      // Busca no servidor os horários já ocupados nesse dia e redesenha
      blocoHorarios = '<p class="sub">Carregando horários…</p>';
      const dia = escolha.date;
      buscarOcupados(dia)
        .then(() => { if (rotaAtual() === 'agendar' && escolha.date === dia) telaAgendar(user); })
        .catch(err => toast(mensagemDeErro(err), true));
    } else {
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
           <div>${esc(dataBonita(escolha.date))} · <strong>${escolha.start} às ${paraHora(paraMin(escolha.start) + serv.duration)}</strong> (${serv.duration} min)</div>
           <div>Valor: <strong>${dinheiro(serv.price)}</strong> — pago no dia, no local</div>`
        : '<div class="sub" style="margin:0">Complete as etapas acima.</div>'}
      <button class="btn" id="btn-confirmar" ${pronto ? '' : 'disabled'}>Enviar pedido</button>
    </div>`;

  app.querySelectorAll('[data-campo]').forEach(btn => {
    btn.onclick = () => {
      const campo = btn.dataset.campo;
      if (campo === 'serviceIds') {
        const id = btn.dataset.valor;
        escolha.serviceIds = escolha.serviceIds.includes(id) ? escolha.serviceIds.filter(x => x !== id) : [...escolha.serviceIds, id];
      } else escolha[campo] = btn.dataset.valor;
      // Ao trocar de dia, busca os horários de novo (outro cliente pode ter marcado)
      if (campo === 'date') delete ocupadosPorDia[escolha.date];
      if (campo !== 'start') escolha.start = null;
      telaAgendar(user);
    };
  });

  const btnConfirmar = document.getElementById('btn-confirmar');
  btnConfirmar.onclick = () => comBotaoOcupado(btnConfirmar, async () => {
    const { error } = await sb.from('appointments').insert({
      professional_id: escolha.professionalId,
      service_ids: escolha.serviceIds,
      date: escolha.date,
      start_time: escolha.start,
    });
    if (error) {
      toast(mensagemDeErro(error), true);
      delete ocupadosPorDia[escolha.date];
      escolha.start = null;
      telaAgendar(user);
      return;
    }
    Object.assign(escolha, { serviceIds: [], professionalId: null, date: null, start: null });
    ocupadosPorDia = {};
    await carregarDados();
    toast('Pedido enviado! Você será avisado quando o barbeiro responder.');
    location.hash = '#/conta';
  });
}

/* ---------- Cliente: Minha conta ---------- */
function telaConta(user) {
  const meus = db.appointments;
  const futuros = ordenarAppts(meus.filter(a => !jaPassou(a) && a.status !== 'cancelled'));
  const historico = ordenarAppts(meus.filter(a => jaPassou(a) || a.status === 'cancelled')).reverse();
  const avisos = db.notifications.slice(0, 5);

  app.innerHTML = `
    <h1>Minha conta</h1>
    <p class="sub">${esc(user.name)} · ${esc(user.phone)} · ${esc(user.email)}</p>
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
  if (db.notifications.some(n => !n.read)) {
    sb.rpc('marcar_avisos_lidos').then(({ error }) => {
      if (error) return;
      db.notifications.forEach(n => { n.read = true; });
      desenharTopo(user, rotaAtual());
    });
  }
  ligarAcoes();
}

/* ---------- ADM: Pedidos ---------- */
function telaPedidos() {
  const pendentes = ordenarAppts(db.appointments.filter(a => a.status === 'pending'));
  const recentes = db.appointments
    .filter(a => a.status !== 'pending')
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 8);
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
  ligarAcoes();
}

/* ---------- ADM: Agenda do dia ---------- */
let agendaData = null;
let agendaProf = 'todos';

function telaAgenda() {
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
  ligarAcoes();
}

// Salva uma alteração do ADM (profissional/serviço) e redesenha
async function salvarAdm(btn, operacao, sucesso) {
  await comBotaoOcupado(btn, async () => {
    const { error } = await operacao();
    if (error) { toast(mensagemDeErro(error), true); return; }
    if (sucesso) toast(sucesso);
    await carregarDados();
    render();
  });
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

  const form = document.getElementById('form-prof');
  form.onsubmit = e => {
    e.preventDefault();
    const nome = document.getElementById('prof-nome').value.trim();
    if (!nome) return;
    salvarAdm(form.querySelector('button'),
      () => sb.from('professionals').insert({ name: nome }),
      `${nome} foi adicionado(a) à equipe.`);
  };
  app.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.onclick = () => {
      const p = porId('professionals', btn.dataset.toggle);
      salvarAdm(btn, () => sb.from('professionals').update({ active: !p.active }).eq('id', p.id));
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

  const form = document.getElementById('form-serv');
  form.onsubmit = e => {
    e.preventDefault();
    const novo = {
      name: document.getElementById('sv-nome').value.trim(),
      duration: Number(document.getElementById('sv-dur').value),
      price: Number(document.getElementById('sv-preco').value),
    };
    salvarAdm(form.querySelector('button'), () => sb.from('services').insert(novo), `${novo.name} foi adicionado.`);
  };
  app.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.onclick = () => {
      const s = porId('services', btn.dataset.toggle);
      salvarAdm(btn, () => sb.from('services').update({ active: !s.active }).eq('id', s.id));
    };
  });
}

/* =========================================================
   Rotas
   ========================================================= */

const ROTAS_CLIENTE = { home: telaHome, agendar: telaAgendar, conta: telaConta };
const ROTAS_ADMIN = { pedidos: telaPedidos, agenda: telaAgenda, profissionais: telaProfissionais, servicos: telaServicos };

const rotaAtual = () => location.hash.replace('#/', '');

function render() {
  if (!sb) return telaSemConfiguracao();
  const user = sessao;
  const rota = rotaAtual();

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

// Início: recupera o login salvo (se houver) e desenha a tela
(async function iniciar() {
  if (!sb) return render();
  telaCarregando();
  try {
    await iniciarSessao();
  } catch (e) {
    return telaErro(e);
  }
  animarEntrada();
  render();
})();
