import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Mail, ArrowLeft, Users, Building2, Search, Check, X, Send, Loader2,
  AlertCircle, CheckCircle2, Clock, Paperclip, Image as ImageIcon, Palette, Eye
} from 'lucide-react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { getLoggedUser } from '../lib/auth'
import { RichTextEditor } from '../components/RichTextEditor'

type ModoPublico = 'TIPO' | 'EMPRESA' | 'MANUAL'
type Destinatario = {
  email: string
  nome: string
  empresa: string
  tipo: string
  contato_id: string | null
  status: 'pendente' | 'enviado' | 'erro'
  erro?: string
}
type Anexo = { nome: string; tipo: string; conteudo: string; tamanho: number }

const norm = (v: any) => (v ?? '').toString().trim().toLowerCase()
const ehLeo = (tp: string) => { const u = (tp || '').toUpperCase(); return u.includes('LÉO') || u.includes('LEO') }
const ehShopee = (tp: string) => (tp || '').toUpperCase().includes('SHOPEE')
const MAX_ANEXOS_MB = 15

export function CampanhaEmail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // dados
  const [clientes, setClientes] = useState<any[]>([])
  const [leoEmpresas, setLeoEmpresas] = useState<any[]>([])
  const [contatos, setContatos] = useState<any[]>([])
  const [emailsFuncionarios, setEmailsFuncionarios] = useState<string[]>([])
  const [funcionarios, setFuncionarios] = useState<{ nome: string; email: string }[]>([])
  const [descadastros, setDescadastros] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(true)

  // etapa
  const [etapa, setEtapa] = useState<1 | 2 | 3 | 4>(1)

  // público
  const [modo, setModo] = useState<ModoPublico>((params.get('tipo') ? 'TIPO' : 'TIPO'))
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'NORMAL' | 'SHOPEE' | 'LEO' | 'FUNCIONARIOS'>((params.get('tipo') as any) || 'TODOS')
  const [somenteAtivos, setSomenteAtivos] = useState(true)
  const [empresaSel, setEmpresaSel] = useState<string>('') // nome normalizado da empresa escolhida
  const [buscaEmpresa, setBuscaEmpresa] = useState('')
  const [buscaContato, setBuscaContato] = useState('')
  const [selManual, setSelManual] = useState<Set<string>>(new Set()) // emails selecionados

  // mensagem + layout
  const [assunto, setAssunto] = useState('')
  const [corpoHtml, setCorpoHtml] = useState('<p>Olá {{nome}},</p><p></p><p></p><p>Atenciosamente,<br>Equipe Mantran</p>')
  const [logoUrl, setLogoUrl] = useState('/Logo_Mantran.png')
  const [corDestaque, setCorDestaque] = useState('#dc2626')
  const [rodape, setRodape] = useState('Mantran Sistemas • Este e-mail foi enviado para você por ser nosso cliente.')
  const [incluirDescadastro, setIncluirDescadastro] = useState(true)

  // anexos
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const anexoInputRef = useRef<HTMLInputElement>(null)

  // envio
  const [intervaloSeg, setIntervaloSeg] = useState(4)
  const [emailTeste, setEmailTeste] = useState('')
  const [enviandoTeste, setEnviandoTeste] = useState(false)
  const [fase, setFase] = useState<'edicao' | 'enviando' | 'concluido'>('edicao')
  const [lista, setLista] = useState<Destinatario[]>([])
  const [indiceAtual, setIndiceAtual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [erroGeral, setErroGeral] = useState('')
  const cancelarRef = useRef(false)
  const pausadoRef = useRef(false)
  const campanhaIdRef = useRef<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.getClientes().catch(() => []),
      api.getLeoEmpresas().catch(() => []),
      api.getContatos().catch(() => []),
      api.getEmailsFuncionarios().catch(() => []),
      api.getEmailDescadastros().catch(() => new Set<string>()),
      api.getFuncionariosMantran().catch(() => [])
    ]).then(([cs, es, ct, ef, dc, fn]) => {
      setClientes(cs || []); setLeoEmpresas(es || []); setContatos(ct || [])
      setEmailsFuncionarios(ef || []); setDescadastros(dc as Set<string>)
      // inclui o usuário logado na lista de funcionários, caso não esteja
      const logado = getLoggedUser()
      const base = [...(fn as { nome: string; email: string }[])]
      const emailLogado = (logado?.email_corporativo || logado?.cliente_email || '').trim().toLowerCase()
      if (emailLogado && !base.some(f => f.email === emailLogado)) {
        base.push({ nome: logado?.nome || logado?.login || emailLogado.split('@')[0], email: emailLogado })
      }
      setFuncionarios(base)
      setCarregando(false)
    })
  }, [])

  // tipo/ativo resolvido para cada contato
  const contatosEnriquecidos = useMemo(() => {
    const byId = new Map(clientes.map((c: any) => [c.id, c]))
    const leoPorNome = new Map<string, any>()
    ;(leoEmpresas || []).forEach((e: any) => leoPorNome.set(norm(e.nome_empresa), e))
    const vistos = new Set<string>()
    const out: Destinatario[] = []
    for (const ct of contatos) {
      const email = norm(ct.email)
      if (!email || vistos.has(email)) continue
      if (emailsFuncionarios.includes(email)) continue
      const cli = ct.empresa_id ? byId.get(ct.empresa_id) : null
      let empresa = cli?.nome_empresa || ct.empresa_nome || ''
      let tipo = (cli?.tipo || '').toUpperCase()
      let ativo = cli ? (cli.ativo !== false) : true
      if (!cli && empresa) {
        const leo = leoPorNome.get(norm(empresa))
        if (leo) { tipo = 'LÉO MADEIRAS'; ativo = leo.ativo !== false }
      }
      if (!tipo) tipo = 'NORMAL'
      vistos.add(email)
      out.push({ email, nome: ct.nome || email.split('@')[0], empresa, tipo, contato_id: ct.id || null, status: 'pendente', ...(ativo ? {} : { _inativo: true }) } as any)
    }
    // Funcionários da Mantran (tipo FUNCIONARIOS, empresa "Mantran", sempre ativos)
    for (const f of funcionarios) {
      const email = norm(f.email)
      if (!email || vistos.has(email)) continue
      vistos.add(email)
      out.push({ email, nome: f.nome || email.split('@')[0], empresa: 'Mantran', tipo: 'FUNCIONARIOS', contato_id: null, status: 'pendente' } as any)
    }
    return out as (Destinatario & { _inativo?: boolean })[]
  }, [clientes, leoEmpresas, contatos, emailsFuncionarios, funcionarios])

  // empresas (nome) disponíveis para o modo "Empresa específica"
  const empresasDisponiveis = useMemo(() => {
    const m = new Map<string, { nome: string; qtd: number }>()
    contatosEnriquecidos.forEach(d => {
      if (!d.empresa) return
      const k = norm(d.empresa)
      const e = m.get(k) || { nome: d.empresa, qtd: 0 }
      e.qtd++; m.set(k, e)
    })
    return Array.from(m.entries()).map(([k, v]) => ({ chave: k, ...v })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [contatosEnriquecidos])

  const empresasFiltradas = useMemo(() => {
    const t = buscaEmpresa.trim().toLowerCase()
    return t ? empresasDisponiveis.filter(e => e.nome.toLowerCase().includes(t)) : empresasDisponiveis
  }, [empresasDisponiveis, buscaEmpresa])

  const contatosFiltradosManual = useMemo(() => {
    const t = buscaContato.trim().toLowerCase()
    return contatosEnriquecidos.filter(d =>
      !t || d.nome.toLowerCase().includes(t) || d.email.includes(t) || d.empresa.toLowerCase().includes(t)
    )
  }, [contatosEnriquecidos, buscaContato])

  // destinatários resolvidos conforme o modo
  const destinatarios = useMemo<Destinatario[]>(() => {
    let base = contatosEnriquecidos.filter(d => !descadastros.has(d.email))
    if (somenteAtivos) base = base.filter(d => !(d as any)._inativo)
    const ehFunc = (tp: string) => (tp || '').toUpperCase() === 'FUNCIONARIOS'
    if (modo === 'TIPO') {
      if (filtroTipo === 'FUNCIONARIOS') base = base.filter(d => ehFunc(d.tipo))
      else if (filtroTipo === 'SHOPEE') base = base.filter(d => ehShopee(d.tipo) && !ehFunc(d.tipo))
      else if (filtroTipo === 'LEO') base = base.filter(d => ehLeo(d.tipo) && !ehFunc(d.tipo))
      else if (filtroTipo === 'NORMAL') base = base.filter(d => !ehShopee(d.tipo) && !ehLeo(d.tipo) && !ehFunc(d.tipo))
      else /* TODOS */ base = base.filter(d => !ehFunc(d.tipo)) // "Todos" = clientes; funcionários têm opção própria
    } else if (modo === 'EMPRESA') {
      base = empresaSel ? base.filter(d => norm(d.empresa) === empresaSel) : []
    } else if (modo === 'MANUAL') {
      base = base.filter(d => selManual.has(d.email))
    }
    return base.map(d => ({ email: d.email, nome: d.nome, empresa: d.empresa, tipo: d.tipo, contato_id: d.contato_id, status: 'pendente' as const }))
  }, [contatosEnriquecidos, descadastros, somenteAtivos, modo, filtroTipo, empresaSel, selManual])

  // ---------- template de marketing ----------
  const montarHtml = (d: { nome: string; empresa: string; email: string }): string => {
    // E-mails precisam de URLs ABSOLUTAS: caminhos relativos (/logo.png) não
    // resolvem no cliente de e-mail. Prefixa com a origem do app quando necessário.
    const origem = (typeof window !== 'undefined' ? window.location.origin : '').replace(/\/$/, '')
    const urlAbsoluta = (u: string) => {
      const v = (u || '').trim()
      if (!v) return ''
      if (/^(https?:)?\/\//i.test(v) || v.startsWith('data:')) return v
      return origem + (v.startsWith('/') ? v : '/' + v)
    }

    const corpo = corpoHtml
      .replace(/\{\{\s*nome\s*\}\}/gi, d.nome || '')
      .replace(/\{\{\s*empresa\s*\}\}/gi, d.empresa || '')
    const unsub = incluirDescadastro
      ? `<a href="${urlAbsoluta('/api/descadastro')}?email=${encodeURIComponent(d.email)}" style="color:#94a3b8;text-decoration:underline">descadastrar</a>`
      : ''
    const logoSrc = urlAbsoluta(logoUrl)
    const logo = logoSrc
      ? `<tr><td style="padding:24px 32px;background:#ffffff;border-bottom:3px solid ${corDestaque}">
           <img src="${logoSrc}" alt="logo" style="max-height:44px;height:auto;display:block" /></td></tr>`
      : ''
    return `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f9">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0">
        <tr><td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
            ${logo}
            <tr><td style="padding:28px 32px;font-size:15px;color:#334155;line-height:1.7">${corpo}</td></tr>
            <tr><td style="padding:18px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;line-height:1.6">
              ${rodape || ''} ${unsub ? '<br>' + unsub : ''}
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`
  }

  // ---------- anexos ----------
  const totalMb = anexos.reduce((s, a) => s + a.tamanho, 0) / (1024 * 1024)

  const adicionarAnexos = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const conteudo = String(reader.result || '')
        setAnexos(prev => {
          const novo = [...prev, { nome: file.name, tipo: file.type || 'application/octet-stream', conteudo, tamanho: file.size }]
          return novo
        })
      }
      reader.readAsDataURL(file)
    })
  }

  // ---------- envio ----------
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

  const enviarTeste = async () => {
    const dest = emailTeste.trim()
    if (!dest) { setErroGeral('Informe um e-mail para o teste.'); return }
    if (!assunto.trim()) { setErroGeral('Informe o assunto.'); return }
    setErroGeral(''); setEnviandoTeste(true)
    try {
      const r = await api.enviarEmail({
        para: dest, assunto: '[TESTE] ' + assunto,
        html: montarHtml({ nome: 'Fulano', empresa: 'Empresa Exemplo', email: dest }),
        anexos: anexos.map(a => ({ nome: a.nome, tipo: a.tipo, conteudo: a.conteudo }))
      })
      if (r.ok) alert('Teste enviado para ' + dest)
      else setErroGeral('Falha no teste: ' + (r.erro || ''))
    } finally { setEnviandoTeste(false) }
  }

  const iniciarEnvio = async () => {
    if (!assunto.trim()) { setErroGeral('Por favor, informe o Assunto do e-mail antes de enviar.'); return }
    if (destinatarios.length === 0) { setErroGeral('Nenhum destinatário selecionado.'); setEtapa(1); return }
    if (totalMb > MAX_ANEXOS_MB) { setErroGeral(`Anexos excedem ${MAX_ANEXOS_MB}MB.`); setEtapa(3); return }
    if (!window.confirm(`Enviar para ${destinatarios.length} destinatário(s), 1 por vez, intervalo ${intervaloSeg}s?\nTempo estimado ~${Math.ceil(destinatarios.length * intervaloSeg / 60)} min.`)) return

    setErroGeral('')
    cancelarRef.current = false; pausadoRef.current = false; setPausado(false)
    const trabalho = destinatarios.map(d => ({ ...d }))
    setLista(trabalho); setFase('enviando'); setIndiceAtual(0)

    const user = getLoggedUser()
    campanhaIdRef.current = await api.createEmailCampanha({
      assunto: assunto.trim(), corpo_html: corpoHtml,
      filtro_tipo: modo === 'TIPO' ? filtroTipo : modo, somente_ativos: somenteAtivos,
      intervalo_ms: intervaloSeg * 1000, total_destinatarios: trabalho.length,
      criado_por_id: user?.id || null, criado_por_nome: user?.nome || user?.login || null
    })

    const anexosPayload = anexos.map(a => ({ nome: a.nome, tipo: a.tipo, conteudo: a.conteudo }))
    let enviados = 0, falhas = 0
    for (let i = 0; i < trabalho.length; i++) {
      if (cancelarRef.current) break
      while (pausadoRef.current && !cancelarRef.current) await sleep(300)
      if (cancelarRef.current) break
      setIndiceAtual(i)
      const d = trabalho[i]
      const r = await api.enviarEmail({
        para: d.email, assunto: assunto.trim(),
        html: montarHtml(d), anexos: anexosPayload.length ? anexosPayload : undefined
      })
      trabalho[i] = { ...d, status: r.ok ? 'enviado' : 'erro', erro: r.ok ? undefined : r.erro }
      setLista(prev => prev.map((p, idx) => idx === i ? trabalho[i] : p))
      if (r.ok) enviados++; else falhas++
      await api.registrarEmailEnvio({
        campanha_id: campanhaIdRef.current, contato_id: d.contato_id,
        email: d.email, nome: d.nome, empresa_nome: d.empresa, tipo_empresa: d.tipo,
        status: r.ok ? 'ENVIADO' : 'ERRO', erro: r.ok ? null : (r.erro || 'Falha')
      })
      if (i < trabalho.length - 1 && !cancelarRef.current) await sleep(intervaloSeg * 1000)
    }
    await api.atualizarEmailCampanha(campanhaIdRef.current, {
      total_enviados: enviados, total_falhas: falhas,
      status: cancelarRef.current ? 'CANCELADA' : 'CONCLUIDA'
    })
    setFase('concluido')
  }

  const togglePausa = () => { pausadoRef.current = !pausadoRef.current; setPausado(pausadoRef.current) }
  const cancelar = () => { cancelarRef.current = true; pausadoRef.current = false; setPausado(false) }

  const enviadosCount = lista.filter(d => d.status === 'enviado').length
  const falhasCount = lista.filter(d => d.status === 'erro').length
  const progresso = lista.length ? Math.round(((enviadosCount + falhasCount) / lista.length) * 100) : 0

  // ---------- UI helpers ----------
  const inputCls = 'w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500'
  const labelCls = 'block text-xs font-bold text-slate-600 mb-1'

  const etapas = [
    { n: 1, label: 'Destinatários' },
    { n: 2, label: 'Mensagem & Layout' },
    { n: 3, label: 'Anexos' },
    { n: 4, label: 'Revisar & Enviar' }
  ]

  // ===================== Tela de envio em andamento =====================
  if (fase !== 'edicao') {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600"><Mail className="w-5 h-5" /></div>
            <div>
              <h1 className="text-lg font-black text-slate-900">{fase === 'concluido' ? 'Envio finalizado' : (pausado ? 'Envio pausado' : 'Enviando…')}</h1>
              <p className="text-xs text-slate-500">{assunto}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-bold text-slate-700">{fase === 'concluido' ? 'Concluído' : `${indiceAtual + 1} de ${lista.length}`}</span>
            <span className="text-slate-500">{progresso}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-2"><div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${progresso}%` }} /></div>
          <div className="flex gap-3 text-xs mb-4">
            <span className="text-emerald-600 font-semibold">{enviadosCount} enviados</span>
            <span className="text-red-500 font-semibold">{falhasCount} falhas</span>
            <span className="text-slate-400">{lista.length - enviadosCount - falhasCount} restantes</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[46vh] overflow-y-auto scrollbar-clean mb-4">
            {lista.map((d, i) => (
              <div key={i} className={clsx('flex items-center gap-2 px-3 py-1.5 text-xs border-b border-slate-100 last:border-0', i === indiceAtual && fase === 'enviando' && 'bg-brand-50/50')}>
                <span className="shrink-0">
                  {d.status === 'enviado' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    : d.status === 'erro' ? <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    : <Clock className="w-3.5 h-3.5 text-slate-300" />}
                </span>
                <span className="font-medium text-slate-700 truncate max-w-[180px]">{d.nome}</span>
                <span className="text-slate-400 truncate flex-1">{d.email}</span>
                {d.erro && <span className="text-red-400 truncate max-w-[140px]" title={d.erro}>{d.erro}</span>}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            {fase === 'enviando' ? (
              <>
                <button onClick={togglePausa} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-bold hover:border-brand-400">{pausado ? 'Retomar' : 'Pausar'}</button>
                <button onClick={cancelar} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold">Cancelar</button>
              </>
            ) : (
              <>
                <button onClick={() => { setFase('edicao'); setLista([]) }} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50">Nova campanha</button>
                <button onClick={() => navigate('/tickets')} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold">Concluir</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ===================== Tela de edição (wizard) =====================
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 cursor-pointer"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600"><Mail className="w-5 h-5" /></div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Nova campanha de e-mail</h1>
          <p className="text-[11px] sm:text-xs text-slate-500">Envio individual (1 por vez) • logo, rodapé, anexos e seleção de público</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 sm:gap-2 bg-white border border-slate-200 rounded-xl p-1.5">
        {etapas.map((e) => (
          <button key={e.n} type="button" onClick={() => setEtapa(e.n as any)}
            className={clsx('flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer',
              etapa === e.n ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100')}>
            <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-[11px]', etapa === e.n ? 'bg-white/20' : 'bg-slate-200 text-slate-600')}>{e.n}</span>
            <span className="hidden sm:inline">{e.label}</span>
          </button>
        ))}
      </div>

      {erroGeral && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {erroGeral}</div>}

      {carregando ? (
        <div className="py-20 text-center text-slate-400">Carregando contatos…</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          {/* ----- Etapa 1: Destinatários ----- */}
          {etapa === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { k: 'TIPO', ic: Users, t: 'Por tipo' },
                  { k: 'EMPRESA', ic: Building2, t: 'Empresa específica' },
                  { k: 'MANUAL', ic: Check, t: 'Selecionar contatos' }
                ] as { k: ModoPublico; ic: any; t: string }[]).map(op => (
                  <button key={op.k} type="button" onClick={() => setModo(op.k)}
                    className={clsx('flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors cursor-pointer',
                      modo === op.k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                    <op.ic className="w-5 h-5" />
                    <span className="text-xs font-bold">{op.t}</span>
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={somenteAtivos} onChange={e => setSomenteAtivos(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-brand-600" />
                <span className="text-sm text-slate-700">Somente empresas ativas</span>
              </label>

              {modo === 'TIPO' && (
                <div>
                  <label className={labelCls}>Tipo de cliente</label>
                  <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)} className={inputCls + ' cursor-pointer max-w-xs'}>
                    <option value="TODOS">Todos (clientes)</option>
                    <option value="NORMAL">Normal</option>
                    <option value="SHOPEE">Shopee</option>
                    <option value="LEO">Léo Madeiras</option>
                    <option value="FUNCIONARIOS">Funcionários (Mantran)</option>
                  </select>
                </div>
              )}

              {modo === 'EMPRESA' && (
                <div>
                  <label className={labelCls}>Escolha a empresa</label>
                  <div className="relative mb-2 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={buscaEmpresa} onChange={e => setBuscaEmpresa(e.target.value)} placeholder="Buscar empresa…" className={inputCls + ' pl-9'} />
                  </div>
                  <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto scrollbar-clean">
                    {empresasFiltradas.map(e => (
                      <button key={e.chave} type="button" onClick={() => setEmpresaSel(e.chave)}
                        className={clsx('w-full text-left px-3 py-2 text-sm flex items-center justify-between border-b border-slate-100 last:border-0 hover:bg-slate-50',
                          empresaSel === e.chave ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700')}>
                        <span className="truncate">{e.nome}</span>
                        <span className="text-[11px] text-slate-400 shrink-0 ml-2">{e.qtd} contato(s)</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {modo === 'MANUAL' && (
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input value={buscaContato} onChange={e => setBuscaContato(e.target.value)} placeholder="Buscar contato, e-mail ou empresa…" className={inputCls + ' pl-9'} />
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button type="button" onClick={() => setSelManual(new Set(contatosFiltradosManual.map(d => d.email)))} className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-brand-400">Marcar todos</button>
                      <button type="button" onClick={() => setSelManual(new Set())} className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-white border border-slate-300 text-slate-600 hover:border-brand-400">Limpar</button>
                    </div>
                  </div>
                  <div className="border border-slate-200 rounded-lg max-h-72 overflow-y-auto scrollbar-clean">
                    {contatosFiltradosManual.slice(0, 500).map(d => {
                      const marcado = selManual.has(d.email)
                      return (
                        <label key={d.email} className="flex items-center gap-2.5 px-3 py-2 text-sm border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={marcado} onChange={() => setSelManual(prev => { const n = new Set(prev); n.has(d.email) ? n.delete(d.email) : n.add(d.email); return n })} className="w-4 h-4 rounded border-slate-300 text-brand-600" />
                          <span className="font-medium text-slate-700 truncate max-w-[180px]">{d.nome}</span>
                          <span className="text-slate-400 truncate flex-1">{d.email}</span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[140px]">{d.empresa}</span>
                        </label>
                      )
                    })}
                  </div>
                  {contatosFiltradosManual.length > 500 && <p className="text-[11px] text-slate-400 mt-1">Mostrando 500 de {contatosFiltradosManual.length}. Refine a busca.</p>}
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 shrink-0" /> <strong>{destinatarios.length}</strong> destinatário(s) selecionado(s)
                {descadastros.size > 0 && <span className="text-xs text-brand-500">• {descadastros.size} descadastrado(s) excluído(s)</span>}
              </div>
            </div>
          )}

          {/* ----- Etapa 2: Mensagem & Layout ----- */}
          {etapa === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Assunto <span className="text-red-500">*</span></label>
                  <input value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Ex: Novidades da Mantran" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Mensagem</label>
                  <RichTextEditor value={corpoHtml} onChange={setCorpoHtml} placeholder="Escreva a mensagem…" minHeight={200} />
                  <p className="text-[11px] text-slate-400 mt-1">Variáveis: <code>{'{{nome}}'}</code> e <code>{'{{empresa}}'}</code>.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}><ImageIcon className="w-3.5 h-3.5 inline mr-1" />Logo (URL)</label>
                    <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="/Logo_Mantran.png ou https://..." className={inputCls} />
                    <p className="text-[11px] text-slate-400 mt-1">A imagem precisa ser pública. Caminhos como /Logo_Mantran.png viram URL completa automaticamente no envio.</p>
                  </div>
                  <div>
                    <label className={labelCls}><Palette className="w-3.5 h-3.5 inline mr-1" />Cor de destaque</label>
                    <input type="color" value={corDestaque} onChange={e => setCorDestaque(e.target.value)} className="w-full h-[38px] rounded-lg border border-slate-300 cursor-pointer" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Rodapé</label>
                  <textarea value={rodape} onChange={e => setRodape(e.target.value)} rows={2} className={inputCls + ' resize-y'} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={incluirDescadastro} onChange={e => setIncluirDescadastro(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-brand-600" />
                  <span className="text-sm text-slate-700">Incluir link de descadastro</span>
                </label>
              </div>

              {/* Preview */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2"><Eye className="w-3.5 h-3.5" /> Pré-visualização</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 h-[460px]">
                  <iframe title="preview" className="w-full h-full" srcDoc={montarHtml({ nome: 'Fulano de Tal', empresa: 'Empresa Exemplo', email: 'exemplo@cliente.com' })} />
                </div>
              </div>
            </div>
          )}

          {/* ----- Etapa 3: Anexos ----- */}
          {etapa === 3 && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-400 cursor-pointer text-center"
                onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); adicionarAnexos(e.dataTransfer.files) }}>
                <Paperclip className="w-7 h-7 text-slate-400" />
                <span className="text-sm text-slate-600">Clique ou arraste arquivos para anexar</span>
                <span className="text-[11px] text-slate-400">Limite total: {MAX_ANEXOS_MB}MB</span>
                <input ref={anexoInputRef} type="file" multiple className="hidden" onChange={e => adicionarAnexos(e.target.files)} />
              </label>
              {anexos.length > 0 && (
                <div className="space-y-2">
                  {anexos.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                      <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700 truncate flex-1">{a.nome}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{(a.tamanho / 1024).toFixed(0)} KB</span>
                      <button onClick={() => setAnexos(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 shrink-0"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <div className={clsx('text-xs font-semibold', totalMb > MAX_ANEXOS_MB ? 'text-red-600' : 'text-slate-500')}>
                    Total: {totalMb.toFixed(1)}MB {totalMb > MAX_ANEXOS_MB && `(excede ${MAX_ANEXOS_MB}MB)`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ----- Etapa 4: Revisar & Enviar ----- */}
          {etapa === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><div className="text-2xl font-black text-slate-800">{destinatarios.length}</div><div className="text-[11px] font-bold text-slate-500 uppercase">Destinatários</div></div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><div className="text-2xl font-black text-slate-800">{anexos.length}</div><div className="text-[11px] font-bold text-slate-500 uppercase">Anexos</div></div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><div className="text-2xl font-black text-slate-800">{intervaloSeg}s</div><div className="text-[11px] font-bold text-slate-500 uppercase">Intervalo</div></div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200"><div className="text-2xl font-black text-slate-800">~{Math.ceil(destinatarios.length * intervaloSeg / 60)}min</div><div className="text-[11px] font-bold text-slate-500 uppercase">Estimado</div></div>
              </div>

              {/* Assunto da Campanha (revisão e edição direta na Etapa 4) */}
              <div className={clsx('p-4 rounded-xl border space-y-2 transition-colors', !assunto.trim() ? 'bg-red-50/40 border-red-200' : 'bg-slate-50 border-slate-200')}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-brand-600" />
                    Assunto do e-mail <span className="text-red-500">*</span>
                  </label>
                  {!assunto.trim() ? (
                    <span className="text-[11px] font-bold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Obrigatório para enviar
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Preenchido
                    </span>
                  )}
                </div>
                <input
                  value={assunto}
                  onChange={e => {
                    setAssunto(e.target.value)
                    if (erroGeral) setErroGeral('')
                  }}
                  placeholder="Ex: Comunicado Importante — Mantran Tecnologias"
                  className={clsx(
                    inputCls,
                    !assunto.trim() ? 'border-red-400 focus:border-red-500 bg-white ring-1 ring-red-300' : 'bg-white'
                  )}
                />
                {!assunto.trim() && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                    O botão <strong>"Enviar"</strong> está bloqueado porque o assunto está vazio. Digite o assunto acima para liberá-lo.
                  </p>
                )}
              </div>

              <div>
                <label className={labelCls}>Intervalo entre envios</label>
                <select value={intervaloSeg} onChange={e => setIntervaloSeg(Number(e.target.value))} className={inputCls + ' cursor-pointer max-w-xs'}>
                  <option value={2}>2 segundos</option><option value={4}>4 segundos</option><option value={6}>6 segundos</option><option value={10}>10 segundos</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end pt-3 border-t border-slate-100">
                <div className="flex-1">
                  <label className={labelCls}>Enviar teste para</label>
                  <input value={emailTeste} onChange={e => setEmailTeste(e.target.value)} placeholder="seu-email@exemplo.com" className={inputCls} />
                </div>
                <button onClick={enviarTeste} disabled={enviandoTeste} className="py-2 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-bold hover:border-brand-400 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer">
                  {enviandoTeste ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Teste
                </button>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                O envio roda enquanto esta tela estiver aberta. Você pode pausar, retomar ou cancelar a qualquer momento.
              </div>
            </div>
          )}

          {/* Navegação do wizard */}
          <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-100">
            <button onClick={() => { setErroGeral(''); setEtapa(e => (Math.max(1, e - 1) as any)) }} disabled={etapa === 1} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer">Voltar</button>
            {etapa < 4 ? (
              <button
                onClick={() => {
                  if (etapa === 2 && !assunto.trim()) {
                    setErroGeral('Por favor, informe o Assunto do e-mail antes de avançar.')
                    return
                  }
                  setErroGeral('')
                  setEtapa(e => (Math.min(4, e + 1) as any))
                }}
                className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold cursor-pointer"
              >
                Avançar
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {!assunto.trim() && (
                  <span className="text-xs text-red-600 font-semibold hidden sm:flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Preencha o assunto acima
                  </span>
                )}
                <button
                  type="button"
                  onClick={iniciarEnvio}
                  disabled={destinatarios.length === 0}
                  className={clsx(
                    'px-5 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-all',
                    destinatarios.length > 0 && assunto.trim()
                      ? 'bg-brand-600 hover:bg-brand-700 cursor-pointer shadow-sm hover:shadow'
                      : 'bg-brand-400 cursor-not-allowed opacity-60'
                  )}
                  title={!assunto.trim() ? 'Preencha o assunto acima para liberar o envio' : `Enviar para ${destinatarios.length} destinatários`}
                >
                  <Send className="w-4 h-4" /> Enviar para {destinatarios.length}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
