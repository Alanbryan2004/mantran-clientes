import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface UsuariosLeoModalProps {
  isOpen: boolean
  onClose: () => void
  empresaId: string | null
  empresaNome: string
  cdEmpresa?: string
}

export function UsuariosLeoModal({ isOpen, onClose, empresaId, empresaNome, cdEmpresa }: UsuariosLeoModalProps) {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [novoLogin, setNovoLogin] = useState('')
  const [novaSenha, setNovaSenha] = useState('')

  useEffect(() => {
    if (isOpen && empresaId) {
      fetchUsuarios()
      setNovaSenha('012@Mantran')
    } else {
      setUsuarios([])
    }
  }, [isOpen, empresaId, cdEmpresa])

  const fetchUsuarios = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leo_usuarios')
        .select('*')
        .eq('leo_empresa_id', empresaId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setUsuarios(data || [])
    } catch (err) {
      console.error('Erro ao buscar usuários da Léo:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId || !novoLogin || !novaSenha) return

    try {
      const { error } = await supabase.from('leo_usuarios').insert([{
        leo_empresa_id: empresaId,
        login: novoLogin,
        senha: novaSenha
      }])

      if (error) throw error
      
      setNovoLogin('')
      setNovaSenha('012@Mantran')
      await fetchUsuarios()
    } catch (err: any) {
      console.error('Erro ao adicionar usuário na Léo:', err)
      alert('Erro ao adicionar usuário: ' + err.message)
    }
  }

  const handleExcluirUsuario = async (id: string) => {
    if (!confirm('Deseja realmente excluir este usuário?')) return
    try {
      const { error } = await supabase.from('leo_usuarios').delete().eq('id', id)
      if (error) throw error
      await fetchUsuarios()
    } catch (err: any) {
      console.error('Erro ao excluir usuário na Léo:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Usuários (Léo Madeiras)</h2>
            <p className="text-sm text-slate-400">{empresaNome}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <p className="text-slate-400 text-center py-4">Carregando usuários...</p>
          ) : usuarios.length === 0 ? (
            <p className="text-slate-500 text-center py-4 text-sm">Nenhum usuário cadastrado.</p>
          ) : (
            <ul className="space-y-3">
              {usuarios.map(u => (
                <li key={u.id} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Login: <span className="text-white font-bold">{u.login}</span></p>
                    <p className="text-xs text-slate-400 font-mono">Senha: {u.senha}</p>
                  </div>
                  <button 
                    onClick={() => handleExcluirUsuario(u.id)}
                    className="text-slate-500 hover:text-red-500 transition-colors p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-900/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Adicionar Novo Usuário</h3>
          <form onSubmit={handleAddUsuario} className="flex flex-col space-y-3">
            <div className="flex space-x-3">
              <input 
                type="text" 
                placeholder="Login" 
                value={novoLogin}
                onChange={e => setNovoLogin(e.target.value)}
                className="input-field flex-1"
                required
              />
              <input 
                type="text" 
                placeholder="Senha" 
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                className="input-field flex-1"
                required
              />
            </div>
            <button 
              type="submit" 
              className="btn-primary flex items-center justify-center space-x-2 w-full py-2"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Usuário</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
