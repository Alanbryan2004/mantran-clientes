import { useState, useEffect, useMemo } from 'react'
import {
  X, Calendar as CalendarIcon, Clock, UserCheck, AlertCircle, CheckCircle2,
  History, Loader2, RefreshCw, Lock
} from 'lucide-react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { getLoggedUser } from '../lib/auth'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  implantacao: any
  etapa: { id: string; nome_etapa: string } | null
  nomeEtapaNormalizado: string
  agendamentoAtual?: any | null
}

const SLOTS_PADRAO = [
  { ini: '08:00', fim: '09:00' },
  { ini: '09:00', fim: '10:00' },
  { ini: '10:00', fim: '11:00' },
  { ini: '11:00', fim: '12:00' },
  { ini: '13:30', fim: '14:30' },
  { ini: '14:00', fim: '15:00' },
  { ini: '15:00', fim: '16:00' },
  { ini: '16:00', fim: '17:00' },
  { ini: '17:00', fim: '18:00' },
]

function extrairDataLocalYMD(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function extrairHoraLocalHM(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function somarUmaHora(hm: string): string {
  const [h, m] = hm.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return '10:00'
  const totalMin = h * 60 + m + 60
  const nh = Math.min(23, Math.floor(totalMin / 60))
  const nm = totalMin % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export function AgendarEtapaModal({
  isOpen,
  onClose,
  onSaved,
  implantacao,
  etapa,
  nomeEtapaNormalizado,
  agendamentoAtual
}: Props) {
  const usuarioLogado = getLoggedUser()
  const isReplanejamento = !!agendamentoAtual?.inicio

  const [dataYMD, setDataYMD] = useState('')
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFim, setHoraFim] = useState('10:00')
  const [motivo, setMotivo] = useState('')
  const [analista, setAnalista] = useState<{ id: string | null; nome: string; email: string | null }>({
    id: implantacao?.analista_responsavel_id || null,
    nome: implantacao?.analista_responsavel || 'Analista Responsável',
    email: null
  })
  const [ocupadosNoDia, setOcupadosNoDia] = useState<Array<{ id: string; inicio: string; fim: string; dia_inteiro: boolean; titulo: string }>>([])
  const [carregandoAgenda, setCarregandoAgenda] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Inicializa campos ao abrir o modal
  useEffect(() => {
    if (!isOpen || !etapa) return
    setErro('')
    setMotivo('')

    if (agendamentoAtual?.inicio) {
      const dtIni = new Date(agendamentoAtual.inicio)
      const dtFim = agendamentoAtual.fim ? new Date(agendamentoAtual.fim) : new Date(dtIni.getTime() + 60 * 60000)
      setDataYMD(extrairDataLocalYMD(dtIni))
      setHoraInicio(extrairHoraLocalHM(dtIni))
      setHoraFim(extrairHoraLocalHM(dtFim))
    } else {
      const amanha = new Date()
      amanha.setDate(amanha.getDate() + 1)
      setDataYMD(extrairDataLocalYMD(amanha))
      setHoraInicio('09:00')
      setHoraFim('10:00')
    }

    api.resolverAnalistaImplantacao(implantacao)
      .then(a => setAnalista(a))
      .catch(() => {})
  }, [isOpen, etapa, agendamentoAtual, implantacao])

  // Consulta os horários ocupados do analista sempre que a data ou o analista mudar
  useEffect(() => {
    if (!isOpen || !dataYMD || !analista.id) {
      setOcupadosNoDia([])
      return
    }
    let ativo = true
    setCarregandoAgenda(true)
    api.getHorariosOcupadosAnalistaNoDia(analista.id, dataYMD, agendamentoAtual?.evento_calendario_id)
      .then(lista => {
        if (ativo) setOcupadosNoDia(lista)
      })
      .catch(() => {
        if (ativo) setOcupadosNoDia([])
      })
      .finally(() => {
        if (ativo) setCarregandoAgenda(false)
      })
    return () => { ativo = false }
  }, [isOpen, dataYMD, analista.id, agendamentoAtual?.evento_calendario_id])

  // Verifica se um intervalo [iniHM, fimHM) na dataYMD conflita com algum evento ocupado do analista
  const verificarSlotOcupado = (iniHM: string, fimHM: string): boolean => {
    if (!dataYMD || !iniHM || !fimHM || ocupadosNoDia.length === 0) return false
    const [ano, mes, dia] = dataYMD.split('-').map(Number)
    const [hI, mI] = iniHM.split(':').map(Number)
    const [hF, mF] = fimHM.split(':').map(Number)
    if (!ano || isNaN(hI) || isNaN(hF)) return false

    const slotIniMs = new Date(ano, mes - 1, dia, hI, mI, 0, 0).getTime()
    const slotFimMs = new Date(ano, mes - 1, dia, hF, mF, 0, 0).getTime()
    if (slotFimMs <= slotIniMs) return false

    return ocupadosNoDia.some(ev => {
      if (ev.dia_inteiro) return true
      const evIniMs = new Date(ev.inicio).getTime()
      const evFimMs = new Date(ev.fim).getTime()
      return slotIniMs < evFimMs && evIniMs < slotFimMs
    })
  }

  const horarioSelecionadoConflita = useMemo(() => {
    return verificarSlotOcupado(horaInicio, horaFim)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataYMD, horaInicio, horaFim, ocupadosNoDia])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!etapa) return
    setErro('')

    if (!dataYMD) {
      setErro('Selecione a data em que realizará este processo.')
      return
    }
    if (!horaInicio || !horaFim) {
      setErro('Informe o horário de início e término.')
      return
    }

    const [ano, mes, dia] = dataYMD.split('-').map(Number)
    const [hI, mI] = horaInicio.split(':').map(Number)
    const [hF, mF] = horaFim.split(':').map(Number)
    const dtIni = new Date(ano, mes - 1, dia, hI, mI, 0, 0)
    const dtFim = new Date(ano, mes - 1, dia, hF, mF, 0, 0)

    if (dtFim <= dtIni) {
      setErro('O horário de término deve ser maior que o horário de início.')
      return
    }

    if (horarioSelecionadoConflita) {
      setErro(`O horário das ${horaInicio} às ${horaFim} já está preenchido no calendário do analista ${analista.nome}. Escolha um horário livre.`)
      return
    }

    if (isReplanejamento && !motivo.trim()) {
      setErro('Informe brevemente o motivo do replanejamento para registro no histórico da implantação.')
      return
    }

    setSalvando(true)
    try {
      await api.agendarEtapaImplantacao({
        implantacao,
        etapa: { id: etapa.id, nome_etapa: nomeEtapaNormalizado },
        inicioISO: dtIni.toISOString(),
        fimISO: dtFim.toISOString(),
        motivoReplanejamento: motivo.trim() || undefined,
        usuarioLogado
      })
      onSaved()
      onClose()
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível salvar o agendamento.')
    } finally {
      setSalvando(false)
    }
  }

  if (!isOpen || !etapa) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-dark-card border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={clsx(
              "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
              isReplanejamento
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : "bg-brand-500/15 border-brand-500/30 text-brand-400"
            )}>
              {isReplanejamento ? <RefreshCw className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-white truncate">
                {isReplanejamento ? 'Replanejar Data da Etapa' : 'Agendar Data da Etapa'}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Etapa: <strong className="text-slate-200">{nomeEtapaNormalizado}</strong> • {implantacao?.nome_empresa}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <form onSubmit={handleSalvar} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {/* Analista Responsável vinculado */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserCheck className="w-4 h-4 text-brand-400 shrink-0" />
              <div className="text-xs">
                <span className="text-slate-400">Agenda sincronizada com o Analista Responsável: </span>
                <strong className="text-white font-bold">{analista.nome}</strong>
              </div>
            </div>
            {carregandoAgenda && (
              <Loader2 className="w-4 h-4 text-brand-400 animate-spin shrink-0" />
            )}
          </div>

          {/* Info de agendamento atual se for replanejamento */}
          {isReplanejamento && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Data atualmente agendada:
                </span>
                <span className="font-mono font-bold text-white bg-slate-900/80 px-2.5 py-0.5 rounded border border-amber-500/30">
                  {new Date(agendamentoAtual.inicio).toLocaleDateString('pt-BR')} das{' '}
                  {new Date(agendamentoAtual.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {agendamentoAtual.fim ? ` às ${new Date(agendamentoAtual.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </span>
              </div>
              {Array.isArray(agendamentoAtual.replanejamentos) && agendamentoAtual.replanejamentos.length > 0 && (
                <div className="pt-2 border-t border-amber-500/20 text-[11px] text-amber-200/80 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <History className="w-3 h-3" />
                    Replanejamentos anteriores ({agendamentoAtual.replanejamentos.length}):
                  </div>
                  {agendamentoAtual.replanejamentos.slice(-3).map((rep: any, i: number) => (
                    <div key={i} className="text-[10px] text-slate-300 font-mono">
                      • {new Date(rep.de_inicio).toLocaleDateString('pt-BR')} {new Date(rep.de_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {' → '}
                      {new Date(rep.para_inicio).toLocaleDateString('pt-BR')} {new Date(rep.para_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {rep.motivo ? ` (${rep.motivo})` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(nomeEtapaNormalizado || '').trim().toLowerCase() === 'checkpoint' ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Ao definir a data do <strong>Checkpoint</strong>, as etapas de <strong>Configurar Base</strong> (1 dia útil após o Checkpoint) e <strong>Testes</strong> (1 dia útil após Configurar Base) serão programadas automaticamente.
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                A etapa de <strong>Feedback</strong> será programada automaticamente para <strong>15 dias após a última data definida pelo cliente</strong>.
              </span>
            </div>
          )}

          {erro && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Seleção de Data e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Data <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={dataYMD}
                onChange={e => setDataYMD(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Hora Início <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={e => {
                  const novoIni = e.target.value
                  setHoraInicio(novoIni)
                  setHoraFim(somarUmaHora(novoIni))
                }}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Hora Término <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={horaFim}
                onChange={e => setHoraFim(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Grade visual de horários livres vs ocupados no dia */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sugestões de Horário ({dataYMD ? new Date(`${dataYMD}T12:00:00`).toLocaleDateString('pt-BR') : 'Selecione o dia'})
              </span>
              <span className="text-[11px] text-slate-500">
                {ocupadosNoDia.length === 0 ? 'Todos os horários livres' : `${ocupadosNoDia.length} compromisso(s) na agenda do analista`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {SLOTS_PADRAO.map(slot => {
                const ocupado = verificarSlotOcupado(slot.ini, slot.fim)
                const selecionado = horaInicio === slot.ini && horaFim === slot.fim
                return (
                  <button
                    key={slot.ini}
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      setHoraInicio(slot.ini)
                      setHoraFim(slot.fim)
                    }}
                    title={ocupado ? `Horário ocupado na agenda de ${analista.nome}` : `Selecionar das ${slot.ini} às ${slot.fim}`}
                    className={clsx(
                      "px-2.5 py-2 rounded-lg border text-xs font-mono font-bold flex items-center justify-between gap-1.5 transition-all",
                      ocupado
                        ? "bg-red-950/30 border-red-500/30 text-red-400/60 cursor-not-allowed line-through"
                        : selecionado
                        ? "bg-brand-500/20 border-brand-500 text-brand-300 shadow-sm cursor-pointer"
                        : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white cursor-pointer"
                    )}
                  >
                    <span>{slot.ini} – {slot.fim}</span>
                    {ocupado ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-sans font-bold uppercase text-red-400 no-underline">
                        <Lock className="w-2.5 h-2.5" /> Ocupado
                      </span>
                    ) : selecionado ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                    ) : null}
                  </button>
                )
              })}
            </div>

            {/* Lista de períodos já ocupados no dia para orientação caso escolha horário manual */}
            {ocupadosNoDia.length > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400">
                <span className="font-bold text-slate-300 block mb-1">
                  Horários já preenchidos no calendário de {analista.nome} neste dia:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ocupadosNoDia.map(ev => {
                    const iniStr = ev.dia_inteiro
                      ? 'Dia inteiro'
                      : `${new Date(ev.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${new Date(ev.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                    return (
                      <span
                        key={ev.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-[10px]"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        {iniStr}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {horarioSelecionadoConflita && (
              <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  Este horário conflita com um compromisso existente no calendário de {analista.nome}. Escolha outro horário.
                </span>
              </div>
            )}
          </div>

          {/* Motivo do Replanejamento */}
          {isReplanejamento && (
            <div>
              <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5">
                Motivo do Replanejamento <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ex: Imprevisto na operação / Aguardando documentação / Reagendado pela equipe..."
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Esta alteração ficará registrada no Histórico da Implantação com a data anterior e a nova data.
              </p>
            </div>
          )}

          {/* Rodapé */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || horarioSelecionadoConflita}
              className={clsx(
                "px-4 py-2 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                isReplanejamento
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-brand-600 hover:bg-brand-500"
              )}
            >
              {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarIcon className="w-3.5 h-3.5" />}
              <span>{salvando ? 'Salvando...' : isReplanejamento ? 'Confirmar Replanejamento' : 'Confirmar Agendamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

