import { useState, useEffect } from 'react'
import { X, KeyRound, Copy, Check, Eye, EyeOff, ShieldCheck, UserCheck, AlertCircle, Save, Send, Sparkles, UserPlus, MessageSquare } from 'lucide-react'
import { api } from '../lib/api'
import clsx from 'clsx'

interface AcessoClienteModalProps {
  isOpen: boolean
  onClose: () => void
  implantacao: {
    id: string
    nome_empresa: string
    bases?: {
      nome_base: string
    }
    tipo_cliente?: string
  } | null
  onSuccess?: () => void
}

export function AcessoClienteModal({ isOpen, onClose, implantacao, onSuccess }: AcessoClienteModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [usuario, setUsuario] = useState<any | null>(null)

  const [nome, setNome] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [copiedLogin, setCopiedLogin] = useState(false)
  const [copiedSenha, setCopiedSenha] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [copiedBoasVindas, setCopiedBoasVindas] = useState(false)

  // Extrair número da base (ex: dbMantran010 -> 010, dbMantran120 -> 120)
  const getBaseNumero = (baseName?: string) => {
    if (!baseName) return '001'
    const match = baseName.match(/\d+/)
    return match ? match[0] : '001'
  }

  useEffect(() => {
    if (isOpen && implantacao) {
      carregarUsuario()
    } else {
      setUsuario(null)
      setNome('')
      setLogin('')
      setSenha('')
      setIsEditing(false)
      setShowPassword(false)
    }
  }, [isOpen, implantacao])

  const carregarUsuario = async () => {
    if (!implantacao) return
    setLoading(true)
    setIsEditing(false)
    try {
      const user = await api.getUsuarioClienteByEmpresa(implantacao.nome_empresa)
      if (user) {
        setUsuario(user)
        setNome(user.nome || implantacao.nome_empresa)
        setLogin(user.login || `${implantacao.nome_empresa}@Mantran`)
        setSenha(user.senha || `${getBaseNumero(implantacao.bases?.nome_base)}@Mantran`)
      } else {
        // Usuário ainda não existe -> Preencher valores padrão
        setUsuario(null)
        const baseNum = getBaseNumero(implantacao.bases?.nome_base)
        setNome(implantacao.nome_empresa)
        setLogin(`${implantacao.nome_empresa}@Mantran`)
        setSenha(`${baseNum}@Mantran`)
      }
    } catch (err) {
      console.error('Erro ao buscar usuário cliente:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSalvarOuLiberar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!implantacao || !login.trim() || !senha.trim()) return

    setSaving(true)
    try {
      if (usuario) {
        // Atualizar usuário existente
        const updated = await api.updateUsuarioCliente(usuario.id, {
          nome: nome.trim(),
          login: login.trim(),
          senha: senha.trim()
        })
        setUsuario(updated)
        setIsEditing(false)
        alert('Credenciais atualizadas com sucesso!')
      } else {
        // Criar novo usuário e liberar acesso
        const created = await api.insertUsuarioCliente({
          nome: nome.trim() || implantacao.nome_empresa,
          login: login.trim(),
          senha: senha.trim()
        })
        setUsuario(created)
        alert('Acesso liberado com sucesso!')
      }
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar credenciais:', err)
      alert('Erro ao salvar credenciais: ' + (err.message || 'Tente novamente.'))
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = (text: string, type: 'login' | 'senha' | 'message' | 'boasVindas') => {
    navigator.clipboard.writeText(text)
    if (type === 'login') {
      setCopiedLogin(true)
      setTimeout(() => setCopiedLogin(false), 2000)
    } else if (type === 'senha') {
      setCopiedSenha(true)
      setTimeout(() => setCopiedSenha(false), 2000)
    } else if (type === 'message') {
      setCopiedMessage(true)
      setTimeout(() => setCopiedMessage(false), 2500)
    } else if (type === 'boasVindas') {
      setCopiedBoasVindas(true)
      setTimeout(() => setCopiedBoasVindas(false), 2500)
    }
  }

  const getFullMessage = () => {
    const isLocalhost = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    const origin = isLocalhost ? 'https://mantran-clientes-five.vercel.app' : window.location.origin

    return `*Acesso ao Acompanhamento de Implantação - Mantran*\n\n` +
      `Olá! Seguem seus dados de acesso exclusivo para acompanhar o status e as etapas da sua implantação:\n\n` +
      `🏢 *Empresa:* ${implantacao?.nome_empresa}\n` +
      `🌐 *Link de Acesso:* ${origin}\n` +
      `👤 *Usuário:* ${login}\n` +
      `🔑 *Senha:* ${senha}\n\n` +
      `_Acompanhe em tempo real todas as etapas do processo de implantação._`
  }

  const getBoasVindasMessage = () => {
    const isLocalhost = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    const origin = isLocalhost ? 'https://mantran-clientes-five.vercel.app' : window.location.origin
    const nomeEmpresa = implantacao?.nome_empresa || 'Cliente'

    return `Olá! 👋\n` +
      `Criamos este grupo para acompanharmos juntos o progresso da implantação do TMS.\n` +
      `Aqui estarão o cliente (${nomeEmpresa}), o vendedor responsável e o time de implantação, garantindo uma comunicação clara e rápida durante todo o processo.\n\n` +
      `👉 Importante: este grupo tem uso exclusivo para acompanhamento da implantação. Após a conclusão, o suporte e novas demandas deverão seguir pelo fluxo de abertura de tickets.\n\n` +
      `Sejam bem-vindos e vamos juntos para uma implantação de sucesso! 🚀\n\n` +
      `*Acesso ao Acompanhamento de Implantação - Mantran*\n\n` +
      `Olá! Seguem seus dados de acesso exclusivo para acompanhar o status e as etapas da sua implantação:\n\n` +
      `🏢 *Empresa:* ${nomeEmpresa}\n` +
      `🌐 *Link de Acesso:* ${origin}\n` +
      `👤 *Usuário:* ${login}\n` +
      `🔑 *Senha:* ${senha}\n\n` +
      `_Acompanhe em tempo real todas as etapas do processo de implantação._`
  }

  if (!isOpen || !implantacao) return null

  const isNovoAcesso = !usuario

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className={clsx(
              "w-10 h-10 rounded-xl border flex items-center justify-center",
              usuario 
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/15 border-amber-500/30 text-amber-400"
            )}>
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {usuario ? 'Acesso do Cliente' : 'Liberar Acesso do Cliente'}
                {usuario ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Liberado
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Pendente
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-[280px]">
                {implantacao.nome_empresa} • Base {implantacao.bases?.nome_base || 'dbMantran'}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Carregando dados de acesso...
            </div>
          ) : (
            <>
              {/* Status Banner */}
              {isNovoAcesso ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200">
                    <p className="font-bold text-amber-300 mb-0.5">Acesso ainda não liberado para este cliente</p>
                    <p className="opacity-90">
                      O usuário e a senha foram calculados com base no padrão. Você pode ajustar o nome/login se desejar antes de liberar.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
                  <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-200">
                    <p className="font-bold text-emerald-300 mb-0.5">Conta de Cliente Ativa</p>
                    <p className="opacity-90">
                      O cliente pode acessar a plataforma apenas em modo de visualização da sua implantação (sem histórico e sem permissão de edição).
                    </p>
                  </div>
                </div>
              )}

              {/* Form / Visualização */}
              <form onSubmit={handleSalvarOuLiberar} className="space-y-4">
                {/* Nome da Empresa */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    value={nome}
                    disabled={!isNovoAcesso && !isEditing}
                    onChange={e => setNome(e.target.value)}
                    className={clsx(
                      "w-full px-3.5 py-2.5 rounded-xl text-sm border font-medium transition-all",
                      !isNovoAcesso && !isEditing
                        ? "bg-slate-900/40 border-slate-800 text-slate-300 cursor-default"
                        : "bg-slate-900 border-slate-700 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    )}
                    required
                  />
                </div>

                {/* Login */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Usuário (Login)
                    </label>
                    {!isNovoAcesso && !isEditing && (
                      <button
                        type="button"
                        onClick={() => handleCopy(login, 'login')}
                        className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedLogin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLogin ? 'Copiado!' : 'Copiar Usuário'}</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={login}
                      disabled={!isNovoAcesso && !isEditing}
                      onChange={e => setLogin(e.target.value)}
                      placeholder="ex: Entregatex@Mantran"
                      className={clsx(
                        "w-full px-3.5 py-2.5 rounded-xl text-sm border font-semibold transition-all",
                        !isNovoAcesso && !isEditing
                          ? "bg-slate-900/60 border-slate-800 text-white cursor-default"
                          : "bg-slate-900 border-slate-700 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      )}
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Padrão: <span className="font-mono text-slate-400">{implantacao.nome_empresa}@Mantran</span>
                  </p>
                </div>

                {/* Senha */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Senha
                    </label>
                    {!isNovoAcesso && !isEditing && (
                      <button
                        type="button"
                        onClick={() => handleCopy(senha, 'senha')}
                        className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedSenha ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedSenha ? 'Copiado!' : 'Copiar Senha'}</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={senha}
                      disabled={!isNovoAcesso && !isEditing}
                      onChange={e => setSenha(e.target.value)}
                      placeholder="ex: 010@Mantran"
                      className={clsx(
                        "w-full px-3.5 py-2.5 pr-11 rounded-xl text-sm border font-mono font-semibold transition-all",
                        !isNovoAcesso && !isEditing
                          ? "bg-slate-900/60 border-slate-800 text-white cursor-default"
                          : "bg-slate-900 border-slate-700 text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      )}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none p-1"
                      title={showPassword ? "Ocultar Senha" : "Exibir Senha"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Padrão: <span className="font-mono text-slate-400">{getBaseNumero(implantacao.bases?.nome_base)}@Mantran</span>
                  </p>
                </div>

                {/* Botões de Ação */}
                <div className="pt-3 space-y-2.5">
                  {isNovoAcesso ? (
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 font-bold"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{saving ? 'Criando e Liberando...' : 'Criar e Liberar Acesso'}</span>
                    </button>
                  ) : isEditing ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false)
                          carregarUsuario()
                        }}
                        className="btn-secondary flex-1 py-2"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary flex-1 py-2 flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {/* Botão Mensagem Boas-Vindas + Acesso */}
                      <button
                        type="button"
                        onClick={() => handleCopy(getBoasVindasMessage(), 'boasVindas')}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-[0.99]"
                      >
                        {copiedBoasVindas ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Mensagem de Boas-Vindas Copiada!</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Copiar Boas-Vindas + Acesso (WhatsApp)</span>
                          </>
                        )}
                      </button>

                      {/* Botão Apenas Dados de Acesso */}
                      <button
                        type="button"
                        onClick={() => handleCopy(getFullMessage(), 'message')}
                        className="w-full py-2 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        {copiedMessage ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-emerald-400 font-semibold">Dados Copiados!</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Copiar Apenas Dados de Acesso</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-slate-400 hover:text-white py-1 transition-colors text-center underline cursor-pointer"
                      >
                        Alterar Usuário ou Senha
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

