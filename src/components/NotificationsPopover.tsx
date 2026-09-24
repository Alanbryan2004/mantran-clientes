import { useState, useEffect, useRef } from 'react'
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
import { getLoggedUser, isClienteUser, isAdminUser } from '../lib/auth'
import clsx from 'clsx'

export function NotificationsPopover() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notificacoes, setNotificacoes] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const popoverRef = useRef<HTMLDivElement>(null)

  const isCliente = isClienteUser()
  const currentUser = getLoggedUser()
  const isAdmin = isAdminUser()
  const isGestorRh = isAdmin || currentUser?.perfil?.trim().toLowerCase() === 'rh'
  const userKey = currentUser ? (currentUser.id || currentUser.login || 'user') : 'user'

  const STORAGE_KEY_READ = `@Mantran:notificacoes_lidas_${userKey}`
  const STORAGE_KEY_DELETED = `@Mantran:notificacoes_excluidas_${userKey}`

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
          const isRh = n.tipo?.startsWith('rh_') || n.dados_extras?.onlyAdmin || n.dados_extras?.modulo === 'rh'
          // Notificações de RH são restritas exclusivamente a Administradores / Gestão RH
          if (isRh && !isAdmin && !isGestorRh) {
            return false
          }
          return true
        })
        .map((n: any) => ({
          ...n,
          lida: readIds.has(n.id) // O status de lida é estritamente pessoal deste usuário
        }))

      setNotificacoes(userList)
      const unread = userList.filter((n: any) => !n.lida).length
      setUnreadCount(unread)
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
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
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleMarkAllAsRead = () => {
    const readIds = getReadIds()
    notificacoes.forEach(n => readIds.add(n.id))
    saveReadIds(readIds)

    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })))
    setUnreadCount(0)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const deletedIds = getDeletedIds()
    deletedIds.add(id)
    saveDeletedIds(deletedIds)

    const target = notificacoes.find(n => n.id === id)
    setNotificacoes(prev => prev.filter(n => n.id !== id))
    if (target && !target.lida) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleClearAll = () => {
    if (window.confirm('Deseja limpar suas notificações deste painel? (Não afetará os outros usuários da equipe)')) {
      const deletedIds = getDeletedIds()
      notificacoes.forEach(n => deletedIds.add(n.id))
      saveDeletedIds(deletedIds)

      setNotificacoes([])
      setUnreadCount(0)
    }
  }

  const handleOpenNotificacao = (item: any) => {
    if (!item.lida) {
      handleMarkAsRead(item.id)
    }
    setIsOpen(false)

    if (item.tipo?.startsWith('rh_') || item.dados_extras?.modulo === 'rh') {
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
  const displayedNotificacoes = notificacoes.filter(n => {
    if (filter === 'unread') return !n.lida
    return true
  })

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
            : unreadCount > 0
            ? "bg-slate-800/80 hover:bg-slate-800 text-brand-400 border border-slate-700/80 hover:border-brand-500/40"
            : "bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50"
        )}
        title={unreadCount > 0 ? `${unreadCount} nova(s) notificação(ões)` : 'Notificações'}
      >
        <Bell className={clsx(
          "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
          unreadCount > 0 && "animate-[wiggle_1s_ease-in-out_infinite]"
        )} />

        {/* Pulsing Badge for unread count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center px-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-5 min-w-5 px-1 bg-gradient-to-r from-red-500 to-rose-600 text-[10px] font-black text-white shadow-md border border-dark-card">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 sm:w-[450px] max-w-[calc(100vw-2rem)] bg-[#131622]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">Notificações</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/30">
                      {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">Atualizações de Implantações e Checkpoints</p>
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
                Não Lidas ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
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
                  Quando novas implantações forem criadas ou os clientes preencherem o Checkpoint, você será avisado aqui em tempo real.
                </p>
              </div>
            ) : (
              displayedNotificacoes.map((item) => {
                const isNovaImplantacao = item.tipo === 'nova_implantacao'
                const isFerias = item.tipo === 'rh_ferias'
                const isFalta = item.tipo === 'rh_falta'
                const isPlantao = item.tipo === 'rh_plantao'
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
                        ? isFerias
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
                      isFerias
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
                      {isFerias ? (
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
                            isFerias
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
                            {isRhNotification ? `👤 ${colaboradorNome}` : `🏢 ${nomeCliente}`}
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
                              isFerias
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
                            {isRhNotification ? 'Abrir RH' : isNovaImplantacao ? 'Abrir Implantação' : 'Visualizar Formulário'}
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
              <span>Total: {notificacoes.length} notificações</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-red-400/80 hover:text-red-400 hover:underline transition-colors cursor-pointer"
              >
                Limpar meu histórico
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

