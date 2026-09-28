import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  Rocket, 
  X, 
  RefreshCw, 
  FileText, 
  Palmtree, 
  PhoneCall 
} from 'lucide-react'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { getLoggedUser, isClienteUser, isAdminUser, isTecnicoUser, isFuncionarioUser } from '../lib/auth'
import { avaliarLembretesPonto } from '../lib/lembretesPonto'
import clsx from 'clsx'

export function NotificationsPopover() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notificacoes, setNotificacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const popoverRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const isCliente = isClienteUser()
  const currentUser = getLoggedUser()
  const isAdmin = isAdminUser()
  const isTecnico = !isAdmin && (isTecnicoUser() || (currentUser as any)?.e_tecnico === true)
  const isFuncionario = isFuncionarioUser()
  const isGestorRh = isAdmin || currentUser?.perfil?.trim().toLowerCase() === 'rh'
  const userKey = currentUser ? (currentUser.id || currentUser.login || 'user') : 'user'

  const STORAGE_KEY_READ = `@Mantran:notificacoes_lidas_${userKey}`
  const STORAGE_KEY_DELETED = `@Mantran:notificacoes_excluidas_${userKey}`

  // Lembretes de ponto (locais, pessoais deste usuário)
  const [lembretesPonto, setLembretesPonto] = useState<any[]>([])

  // Obter IDs lidos pelo usuário atual
  const getReadIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_READ)
      if (stored) return new Set(JSON.parse(stored))
    } catch (_) {}
    return new Set()
  }

  // Obter IDs excluídos pelo usuário atual
  const getDeletedIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DELETED)
      if (stored) return new Set(JSON.parse(stored))
    } catch (_) {}
    return new Set()
  }

  const saveReadIds = (set: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY_READ, JSON.stringify(Array.from(set)))
    } catch (_) {}
  }

  const saveDeletedIds = (set: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(set)))
    } catch (_) {}
  }

  const fetchNotificacoes = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const rawList = await api.getNotificacoes(50)
      const readIds = getReadIds()
      const deletedIds = getDeletedIds()

      // Filtrar apenas as não excluídas por este usuário e permitidas por perfil
      const userList = (rawList || [])
        .filter((n: any) => {
          if (deletedIds.has(n.id)) return false
          
          // 1. Notificações de RH são restritas exclusivamente a Administradores / Gestão RH
          const isRh = n.tipo?.startsWith('rh_') || n.dados_extras?.onlyAdmin || n.dados_extras?.modulo === 'rh'
          if (isRh && !isAdmin && !isGestorRh) {
            return false
          }

          // 2. Notificações de Checkpoint de Implantações:
          // Não exibir para Perfil Técnico e nem para usuários que não são Funcionários
          const isCheckpoint = n.tipo === 'checkpoint' || 
            (typeof n.tipo === 'string' && n.tipo.toLowerCase().includes('checkpoint')) ||
            (typeof n.titulo === 'string' && (
              n.titulo.toLowerCase().includes('checkpoint') || 
              n.titulo.toLowerCase().includes('formulário') || 
              n.titulo.toLowerCase().includes('formulario')
            ))

          if (isCheckpoint) {
            if (isTecnico || !isFuncionario) {
              return false
            }
          }

          return true
        })
        .map((n: any) => ({
          ...n,
          lida: readIds.has(n.id) // O status de lida é estritamente pessoal deste usuário
        }))

      setNotificacoes(userList)
    } catch (err) {
      console.warn('Erro ao carregar notificações:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  // Load initial notifications & subscribe to Realtime updates
  useEffect(() => {
    if (isCliente) return

    fetchNotificacoes()

    // 1. Realtime subscription to Supabase table
    const channel = supabase
      .channel('realtime:notificacoes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificacoes' },
        () => {
          fetchNotificacoes()
        }
      )
      .subscribe()

    // 2. Polling de fallback a cada 20 segundos
    const interval = setInterval(() => {
      fetchNotificacoes()
    }, 20000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [isCliente, userKey])

  // Lembretes de ponto: avalia periodicamente a jornada x registros do dia do usuário logado.
  // São notificações locais/pessoais (não persistem no banco global).
  useEffect(() => {
    if (isCliente || !isFuncionario) return
    const uid = currentUser?.id
    if (!uid) return

    let ativo = true

    const avaliar = async () => {
      try {
        const [registrosDia, jornada] = await Promise.all([
          api.getRegistrosPontoDoDia(uid).catch(() => []),
          api.getJornadaPorUsuario(uid).catch(() => null)
        ])
        if (!ativo) return

        const lembretes = avaliarLembretesPonto(uid, registrosDia, jornada)
        const dispensados = getDeletedIds()

        const itens = lembretes
          .filter(l => !dispensados.has(l.id))
          .map(l => ({
            id: l.id,
            titulo: l.titulo,
            mensagem: l.mensagem,
            tipo: 'ponto_lembrete',
            lida: getReadIds().has(l.id),
            created_at: new Date().toISOString(),
            dados_extras: { usuario_id: uid, modulo: 'ponto', local: true }
          }))

        setLembretesPonto(itens)
      } catch (_) {
        // silencioso
      }
    }

    avaliar()
    const interval = setInterval(avaliar, 60000) // a cada 1 min
    return () => {
      ativo = false
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCliente, isFuncionario, userKey])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const dentroDoBotao = popoverRef.current?.contains(target)
      const dentroDoPainel = panelRef.current?.contains(target)
      if (!dentroDoBotao && !dentroDoPainel) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const readIds = getReadIds()
    readIds.add(id)
    saveReadIds(readIds)

    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    setLembretesPonto(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
  }

  const handleMarkAllAsRead = () => {
    const readIds = getReadIds()
    notificacoes.forEach(n => readIds.add(n.id))
    lembretesPonto.forEach(n => readIds.add(n.id))
    saveReadIds(readIds)

    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
    setLembretesPonto(prev => prev.map(n => ({ ...n, lida: true })))
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const deletedIds = getDeletedIds()
    deletedIds.add(id)
    saveDeletedIds(deletedIds)

    setNotificacoes(prev => prev.filter(n => n.id !== id))
    setLembretesPonto(prev => prev.filter(n => n.id !== id))
  }

  const handleClearAll = () => {
    if (window.confirm('Deseja limpar suas notificações deste painel? (Não afetará os outros usuários da equipe)')) {
      const deletedIds = getDeletedIds()
      notificacoes.forEach(n => deletedIds.add(n.id))
      lembretesPonto.forEach(n => deletedIds.add(n.id))
      saveDeletedIds(deletedIds)

      setNotificacoes([])
      setLembretesPonto([])
    }
  }

  const handleOpenNotificacao = (item: any) => {
    if (!item.lida) {
      handleMarkAsRead(item.id)
    }
    setIsOpen(false)

    if (item.tipo === 'ponto_lembrete') {
      // Lembrete de ponto: abre o modal de Controle de Ponto (montado no Header)
      window.dispatchEvent(new CustomEvent('mantran:abrir-controle-ponto'))
      return
    } else if (item.tipo?.startsWith('rh_') || item.dados_extras?.modulo === 'rh') {
      navigate('/rh')
    } else if (item.tipo === 'nova_implantacao' && item.implantacao_id) {
      // Redireciona diretamente para a Implantação recém-criada
      navigate(`/implantacoes/${item.implantacao_id}`)
    } else if (item.implantacao_id) {
      // Redireciona para o Checkpoint preenchido
      navigate(`/implantacoes/${item.implantacao_id}?checkpoint=true`)
    } else {
      navigate('/implantacoes')
    }
  }

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return ''
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHours = Math.floor(diffMin / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffSec < 60) return 'Agora mesmo'
      if (diffMin < 60) return `Há ${diffMin} min`
      if (diffHours < 24) return `Há ${diffHours}h`
      if (diffDays === 1) return 'Ontem'
      if (diffDays < 7) return `Há ${diffDays} dias`

      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // Filtered notifications
  // Combina lembretes de ponto (locais, no topo) com as notificações do banco
  const todasNotificacoes = [...lembretesPonto, ...notificacoes]

  const displayedNotificacoes = todasNotificacoes.filter(n => {
    if (filter === 'unread') return !n.lida
    return true
  })

  // Total de não lidas considerando também os lembretes de ponto
  const totalNaoLidas = todasNotificacoes.filter(n => !n.lida).length

  // Do not render if client user
  if (isCliente) return null

  return (
    <div className="relative" ref={popoverRef}>
      {/* Sininho Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchNotificacoes()
        }}
        aria-label="Notificações"
        className={clsx(
          "relative p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center group focus:outline-none",
          isOpen
            ? "bg-brand-500/20 text-brand-400 border border-brand-500/30 shadow-[0_0_15px_rgba(14,165,233,0.25)]"
            : totalNaoLidas > 0
            ? "bg-slate-800/80 hover:bg-slate-800 text-brand-400 border border-slate-700/80 hover:border-brand-500/40"
            : "bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50"
        )}
        title={totalNaoLidas > 0 ? `${totalNaoLidas} nova(s) notificação(ões)` : 'Notificações'}
      >
        <Bell className={clsx(
          "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
          totalNaoLidas > 0 && "animate-[wiggle_1s_ease-in-out_infinite]"
        )} />

        {/* Pulsing Badge for unread count */}
        {totalNaoLidas > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-5 min-w-5 px-1 bg-gradient-to-r from-red-500 to-rose-600 text-[10px] font-black text-white shadow-md border border-dark-card">
              {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
            </span>
          </span>
        )}
      </button>

      {/* Popover / Dropdown Menu (renderizado via portal para ficar acima do sidebar) */}
      {isOpen && createPortal(
        <div
          ref={panelRef}
          className="fixed top-[70px] right-3 sm:right-6 w-96 sm:w-[450px] max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-90px)] bg-[#131622]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
        >
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Notificações</h3>
                  {totalNaoLidas > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/30">
                      {totalNaoLidas} nova{totalNaoLidas > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {isTecnico || !isFuncionario ? 'Atualizações do Sistema' : 'Atualizações de Implantações e Checkpoints'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchNotificacoes(true)}
                title="Atualizar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin text-brand-400")} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs & Quick Actions */}
          <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-900/30 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                  filter === 'all'
                    ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                Todas ({notificacoes.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer",
                  filter === 'unread'
                    ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                )}
              >
                Não Lidas ({totalNaoLidas})
              </button>
            </div>

            {totalNaoLidas > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors font-medium hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar lidas
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/50 custom-scrollbar">
            {loading && notificacoes.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-400" />
                <span className="text-xs">Buscando notificações...</span>
              </div>
            ) : displayedNotificacoes.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 mb-1">
                  <Bell className="w-6 h-6 opacity-40" />
                </div>
                <p className="text-sm font-semibold text-slate-300">
                  {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação recente'}
                </p>
                <p className="text-xs text-slate-500 max-w-xs">
                  {isTecnico || !isFuncionario
                    ? 'Quando novas atualizações ou avisos forem registrados, você será informado aqui em tempo real.'
                    : 'Quando novas implantações forem criadas ou os clientes preencherem o Checkpoint, você será avisado aqui em tempo real.'}
                </p>
              </div>
            ) : (
              displayedNotificacoes.map((item) => {
                const isNovaImplantacao = item.tipo === 'nova_implantacao'
                const isFerias = item.tipo === 'rh_ferias'
                const isFalta = item.tipo === 'rh_falta'
                const isPlantao = item.tipo === 'rh_plantao'
                const isPontoLembrete = item.tipo === 'ponto_lembrete'
                const isRhNotification = isFerias || isFalta || isPlantao || item.dados_extras?.modulo === 'rh'
                const isConcluido = item.titulo?.includes('Concluído') || item.dados_extras?.isCompleto
                const nomeCliente = item.dados_extras?.nome_empresa || 'Cliente'
                const colaboradorNome = item.dados_extras?.usuario_nome || 'Colaborador'

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenNotificacao(item)}
                    className={clsx(
                      "p-3.5 transition-all duration-150 cursor-pointer group flex items-start gap-3 relative hover:bg-slate-800/60",
                      !item.lida
                        ? isPontoLembrete
                          ? "bg-indigo-500/5 border-l-2 border-indigo-400"
                          : isFerias
                          ? "bg-amber-500/5 border-l-2 border-amber-400"
                          : isFalta
                          ? "bg-emerald-500/5 border-l-2 border-emerald-400"
                          : isPlantao
                          ? "bg-yellow-500/5 border-l-2 border-yellow-400"
                          : "bg-brand-500/5 border-l-2 border-brand-400"
                        : "opacity-80 hover:opacity-100"
                    )}
                  >
                    {/* Status Icon */}
                    <div className={clsx(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 shadow-sm",
                      isPontoLembrete
                        ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 shadow-indigo-500/10"
                        : isFerias
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-amber-500/10"
                        : isFalta
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10"
                        : isPlantao
                        ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400 shadow-yellow-500/10"
                        : isNovaImplantacao
                        ? "bg-purple-500/15 border-purple-500/30 text-purple-400 shadow-purple-500/10"
                        : isConcluido
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10"
                        : "bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-blue-500/10"
                    )}>
                      {isPontoLembrete ? (
                        <Clock className="w-4 h-4" />
                      ) : isFerias ? (
                        <Palmtree className="w-4 h-4" />
                      ) : isFalta ? (
                        <FileText className="w-4 h-4" />
                      ) : isPlantao ? (
                        <PhoneCall className="w-4 h-4" />
                      ) : isNovaImplantacao ? (
                        <Rocket className="w-4 h-4" />
                      ) : isConcluido ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={clsx(
                            "text-[11px] font-bold px-2 py-0.5 rounded-md border",
                            isPontoLembrete
                              ? "bg-indigo-950/40 text-indigo-300 border-indigo-500/30"
                              : isFerias
                              ? "bg-amber-950/40 text-amber-300 border-amber-500/30"
                              : isFalta
                              ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                              : isPlantao
                              ? "bg-yellow-950/40 text-yellow-300 border-yellow-500/30"
                              : isNovaImplantacao
                              ? "bg-purple-950/40 text-purple-300 border-purple-500/30"
                              : isConcluido
                              ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                              : "bg-blue-950/40 text-blue-300 border-blue-500/30"
                          )}>
                            {isPontoLembrete ? '⏰ Ponto' : isRhNotification ? `👤 ${colaboradorNome}` : `🏢 ${nomeCliente}`}
                          </span>

                          <span className="text-xs font-bold text-white truncate">
                            {item.titulo}
                          </span>
                        </div>

                        {/* Unread indicator dot */}
                        {!item.lida && (
                          <span className={clsx(
                            "w-2 h-2 rounded-full shrink-0",
                            isFerias
                              ? "bg-amber-400 shadow-[0_0_6px_#fbbf24]"
                              : isFalta
                              ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                              : isPlantao
                              ? "bg-yellow-400 shadow-[0_0_6px_#facc15]"
                              : "bg-brand-400 shadow-[0_0_6px_#38bdf8]"
                          )} />
                        )}
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-2">
                        {item.mensagem}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(item.created_at)}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenNotificacao(item)
                            }}
                            className={clsx(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-semibold transition-all cursor-pointer",
                              isPontoLembrete
                                ? "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                : isFerias
                                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : isFalta
                                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : isPlantao
                                ? "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                                : isNovaImplantacao
                                ? "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30"
                                : "bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border-brand-500/30"
                            )}
                          >
                            <ExternalLink className="w-3 h-3" />
                            {isPontoLembrete ? 'Visualizar Ponto' : isRhNotification ? 'Abrir RH' : isNovaImplantacao ? 'Abrir Implantação' : 'Visualizar Formulário'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(item.id, e)}
                            title="Remover das minhas notificações"
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {displayedNotificacoes.length > 0 && (
            <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Total: {todasNotificacoes.length} notificações</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-red-400/80 hover:text-red-400 hover:underline transition-colors cursor-pointer"
              >
                Limpar meu histórico
              </button>
            </div>
          )}

        </div>,
        document.body
      )}
    </div>
  )
}

