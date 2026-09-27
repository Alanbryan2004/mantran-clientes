import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

// Detecta viewport de celular (<= 640px) reagindo a mudanças de tamanho/rotação
function useIsMobile(): boolean {
  const query = '(max-width: 640px)'
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return isMobile
}
import {
  X,
  Clock,
  Play,
  Coffee,
  Utensils,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Timer,
  CalendarOff
} from 'lucide-react'
import clsx from 'clsx'
import { api, type RegistroPonto, type TipoPonto } from '../lib/api'
import { getLoggedUser } from '../lib/auth'
import { getMotivoNaoUtil } from '../lib/feriados'

interface ControlePontoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

// Ordem sequencial do expediente
const SEQUENCIA: TipoPonto[] = [
  'inicio_expediente',
  'pausa_almoco',
  'retorno_almoco',
  'fim_expediente'
]

const LABELS: Record<TipoPonto, string> = {
  inicio_expediente: 'Início do Expediente',
  pausa_almoco: 'Pausa para Almoço',
  retorno_almoco: 'Retorno do Almoço',
  fim_expediente: 'Encerramento do Expediente'
}

const ICONS: Record<TipoPonto, typeof Play> = {
  inicio_expediente: Play,
  pausa_almoco: Coffee,
  retorno_almoco: Utensils,
  fim_expediente: LogOut
}

interface AcaoConfig {
  tipo: TipoPonto
  label: string
  descricao: string
  // classes do botão de ação principal
  btn: string
}

const ACOES: Record<TipoPonto, AcaoConfig> = {
  inicio_expediente: {
    tipo: 'inicio_expediente',
    label: 'Iniciar Expediente',
    descricao: 'Bater o ponto de entrada',
    btn: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
  },
  pausa_almoco: {
    tipo: 'pausa_almoco',
    label: 'Sair para Almoço',
    descricao: 'Registrar início do intervalo',
    btn: 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/30'
  },
  retorno_almoco: {
    tipo: 'retorno_almoco',
    label: 'Retornar do Almoço',
    descricao: 'Registrar fim do intervalo',
    btn: 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/30'
  },
  fim_expediente: {
    tipo: 'fim_expediente',
    label: 'Encerrar Expediente',
    descricao: 'Bater o ponto de saída',
    btn: 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30'
  }
}

// Status atual do expediente derivado dos marcos já registrados
type StatusExpediente = 'nao_iniciado' | 'trabalhando' | 'almoco' | 'encerrado'

function getStatus(tiposFeitos: Set<TipoPonto>): StatusExpediente {
  if (tiposFeitos.has('fim_expediente')) return 'encerrado'
  if (tiposFeitos.has('pausa_almoco') && !tiposFeitos.has('retorno_almoco')) return 'almoco'
  if (tiposFeitos.has('inicio_expediente')) return 'trabalhando'
  return 'nao_iniciado'
}

const STATUS_INFO: Record<StatusExpediente, { label: string; dot: string; text: string; bg: string }> = {
  nao_iniciado: {
    label: 'Expediente não iniciado',
    dot: 'bg-slate-500',
    text: 'text-slate-300',
    bg: 'bg-slate-500/10 border-slate-500/30'
  },
  trabalhando: {
    label: 'Trabalhando',
    dot: 'bg-emerald-400 animate-pulse',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/10 border-emerald-500/30'
  },
  almoco: {
    label: 'Em horário de almoço',
    dot: 'bg-amber-400 animate-pulse',
    text: 'text-amber-300',
    bg: 'bg-amber-500/10 border-amber-500/30'
  },
  encerrado: {
    label: 'Expediente encerrado',
    dot: 'bg-slate-400',
    text: 'text-slate-300',
    bg: 'bg-slate-500/10 border-slate-600/40'
  }
}

function formatHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '--:--'
  }
}

// Calcula tempo trabalhado (descontando almoço) em ms, com base nos registros
function calcularTempoTrabalhado(registros: RegistroPonto[], agora: Date): number {
  const marco = (t: TipoPonto) => registros.find(r => r.tipo === t)?.data_hora
  const inicio = marco('inicio_expediente')
  if (!inicio) return 0

  const fim = marco('fim_expediente')
  const pausa = marco('pausa_almoco')
  const retorno = marco('retorno_almoco')

  const tInicio = new Date(inicio).getTime()
  const tFim = fim ? new Date(fim).getTime() : agora.getTime()

  let total = tFim - tInicio

  if (pausa) {
    const tPausa = new Date(pausa).getTime()
    const tRetorno = retorno ? new Date(retorno).getTime() : agora.getTime()
    total -= Math.max(0, tRetorno - tPausa)
  }

  return Math.max(0, total)
}

function formatDuracao(ms: number): string {
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`
}

export function ControlePontoModal({ isOpen, onClose, onSuccess }: ControlePontoModalProps) {
  const user = getLoggedUser()
  const isMobile = useIsMobile()
  // Valores primitivos estáveis para evitar loop de re-render
  // (getLoggedUser() cria um objeto novo a cada render)
  const userId = user?.id
  const userNome = user?.nome || user?.login

  const [registros, setRegistros] = useState<RegistroPonto[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<TipoPonto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  const carregarRegistros = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getRegistrosPontoDoDia(userId)
      setRegistros(data)
    } catch (err: any) {
      console.error('Erro ao carregar registros de ponto:', err)
      setError('Não foi possível carregar os registros de hoje.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (isOpen) carregarRegistros()
  }, [isOpen, carregarRegistros])

  // Relógio ao vivo enquanto o modal está aberto
  useEffect(() => {
    if (!isOpen) return
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [isOpen])

  if (!isOpen) return null

  const tiposFeitos = new Set(registros.map(r => r.tipo))
  const status = getStatus(tiposFeitos)
  const statusInfo = STATUS_INFO[status]

  // Próximo passo válido da sequência
  const proximoIndex = SEQUENCIA.findIndex(tipo => !tiposFeitos.has(tipo))
  const proximoTipo: TipoPonto | null = proximoIndex >= 0 ? SEQUENCIA[proximoIndex] : null
  const expedienteConcluido = proximoTipo === null

  const tempoTrabalhado = calcularTempoTrabalhado(registros, now)

  // Bloqueio: não é permitido INICIAR o expediente em fim de semana ou feriado.
  const { motivo: motivoNaoUtil, feriado } = getMotivoNaoUtil(now)
  const bloqueadoParaInicio = motivoNaoUtil !== null && proximoTipo === 'inicio_expediente'
  const motivoTexto =
    motivoNaoUtil === 'sabado' ? 'sábado'
    : motivoNaoUtil === 'domingo' ? 'domingo'
    : motivoNaoUtil === 'feriado' ? `feriado (${feriado?.nome})`
    : ''

  const handleRegistrar = async (tipo: TipoPonto) => {
    if (!userId) {
      setError('Sessão expirada. Por favor faça login novamente.')
      return
    }
    // Reforço da regra: bloqueia iniciar expediente em dia não útil
    if (tipo === 'inicio_expediente' && getMotivoNaoUtil(new Date()).motivo !== null) {
      setError('Não é permitido iniciar o expediente em fins de semana ou feriados.')
      return
    }
    setSaving(tipo)
    setError(null)
    try {
      await api.insertRegistroPonto({
        usuario_id: userId,
        usuario_nome: userNome,
        tipo
      })
      await carregarRegistros()
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Erro ao registrar ponto:', err)
      setError(err.message || 'Erro ao registrar o ponto. Tente novamente.')
    } finally {
      setSaving(null)
    }
  }

  const acao = proximoTipo ? ACOES[proximoTipo] : null
  const AcaoIcon = proximoTipo ? ICONS[proximoTipo] : Clock
  const isSaving = saving !== null

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 z-[9999] flex justify-center bg-black/75 backdrop-blur-sm',
        isMobile ? 'items-end p-0' : 'items-center p-4'
      )}
    >
      <div
        className={clsx(
          'bg-dark-card border border-slate-800 shadow-2xl flex flex-col animate-in fade-in duration-200',
          isMobile
            ? 'w-full max-w-full rounded-t-3xl rounded-b-none max-h-[92vh] slide-in-from-bottom'
            : 'w-full max-w-md rounded-2xl zoom-in-95 max-h-[90vh]'
        )}
      >

        {/* Alça do bottom sheet (apenas mobile) */}
        {isMobile && (
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <span className="w-10 h-1.5 rounded-full bg-slate-700" />
          </div>
        )}

        {/* Header */}
        <div
          className={clsx(
            'flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60 shrink-0',
            isMobile ? 'rounded-none' : 'rounded-t-2xl'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Controle de Ponto</h2>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">
                {user?.nome || user?.login}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">

          {/* Topo: data atual + dia da semana + status */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800 p-4 text-center">
            <p className="text-sm font-bold text-white capitalize">
              {now.toLocaleDateString('pt-BR', { weekday: 'long' })}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {now.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </p>

            {/* Badge de status atual */}
            <div className={clsx(
              'inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full border text-xs font-bold',
              statusInfo.bg,
              statusInfo.text
            )}>
              <span className={clsx('w-2 h-2 rounded-full', statusInfo.dot)} />
              {statusInfo.label}
            </div>

            {/* Tempo trabalhado hoje */}
            {status !== 'nao_iniciado' && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-center gap-2 text-sm">
                <Timer className="w-4 h-4 text-brand-400" />
                <span className="text-slate-400">Trabalhado hoje:</span>
                <span className="font-bold text-white tabular-nums">{formatDuracao(tempoTrabalhado)}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Timeline dos marcos do dia */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Marcos de Hoje
            </p>
            <div className="relative pl-2">
              {SEQUENCIA.map((tipo, idx) => {
                const registro = registros.find(r => r.tipo === tipo)
                const feito = !!registro
                const ehProximo = tipo === proximoTipo
                const StepIcon = ICONS[tipo]
                const isLast = idx === SEQUENCIA.length - 1
                return (
                  <div key={tipo} className="flex gap-3 relative">
                    {/* Linha conectora */}
                    {!isLast && (
                      <span
                        className={clsx(
                          'absolute left-[15px] top-8 w-0.5 h-[calc(100%-1rem)]',
                          feito ? 'bg-emerald-500/40' : 'bg-slate-800'
                        )}
                      />
                    )}
                    {/* Ícone do marco */}
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border z-10 transition-colors',
                        feito
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : ehProximo
                          ? 'bg-brand-500/15 border-brand-500/50 text-brand-300'
                          : 'bg-slate-900 border-slate-800 text-slate-600'
                      )}
                    >
                      <StepIcon className="w-4 h-4" />
                    </div>
                    {/* Texto do marco */}
                    <div className="flex-1 flex items-center justify-between pb-5">
                      <span
                        className={clsx(
                          'text-sm font-medium',
                          feito ? 'text-white' : ehProximo ? 'text-brand-300' : 'text-slate-500'
                        )}
                      >
                        {LABELS[tipo]}
                      </span>
                      <span
                        className={clsx(
                          'text-sm tabular-nums font-bold',
                          feito ? 'text-white' : 'text-slate-600'
                        )}
                      >
                        {registro ? formatHora(registro.data_hora) : '--:--'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Botão de ação principal (abaixo do Encerramento) */}
          {loading ? (
            <div className="flex items-center justify-center py-3 text-slate-500 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando...
            </div>
          ) : bloqueadoParaInicio ? (
            <div className="rounded-2xl bg-slate-800/40 border border-slate-700/60 p-5 flex flex-col items-center text-center gap-2">
              <div className="w-11 h-11 rounded-full bg-slate-700/40 border border-slate-600/60 text-slate-300 flex items-center justify-center">
                <CalendarOff className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Registro indisponível</h3>
              <p className="text-xs text-slate-400">
                Não é possível iniciar o expediente em {motivoTexto}. O controle de ponto está disponível apenas em dias úteis.
              </p>
            </div>
          ) : expedienteConcluido ? (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 flex flex-col items-center text-center gap-2">
              <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Expediente concluído!</h3>
              <p className="text-xs text-slate-400">
                Você trabalhou {formatDuracao(tempoTrabalhado)} hoje. Bom descanso.
              </p>
            </div>
          ) : (
            acao && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleRegistrar(acao.tipo)}
                className={clsx(
                  'w-full flex items-center justify-center gap-3 px-4 rounded-2xl font-bold transition-all cursor-pointer shadow-lg disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]',
                  isMobile ? 'py-5 text-lg' : 'py-4 text-base',
                  acao.btn
                )}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <AcaoIcon className="w-5 h-5" />
                )}
                <span>{isSaving ? 'Registrando...' : acao.label}</span>
              </button>
            )
          )}
        </div>

        {/* Footer */}
        <div
          className={clsx(
            'p-4 border-t border-slate-800 bg-slate-900/40 shrink-0',
            isMobile ? 'rounded-none pb-[calc(1rem+env(safe-area-inset-bottom))]' : 'rounded-b-2xl'
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary w-full py-2.5"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
