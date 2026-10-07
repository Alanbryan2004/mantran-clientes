import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin,
  Users, RefreshCw, CalendarDays, CalendarRange, List, Loader2, CheckCircle2,
  XCircle, HelpCircle, CircleDot
} from 'lucide-react'
import clsx from 'clsx'
import { api, type EventoCalendario } from '../lib/api'
import { getLoggedUser } from '../lib/auth'
import { getFeriadosNacionais } from '../lib/feriados'
import { EventoCalendarioModal, tipoEventoMeta } from '../components/EventoCalendarioModal'
import { supabase } from '../lib/supabase'

type Visao = 'mes' | 'semana' | 'dia' | 'agenda'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// --- Helpers de data ---
function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function mesmaData(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function inicioDaSemana(d: Date): Date {
  const r = new Date(d)
  r.setDate(r.getDate() - r.getDay())
  r.setHours(0, 0, 0, 0)
  return r
}
function addDias(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function horaFmt(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function Calendario() {
  const usuario = getLoggedUser()
  const [visao, setVisao] = useState<Visao>('mes')
  const [cursor, setCursor] = useState(new Date())            // data de referência da visão
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [loading, setLoading] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)
  const [eventoEditando, setEventoEditando] = useState<EventoCalendario | null>(null)
  const [dataNovoEvento, setDataNovoEvento] = useState<Date | null>(null)
  const [eventoDetalhe, setEventoDetalhe] = useState<EventoCalendario | null>(null)

  // Intervalo [de, ate) carregado conforme a visão
  const intervalo = useMemo(() => {
    if (visao === 'dia') {
      const de = new Date(cursor); de.setHours(0, 0, 0, 0)
      return { de, ate: addDias(de, 1) }
    }
    if (visao === 'semana') {
      const de = inicioDaSemana(cursor)
      return { de, ate: addDias(de, 7) }
    }
    if (visao === 'agenda') {
      const de = new Date(cursor); de.setHours(0, 0, 0, 0)
      return { de, ate: addDias(de, 60) }
    }
    // mês: inclui dias "vazantes" das semanas do grid
    const primeiro = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const de = inicioDaSemana(primeiro)
    return { de, ate: addDias(de, 42) }
  }, [visao, cursor])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const lista = await api.getEventosCalendario(intervalo.de.toISOString(), intervalo.ate.toISOString())
      setEventos(lista)
    } catch (err) {
      console.error('Erro ao carregar eventos:', err)
    } finally {
      setLoading(false)
    }
  }, [intervalo.de, intervalo.ate])

  useEffect(() => { carregar() }, [carregar])

  // Realtime: recarrega quando qualquer evento/convidado muda
  useEffect(() => {
    const ch = supabase
      .channel('realtime:calendario')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendario_eventos' }, () => carregar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendario_convidados' }, () => carregar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [carregar])

  // Feriados do(s) ano(s) visíveis
  const feriados = useMemo(() => {
    const anos = new Set([intervalo.de.getFullYear(), intervalo.ate.getFullYear()])
    const map = new Map<string, string>()
    anos.forEach(ano => getFeriadosNacionais(ano).forEach(f => map.set(f.data, f.nome)))
    return map
  }, [intervalo.de, intervalo.ate])

  // Eventos agrupados por dia (YYYY-MM-DD)
  const eventosPorDia = useMemo(() => {
    const map = new Map<string, EventoCalendario[]>()
    for (const ev of eventos) {
      const chave = ymd(new Date(ev.inicio))
      if (!map.has(chave)) map.set(chave, [])
      map.get(chave)!.push(ev)
    }
    for (const arr of map.values()) arr.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    return map
  }, [eventos])

  // --- Navegação ---
  const irHoje = () => setCursor(new Date())
  const navegar = (dir: -1 | 1) => {
    setCursor(prev => {
      const r = new Date(prev)
      if (visao === 'mes') r.setMonth(r.getMonth() + dir)
      else if (visao === 'semana') r.setDate(r.getDate() + dir * 7)
      else if (visao === 'dia') r.setDate(r.getDate() + dir)
      else r.setDate(r.getDate() + dir * 30)
      return r
    })
  }

  const abrirNovo = (data?: Date) => {
    setEventoEditando(null)
    setDataNovoEvento(data || null)
    setModalAberto(true)
  }
  const abrirEdicao = (ev: EventoCalendario) => {
    setEventoDetalhe(null)
    setEventoEditando(ev)
    setDataNovoEvento(null)
    setModalAberto(true)
  }

  const tituloPeriodo = useMemo(() => {
    if (visao === 'mes') return `${MESES[cursor.getMonth()]} de ${cursor.getFullYear()}`
    if (visao === 'dia') return cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    if (visao === 'semana') {
      const ini = inicioDaSemana(cursor); const fim = addDias(ini, 6)
      return `${ini.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
    }
    return 'Próximos 60 dias'
  }, [visao, cursor])

  return (
    <div className="p-6 space-y-5">
      {/* Título da página */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <CalendarIcon className="w-5 h-5" />
            </span>
            Calendário
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-0.5">Treinamentos, validações, reuniões e tarefas da equipe — com lembretes automáticos.</p>
        </div>
        <button onClick={() => abrirNovo()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors shadow-lg shadow-brand-900/30">
          <Plus className="w-4 h-4" /> Novo evento
        </button>
      </div>

      {/* Barra de controles */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-dark-card border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navegar(-1)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={irHoje} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">Hoje</button>
          <button onClick={() => navegar(1)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"><ChevronRight className="w-5 h-5" /></button>
          <span className="ml-2 text-sm font-bold text-white capitalize">{tituloPeriodo}</span>
          {loading && <Loader2 className="w-4 h-4 text-brand-400 animate-spin ml-1" />}
        </div>

        <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1 border border-slate-700">
          {([
            { v: 'mes', label: 'Mês', icon: CalendarDays },
            { v: 'semana', label: 'Semana', icon: CalendarRange },
            { v: 'dia', label: 'Dia', icon: CalendarIcon },
            { v: 'agenda', label: 'Agenda', icon: List },
          ] as const).map(({ v, label, icon: Icon }) => (
            <button
              key={v}
              onClick={() => setVisao(v)}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                visao === v ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200 border border-transparent'
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
          <button onClick={carregar} title="Atualizar" className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ml-0.5">
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin text-brand-400')} />
          </button>
        </div>
      </div>

      {/* Conteúdo da visão */}
      {visao === 'mes' && (
        <VisaoMes cursor={cursor} eventosPorDia={eventosPorDia} feriados={feriados} onDiaClick={abrirNovo} onEventoClick={setEventoDetalhe} />
      )}
      {visao === 'semana' && (
        <VisaoSemana cursor={cursor} eventosPorDia={eventosPorDia} feriados={feriados} onDiaClick={abrirNovo} onEventoClick={setEventoDetalhe} />
      )}
      {visao === 'dia' && (
        <VisaoDia eventos={eventosPorDia.get(ymd(cursor)) || []} feriado={feriados.get(ymd(cursor))} onNovo={() => abrirNovo(cursor)} onEventoClick={setEventoDetalhe} />
      )}
      {visao === 'agenda' && (
        <VisaoAgenda eventos={eventos} onEventoClick={setEventoDetalhe} />
      )}

      {/* Modal criar/editar */}
      <EventoCalendarioModal
        isOpen={modalAberto}
        evento={eventoEditando}
        dataInicial={dataNovoEvento}
        onClose={() => setModalAberto(false)}
        onSaved={carregar}
      />

      {/* Detalhe do evento */}
      {eventoDetalhe && (
        <DetalheEvento
          evento={eventoDetalhe}
          usuarioId={usuario?.id}
          onClose={() => setEventoDetalhe(null)}
          onEditar={() => abrirEdicao(eventoDetalhe)}
          onRespondeu={carregar}
        />
      )}
    </div>
  )
}

// ------------------------------------------------------------
// Pílula de evento (reutilizada nas visões)
// ------------------------------------------------------------
function PilulaEvento({ ev, onClick, compacta }: { ev: EventoCalendario; onClick: () => void; compacta?: boolean }) {
  const meta = tipoEventoMeta(ev.tipo)
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={clsx('w-full text-left rounded-md border px-1.5 py-1 truncate transition-colors hover:brightness-125', meta.classeChip)}
      title={ev.titulo}
    >
      <span className="inline-flex items-center gap-1 w-full">
        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', meta.classeDot)} />
        {!ev.dia_inteiro && !compacta && <span className="text-[10px] font-mono opacity-80 shrink-0">{horaFmt(ev.inicio)}</span>}
        <span className="text-[11px] font-semibold truncate">{ev.titulo}</span>
      </span>
    </button>
  )
}

// ------------------------------------------------------------
// Visão Mês
// ------------------------------------------------------------
function VisaoMes({ cursor, eventosPorDia, feriados, onDiaClick, onEventoClick }: {
  cursor: Date
  eventosPorDia: Map<string, EventoCalendario[]>
  feriados: Map<string, string>
  onDiaClick: (d: Date) => void
  onEventoClick: (ev: EventoCalendario) => void
}) {
  const hoje = new Date()
  const primeiro = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const inicioGrid = inicioDaSemana(primeiro)
  const dias = Array.from({ length: 42 }, (_, i) => addDias(inicioGrid, i))

  return (
    <div className="bg-dark-card border border-slate-800 rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-800">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="py-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((dia, i) => {
          const chave = ymd(dia)
          const doMes = dia.getMonth() === cursor.getMonth()
          const ehHoje = mesmaData(dia, hoje)
          const feriado = feriados.get(chave)
          const evs = eventosPorDia.get(chave) || []
          const fds = dia.getDay() === 0 || dia.getDay() === 6
          return (
            <div
              key={i}
              onClick={() => onDiaClick(dia)}
              className={clsx(
                'min-h-[104px] border-b border-r border-slate-800 p-1.5 cursor-pointer transition-colors hover:bg-slate-800/40 group',
                !doMes && 'bg-slate-900/40',
                i % 7 === 6 && 'border-r-0'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={clsx(
                  'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                  ehHoje ? 'bg-brand-600 text-white' : doMes ? (fds ? 'text-slate-500' : 'text-slate-300') : 'text-slate-600'
                )}>
                  {dia.getDate()}
                </span>
                <Plus className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {feriado && (
                <div className="text-[10px] text-rose-400 font-medium truncate mb-0.5" title={feriado}>🎌 {feriado}</div>
              )}
              <div className="space-y-0.5">
                {evs.slice(0, 3).map(ev => <PilulaEvento key={ev.id} ev={ev} onClick={() => onEventoClick(ev)} compacta />)}
                {evs.length > 3 && <div className="text-[10px] text-slate-500 font-semibold pl-1">+{evs.length - 3} mais</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Visão Semana
// ------------------------------------------------------------
function VisaoSemana({ cursor, eventosPorDia, feriados, onDiaClick, onEventoClick }: {
  cursor: Date
  eventosPorDia: Map<string, EventoCalendario[]>
  feriados: Map<string, string>
  onDiaClick: (d: Date) => void
  onEventoClick: (ev: EventoCalendario) => void
}) {
  const hoje = new Date()
  const ini = inicioDaSemana(cursor)
  const dias = Array.from({ length: 7 }, (_, i) => addDias(ini, i))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
      {dias.map((dia, i) => {
        const chave = ymd(dia)
        const ehHoje = mesmaData(dia, hoje)
        const evs = eventosPorDia.get(chave) || []
        const feriado = feriados.get(chave)
        return (
          <div key={i} className={clsx('bg-dark-card border rounded-xl p-2.5 min-h-[160px] flex flex-col', ehHoje ? 'border-brand-500/40' : 'border-slate-800')}>
            <button onClick={() => onDiaClick(dia)} className="flex items-center justify-between mb-2 text-left group">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase">{DIAS_SEMANA[dia.getDay()]}</div>
                <div className={clsx('text-lg font-bold', ehHoje ? 'text-brand-400' : 'text-slate-200')}>{dia.getDate()}</div>
              </div>
              <Plus className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            {feriado && <div className="text-[10px] text-rose-400 font-medium truncate mb-1">🎌 {feriado}</div>}
            <div className="space-y-1 flex-1">
              {evs.length === 0 ? (
                <div className="text-[11px] text-slate-600 italic">Sem eventos</div>
              ) : evs.map(ev => <PilulaEvento key={ev.id} ev={ev} onClick={() => onEventoClick(ev)} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------
// Visão Dia
// ------------------------------------------------------------
function VisaoDia({ eventos, feriado, onNovo, onEventoClick }: {
  eventos: EventoCalendario[]
  feriado?: string
  onNovo: () => void
  onEventoClick: (ev: EventoCalendario) => void
}) {
  return (
    <div className="bg-dark-card border border-slate-800 rounded-xl p-5">
      {feriado && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-medium">🎌 Feriado nacional: {feriado}</div>
      )}
      {eventos.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3"><CalendarIcon className="w-7 h-7" /></div>
          <p className="text-slate-300 font-semibold">Nenhum evento neste dia</p>
          <button onClick={onNovo} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors">
            <Plus className="w-4 h-4" /> Adicionar evento
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {eventos.map(ev => <CardEventoLista key={ev.id} ev={ev} onClick={() => onEventoClick(ev)} />)}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------
// Visão Agenda (lista cronológica agrupada por dia)
// ------------------------------------------------------------
function VisaoAgenda({ eventos, onEventoClick }: { eventos: EventoCalendario[]; onEventoClick: (ev: EventoCalendario) => void }) {
  const grupos = useMemo(() => {
    const map = new Map<string, EventoCalendario[]>()
    for (const ev of [...eventos].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())) {
      const chave = ymd(new Date(ev.inicio))
      if (!map.has(chave)) map.set(chave, [])
      map.get(chave)!.push(ev)
    }
    return Array.from(map.entries())
  }, [eventos])

  if (grupos.length === 0) {
    return (
      <div className="bg-dark-card border border-slate-800 rounded-xl py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3"><List className="w-7 h-7" /></div>
        <p className="text-slate-300 font-semibold">Nenhum evento nos próximos 60 dias</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {grupos.map(([chave, evs]) => {
        const d = new Date(chave + 'T12:00:00')
        const ehHoje = mesmaData(d, new Date())
        return (
          <div key={chave} className="bg-dark-card border border-slate-800 rounded-xl overflow-hidden">
            <div className={clsx('px-4 py-2 border-b border-slate-800 flex items-center gap-2', ehHoje ? 'bg-brand-500/10' : 'bg-slate-900/40')}>
              <span className={clsx('text-sm font-bold', ehHoje ? 'text-brand-300' : 'text-slate-200')}>
                {d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </span>
              {ehHoje && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">Hoje</span>}
            </div>
            <div className="p-3 space-y-2">
              {evs.map(ev => <CardEventoLista key={ev.id} ev={ev} onClick={() => onEventoClick(ev)} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Card de evento usado nas visões Dia/Agenda
function CardEventoLista({ ev, onClick }: { ev: EventoCalendario; onClick: () => void }) {
  const meta = tipoEventoMeta(ev.tipo)
  const nConvidados = (ev.convidados || []).length
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-slate-900/40 border border-slate-800 rounded-xl p-3 flex items-start gap-3 hover:border-slate-700 hover:bg-slate-800/40 transition-all"
    >
      <div className={clsx('w-1.5 self-stretch rounded-full shrink-0', meta.classeDot)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-white truncate">{ev.titulo}</span>
          <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border', meta.classeChip)}>{meta.label}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 flex-wrap text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {ev.dia_inteiro ? 'Dia inteiro' : `${horaFmt(ev.inicio)}${ev.fim ? ' – ' + horaFmt(ev.fim) : ''}`}</span>
          {ev.local && <span className="inline-flex items-center gap-1 truncate"><MapPin className="w-3 h-3" /> {ev.local}</span>}
          {nConvidados > 0 && <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {nConvidados}</span>}
        </div>
      </div>
    </button>
  )
}

// ------------------------------------------------------------
// Detalhe do evento (modal) + resposta ao convite
// ------------------------------------------------------------
function DetalheEvento({ evento, usuarioId, onClose, onEditar, onRespondeu }: {
  evento: EventoCalendario
  usuarioId?: string
  onClose: () => void
  onEditar: () => void
  onRespondeu: () => void
}) {
  const meta = tipoEventoMeta(evento.tipo)
  const [salvando, setSalvando] = useState<string | null>(null)
  const meuConvite = (evento.convidados || []).find(c => c.usuario_id === usuarioId)
  const souOrganizador = evento.criado_por_id === usuarioId || meuConvite?.organizador

  const responder = async (status: 'aceito' | 'recusado' | 'talvez') => {
    if (!meuConvite) return
    setSalvando(status)
    try {
      await api.responderConviteCalendario(meuConvite.id, status)
      onRespondeu()
      onClose()
    } finally {
      setSalvando(null)
    }
  }

  const d = new Date(evento.inicio)

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-dark-card border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={clsx('px-5 py-4 border-b border-slate-800 flex items-start justify-between gap-3')}>
          <div className="min-w-0">
            <span className={clsx('inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1.5', meta.classeChip)}>{meta.label}</span>
            <h2 className="text-lg font-bold text-white break-words">{evento.titulo}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 shrink-0"><XCircle className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <span className="capitalize">{d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{evento.dia_inteiro ? 'Dia inteiro' : `${horaFmt(evento.inicio)}${evento.fim ? ' até ' + horaFmt(evento.fim) : ''}`}</span>
          </div>
          {evento.local && (
            <div className="flex items-center gap-2 text-slate-300"><MapPin className="w-4 h-4 text-slate-500" /><span className="break-words">{evento.local}</span></div>
          )}
          {evento.descricao && (
            <div className="pt-2 border-t border-slate-800 text-slate-300 whitespace-pre-wrap">{evento.descricao}</div>
          )}

          {/* Convidados */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
              <Users className="w-3.5 h-3.5" /> Convidados ({(evento.convidados || []).length})
            </div>
            <div className="space-y-1.5">
              {(evento.convidados || []).map(c => (
                <div key={c.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-200 uppercase shrink-0">
                      {(c.usuario_nome || 'U').charAt(0)}
                    </span>
                    <span className="text-sm text-slate-300 truncate">{c.usuario_nome}{c.organizador && <span className="text-[10px] text-brand-400 ml-1">(organizador)</span>}</span>
                  </span>
                  <StatusConvite status={c.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between gap-2">
          {/* Resposta ao convite (apenas convidado não-organizador) */}
          {meuConvite && !souOrganizador ? (
            <div className="flex items-center gap-2">
              <BotaoResposta ativo={meuConvite.status === 'aceito'} loading={salvando === 'aceito'} onClick={() => responder('aceito')} cor="emerald" icon={CheckCircle2} label="Aceitar" />
              <BotaoResposta ativo={meuConvite.status === 'talvez'} loading={salvando === 'talvez'} onClick={() => responder('talvez')} cor="amber" icon={HelpCircle} label="Talvez" />
              <BotaoResposta ativo={meuConvite.status === 'recusado'} loading={salvando === 'recusado'} onClick={() => responder('recusado')} cor="rose" icon={XCircle} label="Recusar" />
            </div>
          ) : <span />}
          {souOrganizador && (
            <button onClick={onEditar} className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold transition-colors">Editar evento</button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusConvite({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    aceito: { label: 'Aceito', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', Icon: CheckCircle2 },
    recusado: { label: 'Recusado', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30', Icon: XCircle },
    talvez: { label: 'Talvez', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', Icon: HelpCircle },
    pendente: { label: 'Pendente', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30', Icon: CircleDot },
  }
  const m = map[status] || map.pendente
  const Icon = m.Icon
  return <span className={clsx('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0', m.cls)}><Icon className="w-3 h-3" /> {m.label}</span>
}

function BotaoResposta({ ativo, loading, onClick, cor, icon: Icon, label }: { ativo: boolean; loading: boolean; onClick: () => void; cor: string; icon: any; label: string }) {
  // classes literais para o JIT
  const corMap: Record<string, { on: string; off: string }> = {
    emerald: { on: 'bg-emerald-500 border-emerald-500 text-white', off: 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10' },
    amber: { on: 'bg-amber-500 border-amber-500 text-white', off: 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10' },
    rose: { on: 'bg-rose-500 border-rose-500 text-white', off: 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10' },
  }
  const c = corMap[cor] || corMap.emerald
  return (
    <button onClick={onClick} disabled={loading} className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50', ativo ? c.on : c.off)}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />} {label}
    </button>
  )
}
