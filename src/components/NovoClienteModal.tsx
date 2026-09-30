import React, { useState, useEffect, useRef } from 'react'
import type { BaseMantran } from '../data/mockBases'
import { X, FileText, Upload, Trash2, Eye, AlertCircle, FileCheck } from 'lucide-react'

interface NovoClienteModalProps {
  isOpen: boolean
  onClose: () => void
  availableBases: BaseMantran[]
  onSave: (baseId: string, data: Partial<BaseMantran>) => void
}

export function NovoClienteModal({ isOpen, onClose, availableBases, onSave }: NovoClienteModalProps) {
  const [selectedBase, setSelectedBase] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [tipo, setTipo] = useState<'SHOPEE' | 'NORMAL' | 'TESTE' | 'COMMERSYS' | 'LEO' | ''>('NORMAL')
  const [senha, setSenha] = useState('')
  const [possuiAditivo, setPossuiAditivo] = useState(false)
  const [arquivoNome, setArquivoNome] = useState<string | null>(null)
  const [arquivoBase64, setArquivoBase64] = useState<string | null>(null)
  const [arquivoTamanho, setArquivoTamanho] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Reset form when opened
      setSelectedBase(availableBases.length > 0 ? availableBases[0].id : '')
      setEmpresa('')
      setTipo('NORMAL')
      setSenha('')
      setPossuiAditivo(false)
      setArquivoNome(null)
      setArquivoBase64(null)
      setArquivoTamanho(null)
      setUploadError(null)
    }
  }, [isOpen, availableBases])

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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleVisualizarArquivo = () => {
    if (arquivoBase64) {
      const link = document.createElement('a')
      link.href = arquivoBase64
      link.download = arquivoNome || `Aditivo_${empresa || 'Cliente'}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (!isOpen) return null

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBase || !empresa) {
      alert('Por favor, selecione uma base e preencha a empresa.')
      return
    }
    
    onSave(selectedBase, {
      empresa: empresa.toUpperCase(),
      tipo,
      senha,
      possui_aditivo: possuiAditivo,
      arquivo_aditivo_nome: possuiAditivo ? arquivoNome : null,
      arquivo_aditivo_base64: possuiAditivo ? arquivoBase64 : null,
      arquivo_aditivo_tamanho: possuiAditivo ? arquivoTamanho : null
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-dark-card border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/60">
          <h2 className="text-xl font-bold text-white">Novo Cliente</h2>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Base Disponível <span className="text-rose-400">*</span>
              </label>
              <select 
                value={selectedBase} 
                onChange={(e) => setSelectedBase(e.target.value)}
                className="input-field cursor-pointer"
                required
              >
                <option value="" disabled>Selecione uma base...</option>
                {availableBases.map(b => (
                  <option key={b.id} value={b.id}>{b.id}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Nome da Empresa <span className="text-rose-400">*</span>
              </label>
              <input 
                type="text" 
                value={empresa} 
                onChange={(e) => setEmpresa(e.target.value)}
                className="input-field uppercase font-semibold"
                placeholder="Ex: NOVA EMPRESA LTDA"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Tipo
              </label>
              <select 
                value={tipo} 
                onChange={(e) => setTipo(e.target.value as any)} 
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
                onChange={(e) => setSenha(e.target.value)}
                className="input-field font-mono"
                placeholder="Ex: @@senha##"
              />
            </div>

            {/* Seção Aditivo */}
            <div className="col-span-1 md:col-span-2 p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-400" />
                  Possui Aditivo?
                </label>
                <select 
                  value={possuiAditivo ? 'SIM' : 'NAO'} 
                  onChange={(e) => {
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
                          title="Visualizar PDF"
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

          </div>
          
          <div className="mt-8 flex justify-end space-x-4 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer font-bold text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary cursor-pointer font-bold text-sm"
            >
              Salvar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
