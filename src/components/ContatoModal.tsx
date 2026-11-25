import { useState, useEffect, useRef, useMemo } from 'react'
import {
  X, User, Mail, Phone, Building2, Edit3, Trash2, GitMerge,
  Send, KeyRound, Loader2, Ticket as TicketIcon, Clock
} from 'lucide-react'
import clsx from 'clsx'
import { api, type TicketContato, type Ticket } from '../lib/api'
import { formatTelefone } from '../lib/telefone'

const STATUS_CLASSES_LIGHT: Record<string, string> = {
  'Novo': 'bg-brand-50 text-brand-700 border-brand-200',
  'Aberto': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Pendente': 'bg-amber-50 text-amber-700 border-amber-200',
  'Aguardando cliente': 'bg-orange-50 text-orange-700 border-orange-200',
  'Aguardando terceiros': 'bg-purple-50 text-purple-700 border-purple-200',
  'Resolvido': 'bg-teal-50 text-teal-700 border-teal-200',
  'Fechado': 'bg-slate-100 text-slate-600 border-slate-300'
}

function formatData(iso?: string | null) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

interface ContatoModalProps {
  contato: TicketContato
  clientes: any[]
  leoEmpresas?: any[]
  grupos: any[]
  onClose: () => void
  onChange: () => void
  onAbrirTicket?: (ticketId: string) => void
  // Acesso ao portal (login = e-mail do contato)
  acesso?: 'interno' | 'inativo' | 'ativo' | 'pendente' | 'sem'
  onLiberarAcesso?: () => void | Promise<void> // ausente = perfil sem permissão para liberar
  onRedefinirSenha?: () => void | Promise<void> // idem, para quem já tem acesso ativo
  liberarBloqueadoMotivo?: string | null // ex.: contato sem empresa vinculada
  liberandoAcesso?: boolean
}

// Modal de PERFIL do contato: dados, histórico de tickets e ações
export function ContatoModal({ contato, clientes, leoEmpresas, grupos, onClose, onChange, onAbrirTicket, acesso, onLiberarAcesso, onRedefinirSenha, liberarBloqueadoMotivo, liberandoAcesso }: ContatoModalProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [atual, setAtual] = useState<TicketContato>(contato)
  const [leoEmpresasLocal, setLeoEmpresasLocal] = useState<any[]>(leoEmpresas || [])

  // Carrega empresas da Léo Madeiras como garantia caso o pai não tenha passado
  useEffect(() => {
    if (!leoEmpresas || leoEmpresas.length === 0) {
      api.getLeoEmpresas().then(es => setLeoEmpresasLocal(es || [])).catch(() => {})
    } else {
      setLeoEmpresasLocal(leoEmpresas)
    }
  }, [leoEmpresas])

  const carregar = async () => {
    setLoading(true)
    try {
      const [c, ts] = await Promise.all([
        api.getContatoById(contato.id),
        api.getTicketsPorContato(contato)
      ])
      if (c) setAtual(c)
      setTickets(ts)
    } catch (err) {
      console.error('Erro ao carregar contato:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contato.id])

  const empresaNome = atual.empresa_id
    ? (clientes.find(c => c.id === atual.empresa_id)?.nome_empresa ||
       leoEmpresasLocal.find(l => l.id === atual.empresa_id)?.nome_empresa ||
       atual.empresa_nome)
    : atual.empresa_nome

  const handleExcluir = async () => {
    if (!window.confirm(`Excluir o contato "${atual.nome}"? Os tickets dele serão desvinculados (não apagados).`)) return
    try {
      await api.deleteContato(atual.id)
      onChange()
      onClose()
    } catch (err: any) {
      alert('Erro ao excluir contato: ' + (err.message || 'Desconhecido'))
    }
  }

  const emBreve = () => alert('Disponível apenas para contatos com acesso ativo.')

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Barra de ações no topo */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => setEditando(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-brand-600 hover:bg-slate-100 transition-colors">
              <Edit3 className="w-3.5 h-3.5" /> Editar
            </button>
            <button onClick={handleExcluir} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
            <button onClick={emBreve} title="Disponível em breve" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 cursor-not-allowed">
              <GitMerge className="w-3.5 h-3.5" /> Mesclar
            </button>
            {onLiberarAcesso && (acesso === 'sem' || acesso === 'pendente') ? (
              <button
                onClick={() => onLiberarAcesso()}
                disabled={liberandoAcesso || !!liberarBloqueadoMotivo}
                title={liberarBloqueadoMotivo || 'Enviar e-mail para o contato criar a senha de acesso'}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-brand-600 hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {liberandoAcesso ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {acesso === 'pendente' ? 'Reenviar convite de acesso' : 'Liberar acesso'}
              </button>
            ) : acesso === 'ativo' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-600">
                <Send className="w-3.5 h-3.5" /> Acesso ativo
              </span>
            ) : acesso === 'inativo' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600">
                <Send className="w-3.5 h-3.5" /> Acesso inativo
              </span>
            ) : null}
            {onRedefinirSenha && acesso === 'ativo' ? (
              <button
                onClick={() => onRedefinirSenha()}
                disabled={liberandoAcesso}
                title="Enviar ao contato um link para criar uma nova senha"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-brand-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {liberandoAcesso ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />} Redefinir senha
              </button>
            ) : (
              <button onClick={emBreve} title="Disponível apenas para contatos com acesso ativo" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 cursor-not-allowed">
                <KeyRound className="w-3.5 h-3.5" /> Redefinir senha
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-clean">
          {/* Cabeçalho do contato */}
          <div className="p-5 flex items-start gap-4 bg-white border-b border-slate-200">
            <div className="w-16 h-16 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-2xl font-black text-brand-600 uppercase shrink-0">
              {atual.foto_url ? <img src={atual.foto_url} alt={atual.nome} className="w-full h-full rounded-full object-cover" /> : atual.nome.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-900">{atual.nome}</h2>
              <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                {atual.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {atual.email}</div>}
                {(atual.telefone_comercial || atual.celular) && (
                  <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {formatTelefone(atual.telefone_comercial || atual.celular)}</div>
                )}
                {empresaNome && <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /> {empresaNome}</div>}
              </div>
            </div>
          </div>

          {/* Histórico de tickets */}
          <div className="p-5">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-brand-600" /> Tickets deste contato ({tickets.length})
            </h3>
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm animate-pulse">Carregando...</div>
            ) : tickets.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">Nenhum ticket encontrado para este contato.</div>
            ) : (
              <div className="space-y-2">
                {tickets.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { if (onAbrirTicket) { onAbrirTicket(t.id); onClose() } }}
                    className="w-full text-left bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center gap-3 hover:border-brand-300 hover:shadow-sm transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">{t.titulo}</span>
                        <span className="text-[11px] font-bold text-brand-600 font-mono">#{t.numero}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3" /> {formatData(t.created_at)}
                        {t.agente_nome && <><span>•</span><span>{t.agente_nome}</span></>}
                      </div>
                    </div>
                    <span className={clsx('text-[10px] font-bold px-2 py-1 rounded-full border shrink-0', STATUS_CLASSES_LIGHT[t.status] || 'bg-slate-100 text-slate-600 border-slate-300')}>
                      {t.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer de edição */}
      {editando && (
        <EditarContatoDrawer
          contato={atual}
          clientes={clientes}
          leoEmpresas={leoEmpresasLocal}
          grupos={grupos}
          onClose={() => setEditando(false)}
          onSaved={async () => { setEditando(false); await carregar(); onChange() }}
        />
      )}
    </div>
  )
}

// Drawer lateral para editar os dados do contato
function EditarContatoDrawer({ contato, clientes, leoEmpresas = [], grupos, onClose, onSaved }: {
  contato: TicketContato
  clientes: any[]
  leoEmpresas?: any[]
  grupos: any[]
  onClose: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState(contato.nome || '')
  const [email, setEmail] = useState(contato.email || '')
  const [telefoneComercial, setTelefoneComercial] = useState(formatTelefone(contato.telefone_comercial || ''))
  const [celular, setCelular] = useState(formatTelefone(contato.celular || ''))
  const [cargo, setCargo] = useState(contato.cargo || '')
  const [empresaId, setEmpresaId] = useState(contato.empresa_id || '')
  const [empresaNome, setEmpresaNome] = useState(
    contato.empresa_nome ||
    (contato.empresa_id
      ? (clientes.find(c => c.id === contato.empresa_id)?.nome_empresa ||
         leoEmpresas.find((l: any) => l.id === contato.empresa_id)?.nome_empresa || '')
      : '')
  )
  const [grupoId, setGrupoId] = useState(contato.grupo_id || '')
  const [veTodos, setVeTodos] = useState(!!contato.ve_todos_empresa)
  const [salvando, setSalvando] = useState(false)

  // Unifica clientes da base com empresas da Léo Madeiras
  const empresasUnificadas = useMemo(() => {
    const base = (clientes || []).map((c: any) => ({
      id: c.id,
      nome_empresa: c.nome_empresa,
      origem: 'cliente' as const,
      tipo: c.tipo_cliente || c.tipo || 'NORMAL',
      cd_empresa: c.cd_empresa || null
    }))

    const nomesVistos = new Set(base.map(c => (c.nome_empresa || '').trim().toLowerCase()))

    const leo = (leoEmpresas || [])
      .filter((e: any) => !nomesVistos.has((e.nome_empresa || '').trim().toLowerCase()))
      .map((e: any) => ({
        id: e.id,
        nome_empresa: e.nome_empresa,
        origem: 'leo' as const,
        tipo: 'LÉO MADEIRAS',
        cd_empresa: e.cd_empresa || null
      }))

    return [...base, ...leo]
  }, [clientes, leoEmpresas])

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm focus:outline-none focus:border-brand-500'
  const labelCls = 'block text-xs font-bold text-slate-600 mb-1'

  const salvar = async () => {
    if (!nome.trim()) { alert('Informe o nome do contato.'); return }
    setSalvando(true)
    try {
      await api.updateContato(contato.id, {
        nome: nome.trim(),
        email: email.trim() || null,
        telefone_comercial: telefoneComercial.trim() || null,
        celular: celular.trim() || null,
        cargo: cargo.trim() || null,
        empresa_id: empresaId || null,
        // grava o nome da empresa selecionada (clientes ou Léo Madeiras)
        empresa_nome: (empresaNome && empresaNome.trim()) || null,
        grupo_id: grupoId || null,
        ve_todos_empresa: veTodos
      })
      // Propaga o nome/e-mail atualizados para os tickets vinculados a este contato
      await api.propagarContatoNosTickets(contato.id, {
        cliente_nome: nome.trim() || null,
        cliente_email: email.trim() || null
      }).catch(() => {})
      onSaved()
    } catch (err: any) {
      alert('Erro ao salvar contato: ' + (err.message || 'Desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><User className="w-4 h-4 text-brand-600" /> Editar contato</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-clean p-5 space-y-4">
          <div>
            <label className={labelCls}>Nome <span className="text-red-500">*</span></label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Telefone comercial</label>
              <input type="text" value={telefoneComercial} onChange={e => setTelefoneComercial(formatTelefone(e.target.value))} placeholder="(11) 2345-6789" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Celular</label>
              <input type="text" value={celular} onChange={e => setCelular(formatTelefone(e.target.value))} placeholder="(11) 91234-5678" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Cargo</label>
            <input type="text" value={cargo} onChange={e => setCargo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Empresa</label>
            <EmpresaComboboxContato
              empresas={empresasUnificadas}
              empresaId={empresaId}
              empresaNome={empresaNome}
              onSelecionar={(cli) => {
                setEmpresaId(cli ? cli.id : '')
                setEmpresaNome(cli ? cli.nome_empresa : '')
              }}
            />
            <p className="text-[11px] text-slate-400 mt-1">Busca em clientes cadastrados e empresas da base Léo Madeiras.</p>
          </div>
          <div>
            <label className={labelCls}>Grupo</label>
            <select value={grupoId} onChange={e => setGrupoId(e.target.value)} className={inputCls}>
              <option value="">-- Sem grupo --</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input type="checkbox" checked={veTodos} onChange={e => setVeTodos(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
            <span className="text-sm text-slate-700">Pode ver todos os tickets da empresa</span>
          </label>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {salvando ? 'Salvando...' : 'Atualizar contato'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Combobox de empresa (Editar contato): filtra conforme digita
// tanto em clientes quanto nas empresas da base Léo Madeiras.
// ============================================================
export function EmpresaComboboxContato({ empresas, empresaId, empresaNome, onSelecionar }: {
  empresas: any[]
  empresaId: string
  empresaNome: string
  onSelecionar: (empresa: any | null) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [termo, setTermo] = useState('')
  const [ativo, setAtivo] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)

  const temVinculo = !!empresaId || !!(empresaNome || '').trim()
  const valorInput = aberto ? termo : (empresaNome || '')

  useEffect(() => {
    if (!aberto) return
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [aberto])

  const filtrados = useMemo(() => {
    const t = termo.trim().toLowerCase()
    const base = t
      ? (empresas || []).filter(c =>
          (c.nome_empresa || '').toLowerCase().includes(t) ||
          (c.cd_empresa && String(c.cd_empresa).toLowerCase().includes(t)) ||
          (c.tipo && String(c.tipo).toLowerCase().includes(t))
        )
      : (empresas || [])
    return [...base].sort((a, b) => (a.nome_empresa || '').localeCompare(b.nome_empresa || '', 'pt-BR')).slice(0, 100)
  }, [empresas, termo])

  useEffect(() => { setAtivo(0) }, [termo, aberto])
  useEffect(() => {
    if (!aberto || !listaRef.current) return
    const el = listaRef.current.children[ativo] as HTMLElement | undefined
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [ativo, aberto])

  const selecionar = (c: any) => { onSelecionar(c); setAberto(false); setTermo('') }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!aberto) { setAberto(true); return } setAtivo(i => Math.min(i + 1, filtrados.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { if (aberto && filtrados[ativo]) { e.preventDefault(); selecionar(filtrados[ativo]) } }
    else if (e.key === 'Escape') { if (aberto) { e.preventDefault(); setAberto(false) } }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={valorInput}
          placeholder="Digite o nome ou código da empresa…"
          onFocus={() => { setTermo(''); setAberto(true) }}
          onChange={e => { setTermo(e.target.value); setAberto(true) }}
          onKeyDown={onKeyDown}
          className={clsx(
            'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-brand-500',
            temVinculo ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800 font-semibold' : 'border-slate-300 bg-white text-slate-700'
          )}
        />
        {temVinculo && (
          <button type="button" title="Remover vínculo" onClick={() => { onSelecionar(null); setTermo(''); setAberto(false) }} className="shrink-0 text-slate-400 hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {aberto && (
        <div ref={listaRef} className="absolute z-20 mt-1 w-full max-h-60 overflow-auto scrollbar-clean bg-white border border-slate-200 rounded-lg shadow-xl">
          {filtrados.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-400 text-center">Nenhuma empresa encontrada</div>
          ) : (
            filtrados.map((c, idx) => {
              const selecionadoItem = c.id === empresaId || (c.nome_empresa && c.nome_empresa.trim().toLowerCase() === (empresaNome || '').trim().toLowerCase())
              const isLeo = c.tipo === 'LÉO MADEIRAS' || c.origem === 'leo'
              const isShopee = c.tipo === 'SHOPEE'
              return (
                <button
                  key={`${c.origem || 'emp'}-${c.id || c.nome_empresa}-${idx}`}
                  type="button"
                  onClick={() => selecionar(c)}
                  onMouseEnter={() => setAtivo(idx)}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 border-b border-slate-100 last:border-b-0',
                    idx === ativo ? 'bg-brand-50' : '',
                    selecionadoItem ? 'text-emerald-700 font-semibold bg-emerald-50/50' : 'text-slate-700'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.nome_empresa}</span>
                    {c.cd_empresa && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                        #{c.cd_empresa}
                      </span>
                    )}
                  </div>
                  <span className={clsx(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border uppercase tracking-wider',
                    isLeo
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : isShopee
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  )}>
                    {isLeo ? 'Léo Madeiras' : isShopee ? 'Shopee' : 'Cliente'}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
