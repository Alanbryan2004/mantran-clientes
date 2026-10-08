import { useState, useEffect, useMemo } from 'react'
import {
  X, Calendar as CalendarIcon, Clock, MapPin, Type, AlignLeft, Users,
  Bell, Trash2, Loader2, Check, Search, Palette
} from 'lucide-react'
import clsx from 'clsx'
import { api, type EventoCalendario, type UsuarioSistema } from '../lib/api'
import { getLoggedUser } from '../lib/auth'

// Tipos de evento (categoria) com rótulo e cor do tema.
// classeAtivo/classeDot usam classes Tailwind LITERAIS (necessário para o JIT detectá-las).
export const TIPOS_EVENTO: Array<{ valor: string; label: string; cor: string; classeAtivo: string; classeDot: string; classeChip: string }> = [
  { valor: 'treinamento', label: 'Treinamento', cor: 'violet', classeAtivo: 'bg-violet-500/20 border-violet-500/50 text-violet-300', classeDot: 'bg-violet-400', classeChip: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  { valor: 'validacao', label: 'Validação', cor: 'emerald', classeAtivo: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300', classeDot: 'bg-emerald-400', classeChip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { valor: 'reuniao', label: 'Reunião', cor: 'sky', classeAtivo: 'bg-sky-500/20 border-sky-500/50 text-sky-300', classeDot: 'bg-sky-400', classeChip: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { valor: 'tarefa', label: 'Tarefa', cor: 'amber', classeAtivo: 'bg-amber-500/20 border-amber-500/50 text-amber-300', classeDot: 'bg-amber-400', classeChip: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { valor: 'outro', label: 'Outro', cor: 'slate', classeAtivo: 'bg-slate-500/20 border-slate-500/50 text-slate-300', classeDot: 'bg-slate-400', classeChip: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
]

// Helper: metadados do tipo (com fallback para 'outro')
export function tipoEventoMeta(valor?: string) {
  return TIPOS_EVENTO.find(t => t.valor === valor) || TIPOS_EVENTO[TIPOS_EVENTO.length - 1]
}

// Opções de antecedência para o lembrete (em minutos)
const OPCOES_ANTECEDENCIA: Array<{ min: number; label: string }> = [
  { min: 0, label: 'Na hora' },
  { min: 5, label: '5 minutos antes' },
  { min: 10, label: '10 minutos antes' },
  { min: 15, label: '15 minutos antes' },
  { min: 30, label: '30 minutos antes' },
  { min: 60, label: '1 hora antes' },
  { min: 120, label: '2 horas antes' },
  { min: 1440, label: '1 dia antes' },
  { min: 2880, label: '2 dias antes' },
]

// True se o perfil é de um funcionário interno da Mantran (exclui Cliente, Parceiro,
// Usuário/Consulta). Mesma regra usada em auth.ts (isFuncionarioUser).
function ehFuncionarioInterno(perfil?: string | null): boolean {
  if (!perfil) return false
  const p = perfil.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return p !== 'cliente' && p !== 'parceiro' && p !== 'usuario' && !p.includes('consulta')
}

// Converte Date -> value de <input type="datetime-local"> (horário local, sem timezone)
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// value do input (local) -> ISO (UTC) para persistir
function localInputToISO(v: string): string {
  return new Date(v).toISOString()
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  evento?: EventoCalendario | null       // se definido => edição
  dataInicial?: Date | null              // ao criar a partir de um clique no dia
  tituloInicial?: string                 // pré-preenche o título ao criar (ex: treinamento)
  tipoInicial?: string                   // pré-preenche a categoria ao criar
  descricaoInicial?: string              // pré-preenche a descrição ao criar
  localInicial?: string                  // pré-preenche o local ao criar
}

export function EventoCalendarioModal({ isOpen, onClose, onSaved, evento, dataInicial, tituloInicial, tipoInicial, descricaoInicial, localInicial }: Props) {
  const usuarioLogado = getLoggedUser()
  const isEdicao = !!evento

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [local, setLocal] = useState('')
  const [tipo, setTipo] = useState('reuniao')
  const [diaInteiro, setDiaInteiro] = useState(false)
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [minhaAntecedencia, setMinhaAntecedencia] = useState(30)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  // Avisos de conflito de horário (eventos sobrepostos). Enquanto houver, o usuário
  // precisa confirmar "Salvar mesmo assim".
  const [conflitos, setConflitos] = useState<Array<{ titulo: string; quem: string; quando: string }>>([])

  // Convidados
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [convidadosIds, setConvidadosIds] = useState<Set<string>>(new Set())
  const [buscaConvidado, setBuscaConvidado] = useState('')

  // Reset / preenchimento ao abrir
  useEffect(() => {
    if (!isOpen) return

    api.getUsuariosSistema()
      .then(list => setUsuarios((list || []).filter(u =>
        u.ativo !== false &&
        u.id !== usuarioLogado?.id &&
        ehFuncionarioInterno(u.perfil)   // só funcionários (sem Cliente/Parceiro/Consulta)
      )))
      .catch(() => setUsuarios([]))

    if (evento) {
      setTitulo(evento.titulo || '')
      setDescricao(evento.descricao || '')
      setLocal(evento.local || '')
      setTipo(evento.tipo || 'reuniao')
      setDiaInteiro(!!evento.dia_inteiro)
      setInicio(toLocalInput(new Date(evento.inicio)))
      setFim(evento.fim ? toLocalInput(new Date(evento.fim)) : '')
      const naoOrganizadores = (evento.convidados || []).filter(c => !c.organizador)
      setConvidadosIds(new Set(naoOrganizadores.map(c => c.usuario_id)))
      const meu = (evento.convidados || []).find(c => c.usuario_id === usuarioLogado?.id)
      setMinhaAntecedencia(meu?.antecedencia_min ?? 30)
    } else {
      const base = dataInicial ? new Date(dataInicial) : new Date()
      if (!dataInicial) base.setMinutes(0, 0, 0), base.setHours(base.getHours() + 1)
      const fimBase = new Date(base)
      fimBase.setHours(fimBase.getHours() + 1)
      setTitulo(tituloInicial || '')
      setDescricao(descricaoInicial || '')
      setLocal(localInicial || '')
      setTipo(tipoInicial || 'reuniao')
      setDiaInteiro(false)
      setInicio(toLocalInput(base))
      setFim(toLocalInput(fimBase))
      setConvidadosIds(new Set())
      setMinhaAntecedencia(30)
    }
    setErro('')
    setConflitos([])
    setBuscaConvidado('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, evento])

  // Ao mudar horário/convidados, zera os conflitos para forçar nova verificação
  useEffect(() => {
    setConflitos([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio, fim, diaInteiro, convidadosIds])

  const usuariosFiltrados = useMemo(() => {
    const q = buscaConvidado.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter(u =>
      (u.nome || '').toLowerCase().includes(q) ||
      (u.login || '').toLowerCase().includes(q)
    )
  }, [usuarios, buscaConvidado])

  const toggleConvidado = (id: string) => {
    setConvidadosIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const emailDoUsuario = (u?: UsuarioSistema | null) =>
    u?.email_corporativo || u?.email_pessoal || null

  const handleSalvar = async () => {
    setErro('')
    if (!titulo.trim()) { setErro('Informe um título para o evento.'); return }
    if (!inicio) { setErro('Informe a data/hora de início.'); return }
    if (fim && new Date(fim) < new Date(inicio)) { setErro('O término não pode ser antes do início.'); return }

    setSalvando(true)
    try {
      const inicioISO = localInputToISO(inicio)
      const fimISO = fim ? localInputToISO(fim) : null

      // --- Verificação de conflito de horário ---
      // Só checa na 1ª tentativa (quando ainda não há conflitos exibidos). Se o usuário
      // já viu os avisos e clicou de novo, respeita a decisão e segue o salvamento.
      if (conflitos.length === 0 && !diaInteiro) {
        const idsParticipantes = [usuarioLogado?.id, ...Array.from(convidadosIds)].filter(Boolean) as string[]
        const achados = await api.getEventosConflitantes(
          inicioISO,
          fimISO || inicioISO,
          idsParticipantes,
          isEdicao ? evento?.id : undefined
        )
        if (achados.length > 0) {
          const nomePorId = new Map<string, string>()
          nomePorId.set(usuarioLogado?.id || '', 'Você')
          usuarios.forEach(u => nomePorId.set(u.id, u.nome || u.login))
          const resumo = achados.map(a => ({
            titulo: a.evento.titulo,
            quem: a.usuariosEmConflito.map(id => nomePorId.get(id) || 'participante').join(', '),
            quando: new Date(a.evento.inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              + (a.evento.fim ? ` – ${new Date(a.evento.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''),
          }))
          setConflitos(resumo)
          setSalvando(false)
          return
        }
      }

      // Monta a lista de convidados: organizador (logado) + selecionados
      const convidados = [
        {
          usuario_id: usuarioLogado?.id || '',
          usuario_nome: usuarioLogado?.nome || usuarioLogado?.login || '',
          usuario_email: usuarioLogado?.email_corporativo || usuarioLogado?.email_pessoal || null,
          organizador: true,
          antecedencia_min: minhaAntecedencia,
        },
        ...Array.from(convidadosIds).map(id => {
          const u = usuarios.find(x => x.id === id)
          return {
            usuario_id: id,
            usuario_nome: u?.nome || u?.login || '',
            usuario_email: emailDoUsuario(u),
            organizador: false,
            antecedencia_min: 30,
          }
        }),
      ].filter(c => c.usuario_id)

      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        local: local.trim() || null,
        tipo,
        cor: TIPOS_EVENTO.find(t => t.valor === tipo)?.cor || null,
        inicio: inicioISO,
        fim: fimISO,
        dia_inteiro: diaInteiro,
        criado_por_id: usuarioLogado?.id || null,
        criado_por_nome: usuarioLogado?.nome || usuarioLogado?.login || null,
        convidados,
      }

      if (isEdicao && evento) {
        await api.updateEventoCalendario(evento.id, payload)
      } else {
        await api.createEventoCalendario(payload)
      }
      onSaved()
      onClose()
    } catch (err: any) {
      setErro('Erro ao salvar: ' + (err?.message || 'desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!evento) return
    if (!window.confirm(`Excluir o evento "${evento.titulo}"? Os convidados perderão o lembrete.`)) return
    setSalvando(true)
    try {
      await api.deleteEventoCalendario(evento.id)
      onSaved()
      onClose()
    } catch (err: any) {
      setErro('Erro ao excluir: ' + (err?.message || 'desconhecido'))
    } finally {
      setSalvando(false)
    }
  }

  if (!isOpen) return null

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-dark-bg border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 transition-colors'
  const labelCls = 'flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <h2 className="text-base font-bold text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <CalendarIcon className="w-5 h-5" />
            </span>
            {isEdicao ? 'Editar evento' : 'Novo evento'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {erro && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
              {erro}
            </div>
          )}

          {conflitos.length > 0 && (
            <div className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-200 text-sm space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Bell className="w-4 h-4" /> Conflito de horário detectado
              </div>
              <p className="text-xs text-amber-200/90">Já existe {conflitos.length > 1 ? 'eventos' : 'um evento'} nesse horário:</p>
              <ul className="text-xs space-y-1">
                {conflitos.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span><strong>{c.titulo}</strong> ({c.quando}) — {c.quem}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-200/80 pt-0.5">Revise o horário ou clique novamente em salvar para agendar mesmo assim.</p>
            </div>
          )}

          {/* Título */}
          <div>
            <label className={labelCls}><Type className="w-3.5 h-3.5" /> Título <span className="text-red-400">*</span></label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Treinamento WMS - Cliente X" className={inputCls} autoFocus />
          </div>

          {/* Tipo (categoria) */}
          <div>
            <label className={labelCls}><Palette className="w-3.5 h-3.5" /> Categoria</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS_EVENTO.map(t => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => setTipo(t.valor)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                    tipo === t.valor
                      ? t.classeAtivo
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dia inteiro */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={diaInteiro} onChange={e => setDiaInteiro(e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-dark-bg text-brand-600 focus:ring-brand-500" />
            <span className="text-sm text-slate-300">Evento de dia inteiro</span>
          </label>

          {/* Datas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}><Clock className="w-3.5 h-3.5" /> Início <span className="text-red-400">*</span></label>
              <input
                type={diaInteiro ? 'date' : 'datetime-local'}
                value={diaInteiro ? inicio.slice(0, 10) : inicio}
                onChange={e => setInicio(diaInteiro ? `${e.target.value}T00:00` : e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}><Clock className="w-3.5 h-3.5" /> Término</label>
              <input
                type={diaInteiro ? 'date' : 'datetime-local'}
                value={diaInteiro ? (fim ? fim.slice(0, 10) : '') : fim}
                onChange={e => setFim(diaInteiro ? `${e.target.value}T23:59` : e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Local */}
          <div>
            <label className={labelCls}><MapPin className="w-3.5 h-3.5" /> Local / Link</label>
            <input type="text" value={local} onChange={e => setLocal(e.target.value)} placeholder="Sala, endereço ou link da reunião" className={inputCls} />
          </div>

          {/* Descrição */}
          <div>
            <label className={labelCls}><AlignLeft className="w-3.5 h-3.5" /> Descrição</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Detalhes, pauta, materiais..." className={clsx(inputCls, 'resize-none')} />
          </div>

          {/* Meu lembrete (antecedência) */}
          <div>
            <label className={labelCls}><Bell className="w-3.5 h-3.5" /> Meu lembrete (antecedência)</label>
            <select value={minhaAntecedencia} onChange={e => setMinhaAntecedencia(Number(e.target.value))} className={inputCls}>
              {OPCOES_ANTECEDENCIA.map(o => <option key={o.min} value={o.min}>{o.label}</option>)}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Você será avisado pelo sininho (e por e-mail, se configurado) com essa antecedência.</p>
          </div>

          {/* Convidados */}
          <div>
            <label className={labelCls}><Users className="w-3.5 h-3.5" /> Convidados {convidadosIds.size > 0 && <span className="text-brand-400 normal-case">({convidadosIds.size})</span>}</label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={buscaConvidado} onChange={e => setBuscaConvidado(e.target.value)} placeholder="Buscar colaborador..." className={clsx(inputCls, 'pl-9')} />
            </div>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-700 bg-dark-bg divide-y divide-slate-800">
              {usuariosFiltrados.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-500">Nenhum colaborador encontrado.</div>
              ) : (
                usuariosFiltrados.map(u => {
                  const marcado = convidadosIds.has(u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleConvidado(u.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-800/60 transition-colors"
                    >
                      <span className={clsx(
                        'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                        marcado ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-600 text-transparent'
                      )}>
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 uppercase shrink-0 overflow-hidden">
                        {u.foto_url ? <img src={u.foto_url} alt={u.nome} className="w-full h-full object-cover" /> : (u.nome || u.login || 'U').charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-slate-200 truncate">{u.nome || u.login}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{u.perfil}</span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between gap-2 shrink-0">
          <div>
            {isEdicao && (
              <button onClick={handleExcluir} disabled={salvando} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={salvando} className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className={clsx(
                'px-4 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-60',
                conflitos.length > 0 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-600 hover:bg-brand-700'
              )}
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {salvando ? 'Salvando...' : conflitos.length > 0 ? 'Agendar mesmo assim' : isEdicao ? 'Salvar alterações' : 'Criar evento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
