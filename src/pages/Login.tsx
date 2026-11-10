import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, X, ArrowLeft, MailCheck } from 'lucide-react'
import { api } from '../lib/api'
import { permissionsApi } from '../lib/permissions'
import { formatarCnpj, cnpjValido } from '../lib/cnpj'

export interface LoginProps {
  isModal?: boolean
  isOpen?: boolean
  onClose?: () => void
  onSuccess?: () => void
}

const inputCls = 'w-full px-3 py-2 bg-white border border-gray-200 rounded focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors text-sm text-gray-800'

export function Login({ isModal = false, isOpen = true, onClose, onSuccess }: LoginProps = {}) {
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Cadastre-se (cliente novo)
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')
  const [cadEtapa, setCadEtapa] = useState<'cnpj' | 'dados'>('cnpj') // 1) CNPJ da empresa  2) seus dados
  const [cadEmpresa, setCadEmpresa] = useState('') // empresa localizada pelo CNPJ
  const [cadValidando, setCadValidando] = useState(false)
  const [cadCnpj, setCadCnpj] = useState('')
  const [cadNome, setCadNome] = useState('')
  const [cadEmail, setCadEmail] = useState('')
  const [cadSenha, setCadSenha] = useState('')
  const [cadSenha2, setCadSenha2] = useState('')
  const [cadMostrarSenha, setCadMostrarSenha] = useState(false)
  const [cadIsca, setCadIsca] = useState('') // campo-isca invisível (anti-robô)
  const [cadErro, setCadErro] = useState('')
  const [cadEnviando, setCadEnviando] = useState(false)
  const [cadEnviadoPara, setCadEnviadoPara] = useState('')

  // Fecha modal ao pressionar ESC
  useEffect(() => {
    if (!isModal || !isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModal, isOpen, onClose])

  if (isModal && !isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await api.authenticateUser(login, senha)

      if (!data) {
        throw new Error('Login ou senha incorretos.')
      }

      // Login bem-sucedido
      localStorage.setItem('@Mantran:user', JSON.stringify(data))
      try {
        await permissionsApi.getPermissions()
      } catch (_) {}

      if (onSuccess) {
        onSuccess()
      } else {
        // Redirecionamento direto para evitar telas piscando
        if (data.perfil === 'Cliente') {
          // Cliente que logou com o próprio e-mail vai para o portal de tickets;
          // cliente legado (por implantação) vai para a implantação dele.
          const dest = (data as any).cliente_email
            ? permissionsApi.getFirstAllowedRouteForUser() // "Meus Chamados" só se estiver habilitado para o Cliente
            : data.implantacao_id ? `/implantacoes/${data.implantacao_id}` : '/implantacoes'
          window.location.href = dest
        } else {
          window.location.href = '/'
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.')
    } finally {
      setLoading(false)
    }
  }

  const abrirCadastro = () => {
    setError('')
    setCadErro('')
    setCadEnviadoPara('')
    setCadEtapa('cnpj')
    setCadEmpresa('')
    setModo('cadastro')
  }

  const voltarAoLogin = () => {
    setCadErro('')
    setCadEnviadoPara('')
    setCadSenha('')
    setCadSenha2('')
    setCadEtapa('cnpj')
    setCadEmpresa('')
    setModo('login')
  }

  // Etapa 1: o CNPJ precisa ser de uma empresa cadastrada na Mantran para seguir
  const handleValidarCnpj = async (e: React.FormEvent) => {
    e.preventDefault()
    setCadErro('')
    if (!cnpjValido(cadCnpj)) { setCadErro('CNPJ inválido. Confira os 14 números.'); return }

    setCadValidando(true)
    try {
      const r = await api.validarCnpjCliente(cadCnpj)
      if (!r.ok) {
        setCadEmpresa('')
        setCadErro(r.erro || 'CNPJ não localizado.')
        return
      }
      setCadEmpresa(String(r.empresa || ''))
      setCadEtapa('dados')
    } finally {
      setCadValidando(false)
    }
  }

  const trocarCnpj = () => {
    setCadErro('')
    setCadEmpresa('')
    setCadEtapa('cnpj')
  }

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setCadErro('')

    // Validações rápidas no navegador (o servidor valida tudo de novo)
    if (!cnpjValido(cadCnpj)) { setCadErro('CNPJ inválido. Confira os 14 números.'); return }
    if (cadNome.trim().length < 2) { setCadErro('Informe seu nome.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cadEmail.trim())) { setCadErro('Informe um e-mail válido.'); return }
    if (cadSenha.length < 8) { setCadErro('A senha deve ter pelo menos 8 caracteres.'); return }
    if (!/[A-Za-z]/.test(cadSenha) || !/\d/.test(cadSenha)) { setCadErro('A senha deve ter letras e números.'); return }
    if (cadSenha !== cadSenha2) { setCadErro('As senhas não conferem.'); return }

    setCadEnviando(true)
    try {
      const r = await api.cadastrarCliente({
        cnpj: cadCnpj,
        nome: cadNome.trim(),
        email: cadEmail.trim(),
        senha: cadSenha,
        confirmarSenha: cadSenha2,
        website: cadIsca
      })
      if (!r.ok) {
        setCadErro(r.erro || 'Não foi possível concluir o cadastro.')
        // CNPJ deixou de ser válido/localizado (ex.: empresa desativada): volta para a etapa 1
        if (/CNPJ/i.test(r.erro || '')) { setCadEtapa('cnpj'); setCadEmpresa('') }
        return
      }
      setCadEnviadoPara(cadEmail.trim())
      setCadSenha('')
      setCadSenha2('')
    } finally {
      setCadEnviando(false)
    }
  }

  const cardContent = (
    <div 
      className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-[420px] max-h-[94vh] overflow-y-auto text-center relative border border-slate-200 animate-in zoom-in-95 duration-150"
      onClick={e => e.stopPropagation()}
    >
      {/* Botão de Fechar no Modal */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Logo Mantran */}
      <div className="mb-4 flex justify-center select-none">
        <img 
          src="/Logo_Mantran.png" 
          alt="Mantran Tecnologias" 
          className="h-16 w-auto object-contain"
        />
      </div>

      <h1 className="text-xl font-serif font-bold text-red-800 mt-4 mb-1">Mantran Clientes</h1>

      {modo === 'login' ? (
        <>
          <p className="text-[11px] text-gray-500 mb-6">Controle de desenvolvimento (API, Testes, Documentação)</p>

          <form onSubmit={handleSubmit} className="text-left space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 ml-1">Login</label>
              <input
                type="text"
                required
                autoFocus
                value={login}
                onChange={e => setLogin(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/50 border border-blue-100 rounded focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors text-sm text-gray-800"
                placeholder="alan"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 ml-1">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors text-sm text-gray-800"
                  placeholder="........"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="text-red-500 text-xs text-center font-medium bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#8b0000] hover:bg-[#6b0000] text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md disabled:opacity-70 cursor-pointer"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-600">
            Cliente e ainda não tem acesso?{' '}
            <button type="button" onClick={abrirCadastro} className="font-bold text-[#8b0000] hover:underline cursor-pointer">
              Cadastre-se aqui
            </button>
          </div>

          <div className="mt-4 text-[10px] text-gray-500 space-y-1">
            <p>Dica: o login foi gerado como o nome em minúsculo sem espaços (ex: alan).</p>
            <p>Clientes: o login é o seu e-mail.</p>
          </div>
        </>
      ) : cadEnviadoPara ? (
        <div className="text-center" role="status">
          <div className="mx-auto mt-4 mb-3 w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <MailCheck className="w-7 h-7" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-gray-800 mb-2">Confirme seu e-mail</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Enviamos uma mensagem para <strong className="break-all">{cadEnviadoPara}</strong>.
            Abra o e-mail e clique em <strong>Confirmar meu cadastro</strong> para ativar seu acesso.
          </p>
          <p className="text-xs text-gray-500 mt-3">
            Seu login será o seu e-mail e a senha é a que você acabou de criar. Não achou o e-mail? Olhe a caixa de spam.
          </p>
          <button
            type="button"
            onClick={voltarAoLogin}
            className="mt-5 w-full bg-[#8b0000] hover:bg-[#6b0000] text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md cursor-pointer"
          >
            Voltar ao login
          </button>
        </div>
      ) : (
        <>
          {cadEtapa === 'cnpj' ? (
            <>
              <p className="text-[11px] text-gray-500 mb-5">Primeiro, informe o CNPJ da empresa onde você trabalha. Vamos conferir se ela é cliente da Mantran.</p>

              <form onSubmit={handleValidarCnpj} className="text-left space-y-3.5" noValidate>
                <div>
                  <label htmlFor="cad-cnpj" className="block text-xs text-gray-500 mb-1 ml-1">CNPJ da empresa onde você trabalha</label>
                  <input
                    id="cad-cnpj"
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={cadCnpj}
                    onChange={e => { setCadCnpj(formatarCnpj(e.target.value)); if (cadErro) setCadErro('') }}
                    maxLength={18}
                    className={inputCls}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                {cadErro && (
                  <div role="alert" className="text-red-600 text-xs text-center font-medium bg-red-50 p-2 rounded">
                    {cadErro}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={cadValidando}
                  className="w-full bg-[#8b0000] hover:bg-[#6b0000] text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md disabled:opacity-70 cursor-pointer"
                >
                  {cadValidando ? 'Conferindo...' : 'Continuar'}
                </button>
              </form>
            </>
          ) : (
          <>
          <form onSubmit={handleCadastro} className="text-left space-y-3.5" noValidate>
            {/* Campo-isca: invisível para pessoas */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
              <label>Não preencha este campo
                <input type="text" tabIndex={-1} autoComplete="off" value={cadIsca} onChange={e => setCadIsca(e.target.value)} />
              </label>
            </div>

            {/* Empresa localizada pelo CNPJ */}
            <div role="status" className="flex items-start justify-between gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-left">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Empresa localizada</p>
                <p className="text-sm font-bold text-emerald-900 break-words">{cadEmpresa || 'Empresa Mantran'}</p>
                <p className="text-[11px] text-emerald-800/80">{cadCnpj}</p>
              </div>
              <button type="button" onClick={trocarCnpj} className="shrink-0 text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer">
                Trocar
              </button>
            </div>

            <div>
              <label htmlFor="cad-nome" className="block text-xs text-gray-500 mb-1 ml-1">Seu nome</label>
              <input
                id="cad-nome"
                type="text"
                autoComplete="name"
                value={cadNome}
                onChange={e => setCadNome(e.target.value)}
                maxLength={100}
                className={inputCls}
                placeholder="Nome e sobrenome"
              />
            </div>

            <div>
              <label htmlFor="cad-email" className="block text-xs text-gray-500 mb-1 ml-1">Seu e-mail (será o seu login)</label>
              <input
                id="cad-email"
                type="email"
                autoComplete="email"
                value={cadEmail}
                onChange={e => setCadEmail(e.target.value)}
                maxLength={254}
                className={inputCls}
                placeholder="voce@empresa.com.br"
              />
            </div>

            <div>
              <label htmlFor="cad-senha" className="block text-xs text-gray-500 mb-1 ml-1">Crie uma senha</label>
              <div className="relative">
                <input
                  id="cad-senha"
                  type={cadMostrarSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={cadSenha}
                  onChange={e => setCadSenha(e.target.value)}
                  maxLength={72}
                  className={inputCls + ' pr-10'}
                  placeholder="Mínimo 8 caracteres, com letras e números"
                />
                <button
                  type="button"
                  onClick={() => setCadMostrarSenha(v => !v)}
                  aria-label={cadMostrarSenha ? 'Ocultar senhas' : 'Mostrar senhas'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {cadMostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="cad-senha2" className="block text-xs text-gray-500 mb-1 ml-1">Repita a senha</label>
              <input
                id="cad-senha2"
                type={cadMostrarSenha ? 'text' : 'password'}
                autoComplete="new-password"
                value={cadSenha2}
                onChange={e => setCadSenha2(e.target.value)}
                maxLength={72}
                className={inputCls}
                placeholder="Digite a mesma senha"
              />
            </div>

            {cadErro && (
              <div role="alert" className="text-red-600 text-xs text-center font-medium bg-red-50 p-2 rounded">
                {cadErro}
              </div>
            )}

            <button
              type="submit"
              disabled={cadEnviando}
              className="w-full bg-[#8b0000] hover:bg-[#6b0000] text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md disabled:opacity-70 cursor-pointer"
            >
              {cadEnviando ? 'Enviando...' : 'Cadastrar'}
            </button>
          </form>
          </>
          )}

          <button
            type="button"
            onClick={voltarAoLogin}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Já tenho cadastro
          </button>
        </>
      )}
    </div>
  )

  if (isModal) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        {cardContent}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4 font-sans">
      {cardContent}
    </div>
  )
}
