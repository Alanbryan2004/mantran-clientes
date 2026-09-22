import { useState, useEffect, useMemo } from 'react'
import { 
  Users, UserPlus, Search, Edit3, Trash2, CheckCircle2, XCircle, 
  Shield, UserCheck, Key, RefreshCw, Eye, EyeOff, AlertTriangle, 
  Briefcase, Wrench, Headphones, Building2, Handshake, Lock, Check
} from 'lucide-react'
import { api, type UsuarioSistema } from '../lib/api'
import { isAdminUser } from '../lib/auth'
import clsx from 'clsx'

const PERFIS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string; desc: string }> = {
  Administrador: {
    label: 'Administrador',
    icon: Shield,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    desc: 'Acesso total a todas as funções e gerenciamento'
  },
  Tecnico: {
    label: 'Técnico',
    icon: Wrench,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    desc: 'Acesso a implantações, bases e projetos'
  },
  Suporte: {
    label: 'Suporte',
    icon: Headphones,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    desc: 'Atendimento e acompanhamento de clientes'
  },
  Comercial: {
    label: 'Comercial',
    icon: Briefcase,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    desc: 'Acompanhamento do pipeline de implantações'
  },
  Usuario: {
    label: 'Usuário (Consulta)',
    icon: Eye,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    desc: 'Apenas visualização das informações'
  },
  Parceiro: {
    label: 'Parceiro',
    icon: Handshake,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    desc: 'Acesso restrito ao projeto/processamento parceiro'
  },
  Cliente: {
    label: 'Cliente',
    icon: Building2,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    desc: 'Acesso restrito à sua própria implantação'
  }
}

export function Usuarios() {
  const isAdmin = isAdminUser()

  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UsuarioSistema | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Form State
  const [nome, setNome] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [perfil, setPerfil] = useState('Cliente')
  const [ativo, setAtivo] = useState(true)
  const [eTecnico, setETecnico] = useState(false)
  const [metaSemanal, setMetaSemanal] = useState<number>(0)
  const [showPassword, setShowPassword] = useState(false)

  // Delete State
  const [userToDelete, setUserToDelete] = useState<UsuarioSistema | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 3500)
  }

  const loadUsuarios = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      else setRefreshing(true)
      setError(null)
      const data = await api.getUsuariosSistema()
      setUsuarios(data)
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err)
      setError(err.message || 'Erro ao carregar lista de usuários.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadUsuarios()
  }, [])

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingUser(null)
    setNome('')
    setLogin('')
    setSenha('')
    setPerfil('Cliente')
    setAtivo(true)
    setETecnico(false)
    setMetaSemanal(0)
    setShowPassword(false)
    setModalError(null)
    setIsModalOpen(true)
  }

  // Open modal for Edit
  const handleOpenEdit = (user: UsuarioSistema) => {
    setEditingUser(user)
    setNome(user.nome || '')
    setLogin(user.login || '')
    setSenha('') // deixar em branco se não quiser alterar
    setPerfil(user.perfil || 'Cliente')
    setAtivo(user.ativo ?? true)
    setETecnico(user.e_tecnico ?? false)
    setMetaSemanal(user.meta_semanal || 0)
    setShowPassword(false)
    setModalError(null)
    setIsModalOpen(true)
  }

  // Save User (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (!nome.trim()) {
      setModalError('Informe o nome do usuário.')
      return
    }
    if (!login.trim()) {
      setModalError('Informe o login de acesso.')
      return
    }

    // Se for criação, a senha é obrigatória
    if (!editingUser && !senha.trim()) {
      setModalError('Informe a senha inicial do usuário.')
      return
    }

    try {
      setModalLoading(true)

      if (editingUser) {
        // Atualização
        const updated = await api.updateUsuarioSistema(editingUser.id, {
          nome: nome.trim(),
          login: login.trim(),
          senha: senha.trim() ? senha.trim() : undefined,
          perfil,
          ativo,
          e_tecnico: eTecnico,
          meta_semanal: metaSemanal
        })

        setUsuarios(prev => prev.map(u => (u.id === updated.id ? updated : u)))
        showToast(`Usuário "${updated.nome}" atualizado com sucesso!`)
      } else {
        // Criação
        const created = await api.createUsuarioSistema({
          nome: nome.trim(),
          login: login.trim(),
          senha: senha.trim(),
          perfil,
          ativo,
          e_tecnico: eTecnico,
          meta_semanal: metaSemanal
        })

        setUsuarios(prev => [created, ...prev])
        showToast(`Usuário "${created.nome}" cadastrado com sucesso!`)
      }

      setIsModalOpen(false)
    } catch (err: any) {
      console.error('Erro ao salvar usuário:', err)
      setModalError(err.message || 'Erro ao salvar usuário.')
    } finally {
      setModalLoading(false)
    }
  }

  // Toggle Active Status
  const handleToggleAtivo = async (user: UsuarioSistema) => {
    const novoStatus = !user.ativo
    try {
      // Optimistic update
      setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, ativo: novoStatus } : u))
      await api.toggleUsuarioAtivo(user.id, novoStatus)
      showToast(`Usuário "${user.nome}" foi ${novoStatus ? 'ativado' : 'desativado'} com sucesso.`)
    } catch (err: any) {
      console.error('Erro ao alterar status:', err)
      // Rollback
      setUsuarios(prev => prev.map(u => u.id === user.id ? { ...u, ativo: user.ativo } : u))
      alert('Erro ao alterar status do usuário: ' + (err.message || 'Erro inesperado'))
    }
  }

  // Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return
    try {
      setDeleteLoading(true)
      await api.deleteUsuarioSistema(userToDelete.id)
      setUsuarios(prev => prev.filter(u => u.id !== userToDelete.id))
      showToast(`Usuário "${userToDelete.nome}" excluído com sucesso.`)
      setUserToDelete(null)
    } catch (err: any) {
      console.error('Erro ao excluir usuário:', err)
      alert('Erro ao excluir usuário: ' + (err.message || 'Erro inesperado'))
    } finally {
      setDeleteLoading(false)
    }
  }

  // Filtered list
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter(u => {
      // Search
      const searchMatch = !searchTerm || 
        (u.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.login || '').toLowerCase().includes(searchTerm.toLowerCase())

      // Perfil
      let perfilMatch = true
      if (filtroPerfil !== 'todos') {
        if (filtroPerfil === 'tecnico_suporte') {
          perfilMatch = u.perfil === 'Tecnico' || u.perfil === 'Suporte'
        } else {
          perfilMatch = u.perfil === filtroPerfil
        }
      }

      // Status
      const statusMatch = filtroStatus === 'todos' 
        ? true 
        : filtroStatus === 'ativos' 
        ? u.ativo 
        : !u.ativo

      return searchMatch && perfilMatch && statusMatch
    })
  }, [usuarios, searchTerm, filtroPerfil, filtroStatus])

  // Statistics
  const stats = useMemo(() => {
    const total = usuarios.length
    const ativos = usuarios.filter(u => u.ativo).length
    const inativos = total - ativos
    const admins = usuarios.filter(u => u.perfil === 'Administrador').length
    const tecnicosSuporte = usuarios.filter(u => u.perfil === 'Tecnico' || u.perfil === 'Suporte').length
    const comerciais = usuarios.filter(u => u.perfil === 'Comercial').length
    const clientes = usuarios.filter(u => u.perfil === 'Cliente').length
    return { total, ativos, inativos, admins, tecnicosSuporte, comerciais, clientes }
  }, [usuarios])

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
        <p className="text-slate-400 max-w-md mb-6">
          Apenas administradores do sistema têm permissão para acessar e gerenciar usuários.
        </p>
        <button
          onClick={() => window.history.back()}
          className="btn-secondary"
        >
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl border border-emerald-500/30 animate-bounce">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Gestão de Usuários
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {stats.total} total
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Cadastre novos usuários, altere senhas, perfis e ative/desative acessos ao sistema.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadUsuarios(true)}
            disabled={loading || refreshing}
            title="Atualizar lista"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin text-cyan-400")} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Clickable Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total de Contas */}
        <div 
          onClick={() => {
            setFiltroPerfil('todos')
            setFiltroStatus('todos')
            setSearchTerm('')
          }}
          title="Clique para exibir todos os usuários"
          className={clsx(
            "p-3.5 rounded-2xl border backdrop-blur cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
            filtroPerfil === 'todos' && filtroStatus === 'todos' && !searchTerm
              ? "bg-slate-800/90 border-brand-500/50 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/10"
              : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total de Contas</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <p className="text-2xl font-bold text-white">{stats.total}</p>
            {filtroPerfil === 'todos' && filtroStatus === 'todos' && !searchTerm && (
              <span className="text-[10px] text-brand-400 font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Todos
              </span>
            )}
          </div>
        </div>

        {/* Ativos */}
        <div 
          onClick={() => {
            setFiltroStatus(filtroStatus === 'ativos' ? 'todos' : 'ativos')
          }}
          title="Clique para filtrar apenas usuários Ativos"
          className={clsx(
            "p-3.5 rounded-2xl border backdrop-blur cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
            filtroStatus === 'ativos'
              ? "bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
              : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium">Ativos</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <p className="text-2xl font-bold text-emerald-400">{stats.ativos}</p>
            {filtroStatus === 'ativos' && (
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Filtrado
              </span>
            )}
          </div>
        </div>

        {/* Administradores */}
        <div 
          onClick={() => {
            setFiltroPerfil(filtroPerfil === 'Administrador' ? 'todos' : 'Administrador')
          }}
          title="Clique para filtrar perfil Administrador"
          className={clsx(
            "p-3.5 rounded-2xl border backdrop-blur cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
            filtroPerfil === 'Administrador'
              ? "bg-rose-500/10 border-rose-500/50 ring-2 ring-rose-500/30 shadow-lg shadow-rose-500/10"
              : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 font-medium">Administradores</span>
            <Shield className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <p className="text-2xl font-bold text-rose-400">{stats.admins}</p>
            {filtroPerfil === 'Administrador' && (
              <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Filtrado
              </span>
            )}
          </div>
        </div>

        {/* Técnico & Suporte */}
        <div 
          onClick={() => {
            setFiltroPerfil(filtroPerfil === 'tecnico_suporte' ? 'todos' : 'tecnico_suporte')
          }}
          title="Clique para filtrar Técnicos e Suporte"
          className={clsx(
            "p-3.5 rounded-2xl border backdrop-blur cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
            filtroPerfil === 'tecnico_suporte' || filtroPerfil === 'Tecnico' || filtroPerfil === 'Suporte'
              ? "bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10"
              : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-400 font-medium">Técnico & Suporte</span>
            <Wrench className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <p className="text-2xl font-bold text-blue-400">{stats.tecnicosSuporte}</p>
            {(filtroPerfil === 'tecnico_suporte' || filtroPerfil === 'Tecnico' || filtroPerfil === 'Suporte') && (
              <span className="text-[10px] text-blue-400 font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Filtrado
              </span>
            )}
          </div>
        </div>

        {/* Comercial */}
        <div 
          onClick={() => {
            setFiltroPerfil(filtroPerfil === 'Comercial' ? 'todos' : 'Comercial')
          }}
          title="Clique para filtrar perfil Comercial"
          className={clsx(
            "p-3.5 rounded-2xl border backdrop-blur cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
            filtroPerfil === 'Comercial'
              ? "bg-cyan-500/10 border-cyan-500/50 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10"
              : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-cyan-400 font-medium">Comercial</span>
            <Briefcase className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <p className="text-2xl font-bold text-cyan-400">{stats.comerciais}</p>
            {filtroPerfil === 'Comercial' && (
              <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Filtrado
              </span>
            )}
          </div>
        </div>

        {/* Clientes */}
        <div 
          onClick={() => {
            setFiltroPerfil(filtroPerfil === 'Cliente' ? 'todos' : 'Cliente')
          }}
          title="Clique para filtrar usuários de Clientes"
          className={clsx(
            "p-3.5 rounded-2xl border backdrop-blur cursor-pointer select-none transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
            filtroPerfil === 'Cliente'
              ? "bg-purple-500/10 border-purple-500/50 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/10"
              : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-400 font-medium">Clientes</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <p className="text-2xl font-bold text-purple-400">{stats.clientes}</p>
            {filtroPerfil === 'Cliente' && (
              <span className="text-[10px] text-purple-400 font-semibold flex items-center gap-0.5">
                <Check className="w-3 h-3" /> Filtrado
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou login..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Perfil Filter */}
          <div className="flex items-center gap-2">
            <select
              value={filtroPerfil}
              onChange={e => setFiltroPerfil(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-slate-700/60 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
            >
              <option value="todos">Todos os Perfis</option>
              <option value="Administrador">🛡️ Administrador</option>
              <option value="Tecnico">⚡ Técnico</option>
              <option value="Suporte">🎧 Suporte</option>
              <option value="tecnico_suporte">⚡🎧 Técnico & Suporte</option>
              <option value="Comercial">💼 Comercial</option>
              <option value="Cliente">🏢 Cliente</option>
              <option value="Usuario">👁️ Usuário (Consulta)</option>
              <option value="Parceiro">🤝 Parceiro</option>
            </select>

            {/* Status Filter */}
            <div className="flex bg-slate-950/60 border border-slate-700/60 p-1 rounded-xl text-xs">
              <button
                onClick={() => setFiltroStatus('todos')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg font-medium transition-all",
                  filtroStatus === 'todos' ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroStatus('ativos')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg font-medium transition-all",
                  filtroStatus === 'ativos' ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Ativos
              </button>
              <button
                onClick={() => setFiltroStatus('inativos')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg font-medium transition-all",
                  filtroStatus === 'inativos' ? "bg-rose-500/20 text-rose-400 font-bold" : "text-slate-400 hover:text-slate-200"
                )}
              >
                Inativos
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(searchTerm || filtroPerfil !== 'todos' || filtroStatus !== 'todos') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400">
            <span>
              Exibindo <strong className="text-white">{filteredUsuarios.length}</strong> de {usuarios.length} usuários
            </span>
            <button
              onClick={() => {
                setSearchTerm('')
                setFiltroPerfil('todos')
                setFiltroStatus('todos')
              }}
              className="text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Resetar filtros
            </button>
          </div>
        )}
      </div>

      {/* Users Table / Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
          <p className="text-sm">Carregando usuários do sistema...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => loadUsuarios()}
            className="mt-4 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-white text-xs rounded-xl font-medium"
          >
            Tentar Novamente
          </button>
        </div>
      ) : filteredUsuarios.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/60">
          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-300">Nenhum usuário encontrado</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Não foram encontrados registros para os filtros selecionados.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl"
          >
            Cadastrar Novo Usuário
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Login</th>
                  <th className="px-6 py-4">Perfil de Acesso</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Detalhes</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredUsuarios.map((u) => {
                  const perfilConf = PERFIS_CONFIG[u.perfil] || {
                    label: u.perfil || 'Usuário',
                    icon: Shield,
                    color: 'text-slate-400',
                    bg: 'bg-slate-500/10',
                    border: 'border-slate-500/20',
                    desc: ''
                  }
                  const Icon = perfilConf.icon

                  return (
                    <tr 
                      key={u.id}
                      className={clsx(
                        "hover:bg-slate-800/40 transition-colors",
                        !u.ativo && "opacity-60 bg-slate-950/30"
                      )}
                    >
                      {/* Usuário (Avatar + Nome) */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0",
                            perfilConf.bg,
                            perfilConf.border,
                            perfilConf.color
                          )}>
                            {(u.nome || u.login || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate text-sm">
                              {u.nome || 'Sem Nome'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : 'Data não registrada'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Login */}
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300">
                          <Key className="w-3 h-3 text-cyan-400/70" />
                          <span>{u.login}</span>
                        </div>
                      </td>

                      {/* Perfil */}
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                          perfilConf.bg,
                          perfilConf.border,
                          perfilConf.color
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                          {perfilConf.label}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleAtivo(u)}
                          title={u.ativo ? "Clique para desativar este usuário" : "Clique para ativar este usuário"}
                          className={clsx(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer",
                            u.ativo 
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25" 
                              : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
                          )}
                        >
                          {u.ativo ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ativo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Inativo</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Detalhes (Meta / Técnico) */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          {u.e_tecnico && (
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              Técnico
                            </span>
                          )}
                          {u.meta_semanal ? (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              Meta: {u.meta_semanal}h
                            </span>
                          ) : null}
                          {!u.e_tecnico && !u.meta_semanal && (
                            <span className="text-slate-500 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Editar usuário"
                            className="p-2 rounded-lg bg-slate-800/80 hover:bg-cyan-500/10 hover:text-cyan-300 text-slate-400 border border-slate-700/60 hover:border-cyan-500/30 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => setUserToDelete(u)}
                            title="Excluir usuário"
                            className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 border border-slate-700/60 hover:border-rose-500/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Criar / Editar Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                  {editingUser ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingUser ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingUser ? `Alterando dados da conta "${editingUser.login}"` : 'Preencha os dados de acesso e perfil do usuário'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-4 overflow-y-auto flex-1">
              {modalError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome Completo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alan Bryan ou Nome do Cliente"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>

              {/* Login */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Login de Acesso <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: alan ou Empresa@Mantran"
                    value={login}
                    onChange={e => setLogin(e.target.value.replace(/\s+/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  O login deve ser único e sem espaços (ex: alan, marcio ou Empresa@Mantran).
                </p>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {editingUser ? 'Alterar Senha' : 'Senha Inicial'} {!editingUser && <span className="text-rose-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingUser ? 'Deixe em branco para manter a senha atual' : 'Digite a senha do usuário'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    required={!editingUser}
                    className="w-full px-3.5 py-2.5 pr-11 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white focus:outline-none p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {editingUser && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Preencha este campo apenas se desejar redefinir a senha deste usuário.
                  </p>
                )}
              </div>

              {/* Perfil Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Perfil de Acesso <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(PERFIS_CONFIG).map(([key, p]) => {
                    const PIcon = p.icon
                    const isSelected = perfil === key
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => {
                          setPerfil(key)
                          if (key === 'Tecnico') setETecnico(true)
                        }}
                        className={clsx(
                          "flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all",
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500/40 text-white ring-1 ring-cyan-500/30"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                        )}
                      >
                        <div className={clsx("p-1.5 rounded-lg border shrink-0 mt-0.5", p.bg, p.border, p.color)}>
                          <PIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight">{p.label}</p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{p.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Options Row (Ativo, É Técnico, Meta) */}
              <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Ativo switch */}
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:bg-slate-800/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={e => setAtivo(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Usuário Ativo</span>
                    <span className="text-[10px] text-slate-500">Pode fazer login</span>
                  </div>
                </label>

                {/* É Técnico */}
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:bg-slate-800/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={eTecnico}
                    onChange={e => setETecnico(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-semibold text-white block">Equipe Técnica</span>
                    <span className="text-[10px] text-slate-500">Exibe em atribuições</span>
                  </div>
                </label>

                {/* Meta Semanal */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Meta Semanal (horas)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={metaSemanal}
                    onChange={e => setMetaSemanal(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {modalLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Excluir Usuário</h3>
            <p className="text-xs text-slate-400 mb-6">
              Tem certeza que deseja excluir o usuário <strong className="text-white">"{userToDelete.nome}"</strong> (<code className="text-cyan-400">{userToDelete.login}</code>)?
              <br />
              Esta ação removerá permanentemente o acesso deste usuário ao sistema.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {deleteLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
