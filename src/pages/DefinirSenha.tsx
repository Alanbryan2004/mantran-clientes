import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2, KeyRound, Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api'

const inputCls = 'w-full px-3 py-2 bg-white border border-gray-200 rounded focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors text-sm text-gray-800'

// Página aberta pelo link do e-mail "Liberar Acesso": a pessoa cria a própria senha.
// O login é o e-mail do contato.
export function DefinirSenha() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('t') || ''

  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [login, setLogin] = useState('')
  const [redefinicao, setRedefinicao] = useState(false)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (senha.length < 8) { setErro('A senha deve ter pelo menos 8 caracteres.'); return }
    if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) { setErro('A senha deve ter letras e números.'); return }
    if (senha !== senha2) { setErro('As senhas não conferem.'); return }

    setEnviando(true)
    try {
      const r = await api.definirSenhaAcesso(token, senha, senha2)
      if (!r.ok) {
        setErro(r.erro || 'Não foi possível criar a senha.')
        return
      }
      setLogin(String(r.login || ''))
      setRedefinicao(r.redefinicao === true)
      setSenha('')
      setSenha2('')
    } finally {
      setEnviando(false)
    }
  }

  const irParaLogin = () => {
    navigate('/faq')
    // O modal de login fica no layout; abre assim que a página carregar.
    setTimeout(() => window.dispatchEvent(new Event('mantran:open-login')), 400)
  }

  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-[420px] text-center border border-slate-200">
        <div className="mb-4 flex justify-center select-none">
          <img src="/Logo_Mantran.png" alt="Mantran Tecnologias" className="h-14 w-auto object-contain" />
        </div>
        <h1 className="text-xl font-serif font-bold text-red-800 mb-4">Mantran Clientes</h1>

        {login ? (
          <div role="status">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-7 h-7" aria-hidden="true" />
            </div>
            <h2 className="text-base font-bold text-gray-800 mb-2">{redefinicao ? 'Senha atualizada!' : 'Senha criada!'}</h2>
            <p className="text-sm text-gray-600">Seu login é o seu e-mail:</p>
            <p className="my-2 inline-block px-4 py-2 rounded bg-slate-100 text-sm font-bold text-slate-900 break-all">{login}</p>
            <p className="text-xs text-gray-500">Entre com a {redefinicao ? 'nova senha' : 'senha que você acabou de criar'}.</p>
            <button
              type="button"
              onClick={irParaLogin}
              className="mt-5 w-full bg-[#8b0000] hover:bg-[#6b0000] text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md cursor-pointer"
            >
              Ir para o login
            </button>
          </div>
        ) : !token ? (
          <div role="alert">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-gray-600">Link inválido. Abra o link direto do e-mail que enviamos.</p>
          </div>
        ) : (
          <form onSubmit={salvar} className="text-left space-y-3.5" noValidate>
            <div className="text-center mb-1">
              <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#8b0000]">
                <KeyRound className="w-6 h-6" aria-hidden="true" />
              </div>
              <p className="text-sm text-gray-600">Crie a sua senha de acesso.</p>
            </div>

            <div>
              <label htmlFor="ds-senha" className="block text-xs text-gray-500 mb-1 ml-1">Nova senha</label>
              <div className="relative">
                <input
                  id="ds-senha"
                  type={mostrar ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  maxLength={72}
                  className={inputCls + ' pr-10'}
                  placeholder="Mínimo 8 caracteres, com letras e números"
                />
                <button
                  type="button"
                  onClick={() => setMostrar(v => !v)}
                  aria-label={mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="ds-senha2" className="block text-xs text-gray-500 mb-1 ml-1">Repita a senha</label>
              <input
                id="ds-senha2"
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                value={senha2}
                onChange={e => setSenha2(e.target.value)}
                maxLength={72}
                className={inputCls}
                placeholder="Digite a mesma senha"
              />
            </div>

            {erro && (
              <div role="alert" className="text-red-600 text-xs text-center font-medium bg-red-50 p-2 rounded">{erro}</div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-[#8b0000] hover:bg-[#6b0000] text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {enviando ? 'Salvando...' : 'Criar senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
