import { useState, useEffect } from 'react'
import {
  X, User, Mail, Phone, Building2, Edit3, Trash2, GitMerge,
  Send, KeyRound, Loader2, Ticket as TicketIcon, Clock
} from 'lucide-react'
import clsx from 'clsx'
import { api, type TicketContato, type Ticket } from '../lib/api'

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
  grupos: any[]
  onClose: () => void
  onChange: () => void
  onAbrirTicket?: (ticketId: string) => void
}

// Modal de PERFIL do contato: dados, histórico de tickets e ações
export function ContatoModal({ contato, clientes, grupos, onClose, onChange, onAbrirTicket }: ContatoModalProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [atual, setAtual] = useState<TicketContato>(contato)

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
    ? (clientes.find(c => c.id === atual.empresa_id)?.nome_empresa || atual.empresa_nome)
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

  const emBreve = () => alert('Disponível na integração de e-mail/portal (em breve).')

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
            <button onClick={emBreve} title="Disponível em breve" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 cursor-not-allowed">
              <Send className="w-3.5 h-3.5" /> Enviar e-mail de ativação
            </button>
            <button onClick={emBreve} title="Disponível em breve" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 cursor-not-allowed">
              <KeyRound className="w-3.5 h-3.5" /> Alterar senha
            </button>
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
                  <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {atual.telefone_comercial || atual.celular}</div>
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
          grupos={grupos}
          onClose={() => setEditando(false)}
          onSaved={async () => { setEditando(false); await carregar(); onChange() }}
        />
      )}
    </div>
  )
}

// Drawer lateral para editar os dados do contato
function EditarContatoDrawer({ contato, clientes, grupos, onClose, onSaved }: {
  contato: TicketContato
  clientes: any[]
  grupos: any[]
  onClose: () => void
  onSaved: () => void
}) {
  const [nome, setNome] = useState(contato.nome || '')
  const [email, setEmail] = useState(contato.email || '')
  const [telefoneComercial, setTelefoneComercial] = useState(contato.telefone_comercial || '')
  const [celular, setCelular] = useState(contato.celular || '')
  const [cargo, setCargo] = useState(contato.cargo || '')
  const [empresaId, setEmpresaId] = useState(contato.empresa_id || '')
  const [empresaNome, setEmpresaNome] = useState(
    contato.empresa_nome ||
    (contato.empresa_id ? (clientes.find(c => c.id === contato.empresa_id)?.nome_empresa || '') : '')
  )
  const [grupoId, setGrupoId] = useState(contato.grupo_id || '')
  const [veTodos, setVeTodos] = useState(!!contato.ve_todos_empresa)
  const [salvando, setSalvando] = useState(false)

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
        empresa_nome: empresaNome.trim() || null,
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
              <input type="text" value={telefoneComercial} onChange={e => setTelefoneComercial(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Celular</label>
              <input type="text" value={celular} onChange={e => setCelular(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Cargo</label>
            <input type="text" value={cargo} onChange={e => setCargo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Empresa</label>
            <input
              type="text"
              list="lista-empresas-contato"
              value={empresaNome}
              onChange={e => {
                const nome = e.target.value
                setEmpresaNome(nome)
                // Se o texto casar exatamente com um cliente, vincula o id; senão, deixa livre
                const match = clientes.find(c => (c.nome_empresa || '').toLowerCase() === nome.trim().toLowerCase())
                setEmpresaId(match ? match.id : '')
              }}
              placeholder="Digite o nome da empresa..."
              className={inputCls}
            />
            <datalist id="lista-empresas-contato">
              {clientes.map(c => <option key={c.id} value={c.nome_empresa} />)}
            </datalist>
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
