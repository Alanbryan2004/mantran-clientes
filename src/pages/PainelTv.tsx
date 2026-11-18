import { useState, useEffect, useRef, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Play, Pause, ChevronLeft, ChevronRight, Maximize2, Minimize2, 
  RefreshCw, LayoutDashboard, BarChart3, Rocket, ShoppingBag, 
  Clock, Tv, LogOut, ChevronUp, ChevronDown
} from 'lucide-react'
import { Dashboard } from './Dashboard'
import { AnalyticsAcessos } from './AnalyticsAcessos'
import { Implantacoes } from './Implantacoes'
import { ProcessamentoShopee } from './ProcessamentoShopee'
import { isDashboardUser } from '../lib/auth'
import clsx from 'clsx'

interface TelaTv {
  id: string
  titulo: string
  subtitulo: string
  icone: any
  componente: React.ComponentType
}

const TELAS_TV: TelaTv[] = [
  {
    id: 'dashboard',
    titulo: 'Dashboard Geral',
    subtitulo: 'Métricas gerais e chamados do dia',
    icone: LayoutDashboard,
    componente: Dashboard
  },
  {
    id: 'analytics',
    titulo: 'Métricas de Acesso',
    subtitulo: 'Acessos, engajamento e clientes ativos hoje',
    icone: BarChart3,
    componente: AnalyticsAcessos
  },
  {
    id: 'implantacoes',
    titulo: 'Implantações',
    subtitulo: 'Status de onboarding e cronograma das implantações',
    icone: Rocket,
    componente: Implantacoes
  },
  {
    id: 'processamento',
    titulo: 'Processamento Shopee',
    subtitulo: 'Fechamentos de operações e lotes Shopee',
    icone: ShoppingBag,
    componente: ProcessamentoShopee
  }
]

const OPCOES_INTERVALO = [
  { rotulo: '1 min', segundos: 60 },
  { rotulo: '2 min', segundos: 120 },
  { rotulo: '3 min', segundos: 180 },
  { rotulo: '5 min', segundos: 300 }
]

export function PainelTv() {
  const navigate = useNavigate()
  const isTvUser = isDashboardUser()

  // Estado da rotação
  const [telaIndex, setTelaIndex] = useState(0)
  const [intervaloSegundos, setIntervaloSegundos] = useState(120) // Padrão: 2 minutos
  const [segundosRestantes, setSegundosRestantes] = useState(120)
  const [isPausado, setIsPausado] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [horaAtual, setHoraAtual] = useState('')
  const [dataAtual, setDataAtual] = useState('')
  const [barraRecolhida, setBarraRecolhida] = useState(false)
  const [, startTransition] = useTransition()

  const containerRef = useRef<HTMLDivElement>(null)

  // Relógio em tempo real (Horário de Brasília)
  useEffect(() => {
    const atualizarRelogio = () => {
      const agora = new Date()
      setHoraAtual(
        agora.toLocaleTimeString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      )
      setDataAtual(
        agora.toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })
      )
    }
    atualizarRelogio()
    const timer = setInterval(atualizarRelogio, 1000)
    return () => clearInterval(timer)
  }, [])

  // Timer de Rotação Automática
  useEffect(() => {
    if (isPausado) return

    const timer = setInterval(() => {
      setSegundosRestantes(prev => {
        if (prev <= 1) {
          // Troca de tela suavemente
          startTransition(() => {
            setTelaIndex(idx => (idx + 1) % TELAS_TV.length)
            setRefreshKey(k => k + 1)
          })
          return intervaloSegundos
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isPausado, intervaloSegundos])

  // Ouvinte de mudança de tela cheia (F11 / Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Troca manual de tela
  const irParaTela = (index: number) => {
    startTransition(() => {
      setTelaIndex(index)
      setSegundosRestantes(intervaloSegundos)
      setRefreshKey(k => k + 1)
    })
  }

  const proximaTela = () => {
    irParaTela((telaIndex + 1) % TELAS_TV.length)
  }

  const telaAnterior = () => {
    irParaTela((telaIndex - 1 + TELAS_TV.length) % TELAS_TV.length)
  }

  const alternarFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.warn('Erro ao alternar fullscreen:', err)
    }
  }

  const forcarRecarregamento = () => {
    setRefreshKey(k => k + 1)
    setSegundosRestantes(intervaloSegundos)
  }

  const handleSair = () => {
    if (isTvUser) {
      localStorage.removeItem('@Mantran:user')
      window.location.href = '/faq'
    } else {
      navigate('/')
    }
  }

  // Progresso de 0 a 100% da contagem regressiva
  const progressoPercent = Math.max(
    0,
    Math.min(100, ((intervaloSegundos - segundosRestantes) / intervaloSegundos) * 100)
  )

  const telaAtual = TELAS_TV[telaIndex]
  const ComponenteAtivo = telaAtual.componente

  const formatarTempo = (totalSegundos: number) => {
    const mins = Math.floor(totalSegundos / 60)
    const segs = totalSegundos % 60
    return `${String(mins).padStart(2, '0')}:${String(segs).padStart(2, '0')}`
  }

  return (
    <div ref={containerRef} className="flex flex-col h-screen w-screen bg-[#0b0d14] text-slate-100 overflow-hidden select-none">
      
      {/* Barra Superior / Header do Painel TV */}
      <header className={clsx(
        "relative shrink-0 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md transition-all duration-300 z-50",
        barraRecolhida ? "py-1.5 px-4" : "p-3 sm:px-6 sm:py-3"
      )}>
        <div className="flex items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Identificação TV + Relógio */}
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 via-brand-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/10">
                <Tv className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-wider text-white">MANTRAN</span>
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span>TV • AO VIVO</span>
                  </span>
                </div>
                {!barraRecolhida && (
                  <p className="text-[11px] text-slate-400 font-medium">Apresentação Operacional Diária</p>
                )}
              </div>
            </div>

            {/* Relógio Digital */}
            <div className="border-l border-slate-800 pl-3.5 ml-1 hidden md:block">
              <div className="text-sm font-mono font-bold text-white tracking-widest leading-none">
                {horaAtual}
              </div>
              {!barraRecolhida && (
                <div className="text-[10px] text-slate-400 capitalize mt-0.5">
                  {dataAtual}
                </div>
              )}
            </div>
          </div>

          {/* Centro: Pills de Seleção das 4 Telas */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80 overflow-x-auto max-w-full">
            {TELAS_TV.map((t, idx) => {
              const Icone = t.icone
              const isAtiva = idx === telaIndex
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => irParaTela(idx)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                    isAtiva
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  )}
                  title={`${t.titulo} (${idx + 1}/4)`}
                >
                  <Icone className={clsx("w-3.5 h-3.5 shrink-0", isAtiva ? "text-white" : "text-slate-400")} />
                  <span>{idx + 1}. {t.titulo}</span>
                  {isAtiva && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Lado Direito: Controles de Apresentação (Play/Pause, Tempo, Fullscreen, Sair) */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Contagem Regressiva */}
            <div 
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono font-bold"
              title={isPausado ? 'Rotação pausada' : `Próxima tela em ${formatarTempo(segundosRestantes)}`}
            >
              <Clock className={clsx("w-3.5 h-3.5", isPausado ? "text-amber-400" : "text-indigo-400")} />
              <span className={isPausado ? "text-amber-300" : "text-slate-200"}>
                {isPausado ? 'PAUSADO' : formatarTempo(segundosRestantes)}
              </span>
            </div>

            {/* Seletor de Intervalo (Dropdown / Botões) */}
            <div className="hidden xl:flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              {OPCOES_INTERVALO.map(opt => (
                <button
                  key={opt.segundos}
                  type="button"
                  onClick={() => {
                    setIntervaloSegundos(opt.segundos)
                    setSegundosRestantes(opt.segundos)
                  }}
                  className={clsx(
                    "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                    intervaloSegundos === opt.segundos
                      ? "bg-slate-700 text-white font-black"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {opt.rotulo}
                </button>
              ))}
            </div>

            {/* Botões Navegação Anterior / Play-Pause / Próximo */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={telaAnterior}
                title="Tela Anterior"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsPausado(p => !p)}
                title={isPausado ? 'Retomar Rotação Automática' : 'Pausar Rotação'}
                className={clsx(
                  "p-1.5 rounded-md transition-colors cursor-pointer",
                  isPausado
                    ? "text-amber-400 hover:bg-amber-500/20"
                    : "text-emerald-400 hover:bg-emerald-500/20"
                )}
              >
                {isPausado ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={proximaTela}
                title="Próxima Tela"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Recarregar Dados */}
            <button
              type="button"
              onClick={forcarRecarregamento}
              title="Recarregar Dados da Tela Atual"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Modo Compacto / Expandir Barra */}
            <button
              type="button"
              onClick={() => setBarraRecolhida(b => !b)}
              title={barraRecolhida ? 'Expandir barra superior da TV' : 'Modo Compacto (Mais espaço para gráficos)'}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors cursor-pointer"
            >
              {barraRecolhida ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>

            {/* Tela Cheia */}
            <button
              type="button"
              onClick={alternarFullscreen}
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia (Fullscreen F11)'}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Botão Sair */}
            <button
              type="button"
              onClick={handleSair}
              title={isTvUser ? 'Encerrar Sessão TV (Logout)' : 'Voltar ao Sistema'}
              className="p-2 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg border border-rose-500/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Progresso do Timer (0 a 100% contínuo) */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-800/80 overflow-hidden">
          <div 
            className={clsx(
              "h-full transition-all duration-1000 ease-linear",
              isPausado 
                ? "bg-amber-400" 
                : "bg-gradient-to-r from-indigo-500 via-brand-500 to-emerald-400 shadow-sm shadow-brand-500/50"
            )}
            style={{ width: isPausado ? '100%' : `${progressoPercent}%` }}
          />
        </div>
      </header>

      {/* Conteúdo Principal do Painel TV */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#0b0d14] relative">
        <div key={`${telaAtual.id}-${refreshKey}`} className="animate-fadeIn min-h-full">
          <ComponenteAtivo />
        </div>
      </main>

    </div>
  )
}
export default PainelTv

