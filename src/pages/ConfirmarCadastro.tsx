import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2, MailCheck } from 'lucide-react'
import { api } from '../lib/api'

// Página aberta pelo link do e-mail de confirmação do "Cadastre-se".
// A ativação só acontece ao CLICAR no botão (um POST), para que verificadores automáticos
// de links de e-mail não confirmem o cadastro sozinhos.
export function ConfirmarCadastro() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('t') || ''

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [login, setLogin] = useState('')

  const confirmar = async () => {
    setErro('')
    setEnviando(true)
    try {
      const r = await api.confirmarCadastroCliente(token)
      if (!r.ok) {
        setErro(r.erro || 'Não foi possível confirmar o cadastro.')
        return
      }
      setLogin(String(r.login || ''))
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
            <h2 className="text-base font-bold text-gray-800 mb-2">Cadastro confirmado!</h2>
            <p className="text-sm text-gray-600">Seu login é o seu e-mail:</p>
            <p className="my-2 inline-block px-4 py-2 rounded bg-slate-100 text-sm font-bold text-slate-900 break-all">{login}</p>
            <p className="text-xs text-gray-500">Entre com a senha que você criou no cadastro.</p>
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
            <p className="text-sm text-gray-600">Link de confirmação inválido. Abra o link direto do e-mail que enviamos.</p>
          </div>
        ) : (
          <div>
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#8b0000]">
              <MailCheck className="w-7 h-7" aria-hidden="true" />
            </div>
            <p className="text-sm text-gray-600 mb-4">Clique no botão abaixo para ativar o seu acesso.</p>
            {erro && (
              <div role="alert" className="text-red-600 text-xs font-medium bg-red-50 p-2 rounded mb-3">{erro}</div>
            )}
            <button
              type="button"
              onClick={confirmar}
              disabled={enviando}
              className="w-full bg-[#8b0000] hover:bg-[#6b0000] text-white font-bold py-2.5 rounded transition-colors text-sm shadow-md disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {enviando ? 'Confirmando...' : 'Confirmar meu cadastro'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
