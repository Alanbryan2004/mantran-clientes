import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  X,
  Calendar,
  Clock,
  Timer,
  CheckCircle2,
  Printer,
  ChevronLeft,
  ChevronRight,
  Edit3,
  CalendarDays,
  Loader2,
  FileText
} from 'lucide-react'
import clsx from 'clsx'
import {
  api,
  type RegistroPonto,
  type TipoPonto,
  type JornadaTrabalho,
  type FaltaAtestado,
  type SolicitacaoDayOff,
  type SolicitacaoFerias
} from '../lib/api'
import { minutosPrevistosJornada, formatSaldo, TOLERANCIA_DIA_MIN } from '../lib/bancoHoras'

interface HistoricoPontoColaboradorModalProps {
  isOpen: boolean
  onClose: () => void
  colaborador: {
    usuarioId: string
    usuarioNome: string
    fotoUrl?: string | null
    cargo?: string | null
  }
  jornada: JornadaTrabalho | null
  todasFaltas?: FaltaAtestado[]
  todosDayOffs?: SolicitacaoDayOff[]
  todasFerias?: SolicitacaoFerias[]
  isGestorRh?: boolean
  pontosEquipeCache?: RegistroPonto[]
  onCorrigirPonto?: (usuarioId: string, usuarioNome: string, tipo: TipoPonto, dataHora?: string, data?: string) => void
}

function formatHora(dataHora?: string | null): string {
  if (!dataHora) return '--:--'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(dataHora))
  } catch {
    return '--:--'
  }
}

function formatDuracao(minutos: number): string {
  const abs = Math.abs(minutos)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`
}

export function HistoricoPontoColaboradorModal({
  isOpen,
  onClose,
  colaborador,
  jornada,
  todasFaltas = [],
  todosDayOffs = [],
  todasFerias = [],
  isGestorRh = false,
  pontosEquipeCache = [],
  onCorrigirPonto
}: HistoricoPontoColaboradorModalProps) {
  const [registros, setRegistros] = useState<RegistroPonto[]>([])
  const [loading, setLoading] = useState(true)
  const [mesSelecionado, setMesSelecionado] = useState<string>('')
  const printRef = useRef<HTMLDivElement>(null)

  // Carrega todos os pontos do colaborador ao abrir
  const carregarPontos = async () => {
    if (!colaborador.usuarioId) return
    setLoading(true)
    try {
      const pontosRemotos = await api.getRegistrosPonto(colaborador.usuarioId).catch(() => [])
      // Mescla com pontos locais caso haja algo em cache
      const locais = pontosEquipeCache.filter(p => p.usuario_id === colaborador.usuarioId)
      const mapa = new Map<string, RegistroPonto>()
      locais.forEach(p => mapa.set(p.id || `${p.data}_${p.tipo}`, p))
      pontosRemotos.forEach(p => mapa.set(p.id || `${p.data}_${p.tipo}`, p))

      const lista = Array.from(mapa.values()).sort((a, b) => {
        return (b.data_hora || '').localeCompare(a.data_hora || '')
      })
      setRegistros(lista)
    } catch (err) {
      console.error('Erro ao carregar histórico de ponto do colaborador:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      carregarPontos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, colaborador.usuarioId])

  // Identifica se um dia da semana é previsto de trabalho na jornada
  const ehDiaDeTrabalho = useCallback((dataStr: string): boolean => {
    if (!jornada) return false
    const d = new Date(dataStr + 'T12:00:00')
    const diaSemana = d.getDay() // 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
    if (diaSemana === 0) return !!jornada.domingo
    if (diaSemana === 1) return !!jornada.segunda
    if (diaSemana === 2) return !!jornada.terca
    if (diaSemana === 3) return !!jornada.quarta
    if (diaSemana === 4) return !!jornada.quinta
    if (diaSemana === 5) return !!jornada.sexta
    if (diaSemana === 6) return !!jornada.sabado
    return false
  }, [jornada])

  // Agrupamento completo por mês (YYYY-MM)
  const dadosPorMes = useMemo(() => {
    // 1) Mapa de registros por mês
    const mapaMeses = new Map<string, Map<string, RegistroPonto[]>>()

    // Adiciona todos os registros existentes
    registros.forEach(reg => {
      if (!reg.data) return
      const mesChave = reg.data.slice(0, 7) // YYYY-MM
      if (!mapaMeses.has(mesChave)) mapaMeses.set(mesChave, new Map())
      const diaMapa = mapaMeses.get(mesChave)!
      if (!diaMapa.has(reg.data)) diaMapa.set(reg.data, [])
      diaMapa.get(reg.data)!.push(reg)
    })

    // Garante que o mês atual esteja na lista, mesmo se não tiver registros
    const hojeD = new Date()
    const mesAtualChave = `${hojeD.getFullYear()}-${String(hojeD.getMonth() + 1).padStart(2, '0')}`
    if (!mapaMeses.has(mesAtualChave)) {
      mapaMeses.set(mesAtualChave, new Map())
    }

    const agora = new Date()
    const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
    const agoraMs = agora.getTime()
    const previstoPadraoMin = jornada ? minutosPrevistosJornada(jornada) : 0

    // Constrói estrutura detalhada para cada mês
    const meses = Array.from(mapaMeses.entries()).map(([mesChave, diasMapa]) => {
      const [anoStr, mesNumStr] = mesChave.split('-')
      const ano = parseInt(anoStr, 10)
      const mesNum = parseInt(mesNumStr, 10)

      const dateRef = new Date(ano, mesNum - 1, 1)
      const mesNomeExtenso = dateRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      const mesNomeCapitalizado = mesNomeExtenso.charAt(0).toUpperCase() + mesNomeExtenso.slice(1)

      // Lista dos dias com registros neste mês
      const datasDoMes = Array.from(diasMapa.keys()).sort((a, b) => b.localeCompare(a))

      let totalTrabalhadoMinMes = 0
      let totalPrevistoMinMes = 0
      let totalSaldoMinMes = 0
      let diasCompletos = 0
      let diasIncompletos = 0

      const diasDetalhados = datasDoMes.map(dataStr => {
        const regs = diasMapa.get(dataStr) || []
        const regInicio = regs.find(r => r.tipo === 'inicio_expediente')
        const regPausa = regs.find(r => r.tipo === 'pausa_almoco')
        const regRetorno = regs.find(r => r.tipo === 'retorno_almoco')
        const regFim = regs.find(r => r.tipo === 'fim_expediente')

        const inicio = regInicio?.data_hora
        const pausa = regPausa?.data_hora
        const retorno = regRetorno?.data_hora
        const fim = regFim?.data_hora

        const ehHoje = dataStr === hojeStr
        let trabalhadoMin = 0

        if (inicio) {
          const tInicio = new Date(inicio).getTime()
          const tFim = fim ? new Date(fim).getTime() : (ehHoje ? agoraMs : tInicio)
          let ms = tFim - tInicio
          if (pausa) {
            const tPausa = new Date(pausa).getTime()
            const tRetorno = retorno ? new Date(retorno).getTime() : (ehHoje ? agoraMs : tPausa)
            ms -= Math.max(0, tRetorno - tPausa)
          }
          trabalhadoMin = Math.max(0, Math.round(ms / 60000))
        }

        const temTrabalhoPrevisto = ehDiaDeTrabalho(dataStr)
        const previstoMin = temTrabalhoPrevisto ? previstoPadraoMin : 0

        // Saldo do dia com tolerância CLT de 20 min/dia se dia estiver encerrado
        let saldoMin = 0
        const diaEncerrado = !!(inicio && fim)
        if (diaEncerrado && previstoMin > 0) {
          const bruto = trabalhadoMin - previstoMin
          saldoMin = Math.abs(bruto) <= TOLERANCIA_DIA_MIN ? 0 : bruto
        } else if (diaEncerrado && previstoMin === 0) {
          // Dia extra / fim de semana trabalhado: 100% crédito
          saldoMin = trabalhadoMin
        } else if (!diaEncerrado && inicio && ehHoje) {
          // Em andamento hoje: saldo parcial
          saldoMin = trabalhadoMin - previstoMin
        }

        // Checa ocorrências especiais neste dia
        const temDayOff = todosDayOffs.some(
          d => d.usuario_id === colaborador.usuarioId && d.data_solicitada === dataStr && d.status === 'Aprovado'
        )
        const temFalta = todasFaltas.some(
          f => f.usuario_id === colaborador.usuarioId && dataStr >= f.data_falta_inicio && dataStr <= f.data_falta_fim && f.status === 'Abonado / Aprovado'
        )
        const temFerias = todasFerias.some(
          f => f.usuario_id === colaborador.usuarioId && f.status === 'Aprovado' && (
            (dataStr >= f.quinzena_1_inicio && dataStr <= f.quinzena_1_fim) ||
            (f.quinzena_2_inicio && f.quinzena_2_fim && dataStr >= f.quinzena_2_inicio && dataStr <= f.quinzena_2_fim)
          )
        )

        // Classificação do status
        let statusTipo: 'completo' | 'em_andamento' | 'incompleto' | 'day_off' | 'falta' | 'ferias' = 'incompleto'
        let statusLabel = 'Incompleto'

        if (temDayOff) {
          statusTipo = 'day_off'
          statusLabel = 'Day Off'
        } else if (temFerias) {
          statusTipo = 'ferias'
          statusLabel = 'Férias'
        } else if (temFalta) {
          statusTipo = 'falta'
          statusLabel = 'Abonado / Atestado'
        } else if (inicio && fim) {
          statusTipo = 'completo'
          statusLabel = 'Completo'
          diasCompletos++
        } else if (inicio && !fim && ehHoje) {
          statusTipo = 'em_andamento'
          statusLabel = 'Em andamento'
        } else {
          statusTipo = 'incompleto'
          statusLabel = !inicio ? 'Sem entrada' : !fim ? 'Sem saída' : 'Incompleto'
          diasIncompletos++
        }

        totalTrabalhadoMinMes += trabalhadoMin
        totalPrevistoMinMes += previstoMin
        totalSaldoMinMes += saldoMin

        // Formatação amigável da data
        const dtObj = new Date(dataStr + 'T12:00:00')
        const diaSemanaCurto = dtObj.toLocaleDateString('pt-BR', { weekday: 'short' })
        const diaNumero = dataStr.slice(8, 10)

        return {
          data: dataStr,
          diaNumero,
          diaSemanaCurto: diaSemanaCurto.replace('.', '').toUpperCase(),
          ehHoje,
          inicio,
          pausa,
          retorno,
          fim,
          trabalhadoMin,
          previstoMin,
          saldoMin,
          statusTipo,
          statusLabel,
          regInicio,
          regPausa,
          regRetorno,
          regFim
        }
      })

      return {
        mesChave,
        mesNome: mesNomeCapitalizado,
        ano,
        mesNum,
        dias: diasDetalhados,
        totalTrabalhadoMin: totalTrabalhadoMinMes,
        totalPrevistoMin: totalPrevistoMinMes,
        saldoMesMin: totalSaldoMinMes,
        totalDiasRegistrados: diasDetalhados.length,
        diasCompletos,
        diasIncompletos
      }
    })

    // Ordena os meses do mais recente para o mais antigo
    return meses.sort((a, b) => b.mesChave.localeCompare(a.mesChave))
  }, [registros, jornada, colaborador.usuarioId, todasFaltas, todosDayOffs, todasFerias, ehDiaDeTrabalho])

  // Garante que o mês selecionado inicial seja o mais recente
  useEffect(() => {
    if (dadosPorMes.length > 0) {
      if (!mesSelecionado || !dadosPorMes.some(m => m.mesChave === mesSelecionado)) {
        setMesSelecionado(dadosPorMes[0].mesChave)
      }
    }
  }, [dadosPorMes, mesSelecionado])

  const mesAtualAtivo = useMemo(() => {
    return dadosPorMes.find(m => m.mesChave === mesSelecionado) || dadosPorMes[0]
  }, [dadosPorMes, mesSelecionado])

  // Saldo geral acumulado de todos os tempos deste colaborador
  const saldoGeralAcumuladoMin = useMemo(() => {
    return dadosPorMes.reduce((acc, m) => acc + m.saldoMesMin, 0)
  }, [dadosPorMes])

  // Navegação anterior / próximo mês
  const indiceMesAtual = dadosPorMes.findIndex(m => m.mesChave === mesSelecionado)
  const irParaMesAnterior = () => {
    if (indiceMesAtual < dadosPorMes.length - 1) {
      setMesSelecionado(dadosPorMes[indiceMesAtual + 1].mesChave)
    }
  }
  const irParaProximoMes = () => {
    if (indiceMesAtual > 0) {
      setMesSelecionado(dadosPorMes[indiceMesAtual - 1].mesChave)
    }
  }

  // Impressão limpa do espelho de ponto do mês
  const handleImprimir = () => {
    window.print()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-dark-card border border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* ================= HEADER DO MODAL ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-800 bg-slate-900/70 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border-2 border-emerald-500/40 font-bold flex items-center justify-center text-base text-white uppercase overflow-hidden shrink-0 shadow-lg">
              {colaborador.fotoUrl ? (
                <img src={colaborador.fotoUrl} alt={colaborador.usuarioNome} className="w-full h-full object-cover" />
              ) : (
                colaborador.usuarioNome.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  {colaborador.usuarioNome}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Espelho de Ponto
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                {colaborador.cargo && <span>{colaborador.cargo} •</span>}
                <span className="flex items-center gap-1 text-slate-300">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  {jornada ? (
                    `Jornada: ${jornada.hora_entrada} às ${jornada.hora_saida}${jornada.almoco_inicio ? ` (Intervalo ${jornada.almoco_inicio}-${jornada.almoco_fim})` : ''}`
                  ) : (
                    'Jornada não configurada'
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            {/* Saldo Acumulado Geral */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/60 text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold leading-tight">
                Banco Acumulado
              </span>
              <span className={clsx(
                'text-sm font-black tabular-nums',
                saldoGeralAcumuladoMin > 0 ? 'text-emerald-400' : saldoGeralAcumuladoMin < 0 ? 'text-rose-400' : 'text-slate-300'
              )}>
                {formatSaldo(saldoGeralAcumuladoMin)}
              </span>
            </div>

            {/* Botão Imprimir */}
            <button
              type="button"
              onClick={handleImprimir}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Imprimir ou exportar espelho de ponto"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= SELETOR DE MÊS (DIVIDIDO POR MÊS) ================= */}
        <div className="bg-slate-900/40 border-b border-slate-800 px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between gap-3 overflow-x-auto scrollbar-clean">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={irParaMesAnterior}
              disabled={indiceMesAtual >= dadosPorMes.length - 1}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={irParaProximoMes}
              disabled={indiceMesAtual <= 0}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Abas dos meses */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-clean py-1">
            {dadosPorMes.map(m => {
              const ativo = m.mesChave === mesSelecionado
              return (
                <button
                  key={m.mesChave}
                  type="button"
                  onClick={() => setMesSelecionado(m.mesChave)}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 border',
                    ativo
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  )}
                >
                  <CalendarDays className={clsx('w-3.5 h-3.5', ativo ? 'text-emerald-400' : 'text-slate-500')} />
                  <span>{m.mesNome}</span>
                  <span className={clsx(
                    'text-[10px] px-1.5 py-0.2 rounded-md font-mono',
                    ativo ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-800 text-slate-400'
                  )}>
                    {m.totalDiasRegistrados}d
                  </span>
                </button>
              )
            })}
          </div>

          <div className="hidden lg:flex items-center text-[11px] text-slate-400 shrink-0 font-medium">
            <span>{dadosPorMes.length} mês(es) com histórico</span>
          </div>
        </div>

        {/* ================= CORPO / CONTEÚDO PRINCIPAL ================= */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-clean">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
              <p className="text-xs font-semibold">Carregando espelho de ponto...</p>
            </div>
          ) : !mesAtualAtivo ? (
            <div className="text-center py-20 text-slate-500 text-sm">
              Nenhum registro encontrado para este colaborador.
            </div>
          ) : (
            <>
              {/* Cards de Métricas do Mês Selecionado */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Trabalhado no Mês
                  </span>
                  <div className="text-lg sm:text-xl font-black text-white tabular-nums">
                    {formatDuracao(mesAtualAtivo.totalTrabalhadoMin)}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Horas líquidas executadas</span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    Carga Prevista
                  </span>
                  <div className="text-lg sm:text-xl font-black text-slate-200 tabular-nums">
                    {formatDuracao(mesAtualAtivo.totalPrevistoMin)}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Conforme jornada semanal</span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-brand-400" />
                    Saldo do Mês
                  </span>
                  <div className={clsx(
                    'text-lg sm:text-xl font-black tabular-nums',
                    mesAtualAtivo.saldoMesMin > 0 ? 'text-emerald-400' : mesAtualAtivo.saldoMesMin < 0 ? 'text-rose-400' : 'text-slate-300'
                  )}>
                    {formatSaldo(mesAtualAtivo.saldoMesMin)}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Diferença de horas do período</span>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    Dias com Ponto
                  </span>
                  <div className="text-lg sm:text-xl font-black text-white tabular-nums flex items-center gap-2">
                    {mesAtualAtivo.totalDiasRegistrados}
                    {mesAtualAtivo.diasIncompletos > 0 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {mesAtualAtivo.diasIncompletos} incompleto(s)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">{mesAtualAtivo.diasCompletos} encerrados regularmente</span>
                </div>
              </div>

              {/* Tabela de Batidas Diárias do Mês */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Espelho de Ponto • {mesAtualAtivo.mesNome}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {mesAtualAtivo.dias.length} dia(s) registrado(s)
                  </span>
                </div>

                {mesAtualAtivo.dias.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Nenhum registro de ponto encontrado em {mesAtualAtivo.mesNome}.
                  </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-clean">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                          <th className="py-3 px-3.5 w-24">Data</th>
                          <th className="py-3 px-3 text-center">Entrada</th>
                          <th className="py-3 px-3 text-center">Saída Almoço</th>
                          <th className="py-3 px-3 text-center">Retorno Almoço</th>
                          <th className="py-3 px-3 text-center">Saída</th>
                          <th className="py-3 px-3 text-right">Trabalhado</th>
                          <th className="py-3 px-3 text-right">Saldo Dia</th>
                          <th className="py-3 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {mesAtualAtivo.dias.map(dia => {
                          return (
                            <tr
                              key={dia.data}
                              className={clsx(
                                'transition-colors hover:bg-slate-800/40',
                                dia.ehHoje && 'bg-emerald-500/[0.04]'
                              )}
                            >
                              {/* Data com Dia da Semana */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className={clsx(
                                    'w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs font-mono shrink-0',
                                    dia.ehHoje
                                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                      : 'bg-slate-800 text-slate-200 border border-slate-700/60'
                                  )}>
                                    {dia.diaNumero}
                                  </span>
                                  <div>
                                    <span className="font-bold text-white block text-xs">
                                      {dia.diaSemanaCurto}
                                    </span>
                                    {dia.ehHoje && (
                                      <span className="text-[9px] font-black uppercase text-emerald-400 block leading-tight">
                                        Hoje
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Entrada */}
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={isGestorRh && onCorrigirPonto ? () => onCorrigirPonto(colaborador.usuarioId, colaborador.usuarioNome, 'inicio_expediente', dia.inicio, dia.data) : undefined}
                                  className={clsx(
                                    'px-2 py-1 rounded-md font-mono font-bold text-xs tabular-nums transition-colors inline-flex items-center gap-1',
                                    dia.inicio ? 'text-slate-200 bg-slate-800/70 border border-slate-700/50' : 'text-slate-600 bg-slate-900/40 border border-dashed border-slate-800',
                                    isGestorRh && onCorrigirPonto && 'hover:border-emerald-500/50 hover:text-emerald-300 cursor-pointer'
                                  )}
                                  title={isGestorRh ? 'Clique para ajustar horário de entrada' : undefined}
                                >
                                  {formatHora(dia.inicio)}
                                  {isGestorRh && dia.inicio && <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-400" />}
                                </button>
                              </td>

                              {/* Saída Almoço */}
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={isGestorRh && onCorrigirPonto ? () => onCorrigirPonto(colaborador.usuarioId, colaborador.usuarioNome, 'pausa_almoco', dia.pausa, dia.data) : undefined}
                                  className={clsx(
                                    'px-2 py-1 rounded-md font-mono font-bold text-xs tabular-nums transition-colors inline-flex items-center gap-1',
                                    dia.pausa ? 'text-slate-200 bg-slate-800/70 border border-slate-700/50' : 'text-slate-600 bg-slate-900/40 border border-dashed border-slate-800',
                                    isGestorRh && onCorrigirPonto && 'hover:border-emerald-500/50 hover:text-emerald-300 cursor-pointer'
                                  )}
                                  title={isGestorRh ? 'Clique para ajustar horário da pausa' : undefined}
                                >
                                  {formatHora(dia.pausa)}
                                </button>
                              </td>

                              {/* Retorno Almoço */}
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={isGestorRh && onCorrigirPonto ? () => onCorrigirPonto(colaborador.usuarioId, colaborador.usuarioNome, 'retorno_almoco', dia.retorno, dia.data) : undefined}
                                  className={clsx(
                                    'px-2 py-1 rounded-md font-mono font-bold text-xs tabular-nums transition-colors inline-flex items-center gap-1',
                                    dia.retorno ? 'text-slate-200 bg-slate-800/70 border border-slate-700/50' : 'text-slate-600 bg-slate-900/40 border border-dashed border-slate-800',
                                    isGestorRh && onCorrigirPonto && 'hover:border-emerald-500/50 hover:text-emerald-300 cursor-pointer'
                                  )}
                                  title={isGestorRh ? 'Clique para ajustar horário do retorno' : undefined}
                                >
                                  {formatHora(dia.retorno)}
                                </button>
                              </td>

                              {/* Saída */}
                              <td className="py-3 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={isGestorRh && onCorrigirPonto ? () => onCorrigirPonto(colaborador.usuarioId, colaborador.usuarioNome, 'fim_expediente', dia.fim, dia.data) : undefined}
                                  className={clsx(
                                    'px-2 py-1 rounded-md font-mono font-bold text-xs tabular-nums transition-colors inline-flex items-center gap-1',
                                    dia.fim ? 'text-slate-200 bg-slate-800/70 border border-slate-700/50' : 'text-slate-600 bg-slate-900/40 border border-dashed border-slate-800',
                                    isGestorRh && onCorrigirPonto && 'hover:border-emerald-500/50 hover:text-emerald-300 cursor-pointer'
                                  )}
                                  title={isGestorRh ? 'Clique para ajustar horário de saída' : undefined}
                                >
                                  {formatHora(dia.fim)}
                                </button>
                              </td>

                              {/* Total Trabalhado */}
                              <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                                <span className={clsx(
                                  'font-bold',
                                  dia.trabalhadoMin > 0 ? 'text-emerald-400' : 'text-slate-500'
                                )}>
                                  {dia.trabalhadoMin > 0 ? formatDuracao(dia.trabalhadoMin) : '--'}
                                </span>
                              </td>

                              {/* Saldo Dia */}
                              <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                                <span className={clsx(
                                  'font-bold text-xs',
                                  dia.saldoMin > 0 ? 'text-emerald-400' : dia.saldoMin < 0 ? 'text-rose-400' : 'text-slate-400'
                                )}>
                                  {formatSaldo(dia.saldoMin)}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <span className={clsx(
                                  'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                  dia.statusTipo === 'completo' && 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                                  dia.statusTipo === 'em_andamento' && 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                                  dia.statusTipo === 'incompleto' && 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                                  dia.statusTipo === 'day_off' && 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                                  dia.statusTipo === 'falta' && 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                                  dia.statusTipo === 'ferias' && 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                )}>
                                  {dia.statusTipo === 'em_andamento' && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                                  )}
                                  {dia.statusLabel}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ================= FOOTER DO MODAL ================= */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-slate-800 bg-slate-900/80 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Colaborador: <strong className="text-slate-200">{colaborador.usuarioNome}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  )
}
