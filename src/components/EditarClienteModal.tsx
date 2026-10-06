import React, { useState, useEffect, useRef } from 'react'
import type { BaseMantran } from '../data/mockBases'
import { api } from '../lib/api'
import { X, Save, FileText, Upload, Trash2, Eye, AlertCircle, FileCheck } from 'lucide-react'

interface EditarClienteModalProps {
  isOpen: boolean
  onClose: () => void
  cliente: BaseMantran | null
  onSave: (clienteDbId: string, data: { 
    empresa: string
    tipo: string
    senha: string
    possui_aditivo?: boolean
    arquivo_aditivo_nome?: string | null
    arquivo_aditivo_base64?: string | null
    arquivo_aditivo_tamanho?: number | null
  }) => void
}

export function EditarClienteModal({ isOpen, onClose, cliente, onSave }: EditarClienteModalProps) {
  const [empresa, setEmpresa] = useState('')
  const [tipo, setTipo] = useState<'SHOPEE' | 'NORMAL' | 'TESTE' | 'COMMERSYS' | 'LEO' | ''>('NORMAL')
  const [senha, setSenha] = useState('')
  const [possuiAditivo, setPossuiAditivo] = useState(false)
  const [arquivoNome, setArquivoNome] = useState<string | null>(null)
  const [arquivoBase64, setArquivoBase64] = useState<string | null>(null)
  const [arquivoTamanho, setArquivoTamanho] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Indica se o usuário trocou/removeu o anexo nesta edição. Se não mexeu, não reenviamos
  // o base64 (ele não vem na listagem) para não apagar o anexo existente no banco.
  const [arquivoAlterado, setArquivoAlterado] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && cliente) {
      setEmpresa(cliente.empresa)
      setTipo((cliente.tipo as any) || 'NORMAL')
      setSenha(cliente.senha || '')
      setPossuiAditivo(cliente.possui_aditivo || false)
      setArquivoNome(cliente.arquivo_aditivo_nome || null)
      setArquivoBase64(cliente.arquivo_aditivo_base64 || null)
      setArquivoTamanho(cliente.arquivo_aditivo_tamanho || null)
      setArquivoAlterado(false)
      setUploadError(null)
    }
  }, [isOpen, cliente])

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Por favor, selecione apenas arquivos em formato PDF.')
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('O arquivo de aditivo é muito grande. O limite máximo é de 15MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setArquivoNome(file.name)
      setArquivoBase64(base64)
      setArquivoTamanho(file.size)
      setPossuiAditivo(true)
      setArquivoAlterado(true)
    }
    reader.onerror = () => {
      setUploadError('Erro ao ler o arquivo PDF.')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setArquivoNome(null)
    setArquivoBase64(null)
    setArquivoTamanho(null)
    setArquivoAlterado(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleVisualizarArquivo = async () => {
    // Se o base64 já está em memória (anexo recém-selecionado), usa direto
    let base64 = arquivoBase64
    // Senão, busca sob demanda (o conteúdo não vem na listagem)
    if (!base64 && cliente?.clienteDbId && arquivoNome) {
      try {
        const aditivo = await api.getAditivoByClienteId(cliente.clienteDbId)
        base64 = aditivo?.base64 || null
      } catch { /* cai no fallback abaixo */ }
    }
    if (base64) {
      const link = document.createElement('a')
      link.href = base64
      link.download = arquivoNome || `Aditivo_${empresa || 'Cliente'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      window.open('/AditivoMantran.pdf', '_blank')
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente || !cliente.clienteDbId || !empresa) return

    const payload: {
      empresa: string; tipo: string; senha: string; possui_aditivo?: boolean
      arquivo_aditivo_nome?: string | null; arquivo_aditivo_base64?: string | null; arquivo_aditivo_tamanho?: number | null
    } = {
      empresa: empresa.toUpperCase(),
      tipo,
      senha,
      possui_aditivo: possuiAditivo
    }

    // Só envia os campos do anexo se o usuário trocou/removeu o arquivo nesta edição,
    // ou se desmarcou "possui aditivo". Caso contrário, preserva o anexo já salvo
    // (o base64 não vem na listagem, então não podemos reenviá-lo aqui).
    if (!possuiAditivo) {
      payload.arquivo_aditivo_nome = null
      payload.arquivo_aditivo_base64 = null
      payload.arquivo_aditivo_tamanho = null
    } else if (arquivoAlterado) {
      payload.arquivo_aditivo_nome = arquivoNome
      payload.arquivo_aditivo_base64 = arquivoBase64
      payload.arquivo_aditivo_tamanho = arquivoTamanho
    }
    // (se possui aditivo e não alterou: não envia esses campos -> update os preserva)

    onSave(cliente.clienteDbId, payload)
  }

  if (!isOpen || !cliente) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Editar Cliente
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Base <span className="font-mono text-brand-400 font-semibold">{cliente.id}</span></p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nome da Empresa <span className="text-rose-400">*</span>
            </label>
            <input 
              type="text" 
              value={empresa}
              onChange={e => setEmpresa(e.target.value)}
              className="input-field uppercase font-semibold"
              placeholder="Ex: GRAN MILAN"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tipo
              </label>
              <select 
                value={tipo} 
                onChange={e => setTipo(e.target.value as any)}
                className="input-field cursor-pointer"
              >
                <option value="NORMAL">NORMAL</option>
                <option value="COMMERSYS">COMMERSYS</option>
                <option value="SHOPEE">SHOPEE</option>
                <option value="LEO">LEO</option>
                <option value="TESTE">TESTE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Senha (GPO Padrão)
              </label>
              <input 
                type="text" 
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="input-field font-mono"
                placeholder="Ex: @@mtr002##"
              />
            </div>
          </div>

          {/* Seção Aditivo */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-400" />
                Possui Aditivo?
              </label>
              <select 
                value={possuiAditivo ? 'SIM' : 'NAO'} 
                onChange={e => {
                  const sim = e.target.value === 'SIM'
                  setPossuiAditivo(sim)
                  if (!sim) {
                    handleRemoveFile()
                  }
                }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="NAO">NÃO</option>
                <option value="SIM">SIM</option>
              </select>
            </div>

            {/* Quando Possui Aditivo é SIM: Área de upload e gerenciamento do PDF */}
            {possuiAditivo && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload} 
                  accept="application/pdf,.pdf" 
                  className="hidden" 
                />

                {uploadError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {arquivoNome || arquivoBase64 ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate" title={arquivoNome || 'Aditivo.pdf'}>
                          {arquivoNome || 'Aditivo Anexado'}
                        </p>
                        <p className="text-[10px] text-emerald-400/80 font-mono">
                          {formatFileSize(arquivoTamanho) || 'PDF Pronto'} · Anexo Válido
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleVisualizarArquivo}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                        title="Visualizar / Baixar PDF"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                        title="Substituir arquivo PDF"
                      >
                        <Upload className="w-3.5 h-3.5 text-brand-400" />
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer border border-rose-500/30"
                        title="Remover anexo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-xl border-2 border-dashed border-slate-700 hover:border-brand-500/60 bg-slate-950/40 hover:bg-slate-900/60 text-center cursor-pointer transition-all group"
                  >
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-brand-400 mx-auto mb-1.5 transition-colors" />
                    <p className="text-xs font-bold text-slate-200 group-hover:text-brand-300 transition-colors">
                      Clique para importar o PDF do Aditivo
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Arquivos .PDF até 15MB
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 flex space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="btn-secondary flex-1 cursor-pointer font-bold"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary flex-1 flex items-center justify-center space-x-2 cursor-pointer font-bold"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
