import { useState, useEffect, useMemo, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, CheckCircle2, Settings2, Settings, FileSpreadsheet, 
  FileText, Plus, Minus, Search, Filter, X, 
  Trash2, Layers, AlertCircle
} from 'lucide-react'
import { api } from '../lib/api'
import { isReadOnlyUser } from '../lib/auth'
import { GerenciarBasesModal } from '../components/GerenciarBasesModal'
import { EditarProjetoModal } from '../components/EditarProjetoModal'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const getProgressColor = (progress: number) => {
  if (progress <= 33) return 'bg-red-500'
  if (progress <= 66) return 'bg-amber-400'
  return 'bg-green-500'
}

const getProgressTextColor = (progress: number) => {
  if (progress <= 33) return 'text-red-400'
  if (progress <= 66) return 'text-amber-400'
  return 'text-green-400'
}

// Classe de cor da célula de status conforme o valor (serve para STATUS e STATUS_SN)
const statusCellClass = (valor: string): string => {
  if (valor === 'OK' || valor === 'SIM') return 'bg-green-500/10 text-green-400 border-green-500/30'
  if (valor === 'PENDENTE' || valor === 'NÃO') return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  if (valor === 'ERRO') return 'bg-red-500/10 text-red-400 border-red-500/30'
  return 'bg-slate-800/80 text-slate-400'
}

// Extrai o JSON "de dados" quando o conteúdo vem precedido por lixo/cabeçalho.
// Ex. (estilo JWT): {"alg":"HS256","typ":"JWT"}.{"data":{...}}  -> retorna o {"data":{...}}
// Estratégia: quebra em segmentos nos limites "}.{", testa cada segmento como JSON
// e devolve o maior objeto válido (o payload de dados costuma ser o maior).
const extrairJsonValido = (texto: string): any | undefined => {
  const t = (texto || '').trim()
  if (!t) return undefined
  // 1) Tenta direto
  try { return JSON.parse(t) } catch { /* segue */ }

  // 2) Quebra em segmentos candidatos: separados por "}." / ".{"
  const segmentos = t
    .replace(/\}\s*\.\s*\{/g, '}\u0000{') // marca os limites entre objetos
    .split('\u0000')

  let melhor: any
  let melhorTam = -1
  for (const seg of segmentos) {
    const s = seg.trim()
    if (!s) continue
    try {
      const obj = JSON.parse(s)
      // Prefere o maior (payload de dados) sobre o cabeçalho pequeno
      const tam = s.length
      if (tam > melhorTam) { melhor = obj; melhorTam = tam }
    } catch { /* ignora segmento inválido */ }
  }
  if (melhor !== undefined) return melhor

  // 3) Fallback: pega do primeiro "{" ao último "}" e tenta
  const ini = t.indexOf('{')
  const fim = t.lastIndexOf('}')
  if (ini >= 0 && fim > ini) {
    try { return JSON.parse(t.slice(ini, fim + 1)) } catch { /* nada */ }
  }
  return undefined
}

// Tenta formatar (indentar) um JSON, removendo cabeçalho/lixo do início se houver.
// Retorna o texto formatado ou null se não houver JSON válido.
const formatarJson = (texto: string): string | null => {
  const t = (texto || '').trim()
  if (!t) return ''
  const obj = extrairJsonValido(t)
  if (obj === undefined) return null
  return JSON.stringify(obj, null, 2)
}

// Escapa HTML e aplica cores (syntax highlight) a um JSON já indentado.
const escaparHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const jsonParaHtmlColorido = (jsonIndentado: string): string => {
  const esc = escaparHtml(jsonIndentado)
  // Regex clássico para destacar tokens JSON (chaves, strings, números, bool/null)
  return esc.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cor = '#e2e8f0' // número (slate claro)
      if (/^"/.test(match)) {
        cor = /:$/.test(match) ? '#7dd3fc' : '#86efac' // chave = azul claro; string = verde
      } else if (/true|false/.test(match)) {
        cor = '#fca5a5' // booleano = vermelho claro
      } else if (/null/.test(match)) {
        cor = '#cbd5e1'
      } else if (/^-?\d/.test(match)) {
        cor = '#fcd34d' // número = âmbar
      }
      return `<span style="color:${cor}">${match}</span>`
    }
  )
}

// Célula de edição de JSON: formata ao colar e ao sair do campo (blur); marca em vermelho se inválido.
// Clicar no ícone de lupa abre um modal com o JSON expandido e colorido.
function JsonCell({ valor, readOnly, onChange }: {
  valor: string
  readOnly: boolean
  onChange: (v: string) => void
}) {
  const [erro, setErro] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)

  // JSON indentado para visualização (reaproveita o formatador; se inválido, usa o texto cru)
  const jsonFormatado = formatarJson(valor) ?? valor

  const aplicarFormatacao = (texto: string) => {
    const formatado = formatarJson(texto)
    if (formatado === null) {
      setErro(texto.trim() !== '')
      onChange(texto) // mantém o que o usuário colou/digitou, mesmo inválido
    } else {
      setErro(false)
      onChange(formatado)
    }
  }

  return (
    <div className="relative min-w-[220px]">
      <textarea
        value={valor}
        disabled={readOnly}
        spellCheck={false}
        rows={2}
        onChange={(e) => { onChange(e.target.value); if (erro) setErro(false) }}
        onBlur={(e) => aplicarFormatacao(e.target.value)}
        onPaste={(e) => {
          const texto = e.clipboardData.getData('text')
          const formatado = formatarJson(texto)
          if (formatado !== null) {
            e.preventDefault()
            setErro(false)
            onChange(formatado)
          }
        }}
        placeholder={readOnly ? '' : 'Cole o JSON aqui...'}
        className={`input-field py-1.5 pl-3 pr-8 text-[11px] font-mono w-full max-h-[56px] rounded-lg resize-none overflow-auto whitespace-pre ${
          erro
            ? 'bg-red-500/10 text-red-300 border-red-500/40'
            : 'bg-slate-800/40 text-slate-200 border-slate-700/60 focus:bg-slate-800 focus:border-brand-500'
        } ${readOnly ? 'cursor-default opacity-80' : ''} transition-colors`}
      />

      {/* Botão para abrir a visualização expandida e colorida */}
      {valor.trim() && (
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          title="Visualizar JSON expandido"
          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-brand-400 hover:border-brand-500 transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Modal: visualização expandida com cores */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-700 shrink-0">
              <FileText className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-slate-200">Visualização do JSON</h3>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(jsonFormatado).catch(() => {}) }}
                title="Copiar JSON"
                className="ml-auto text-xs font-semibold text-slate-400 hover:text-brand-400 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Copiar
              </button>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre
              className="flex-1 min-h-0 overflow-auto p-5 text-xs font-mono leading-relaxed text-slate-200 whitespace-pre"
              dangerouslySetInnerHTML={{ __html: jsonParaHtmlColorido(jsonFormatado) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Helpers para valores múltiplos por pipe '|'
const parsePipeValues = (val: string | undefined | null, targetLength: number = 1, isStatus: boolean = false): string[] => {
  if (!val) {
    return Array.from({ length: Math.max(1, targetLength) }, () => '')
  }
  const parts = val.split('|').map(s => s.trim())

  // Se for uma coluna de status e havia apenas 1 valor definido (ex: 'OK' ou 'PENDENTE') e a base tem múltiplas agências,
  // repete o mesmo status para as demais agências!
  if (isStatus && parts.length === 1 && targetLength > 1 && parts[0] !== '') {
    return Array.from({ length: targetLength }, () => parts[0])
  }

  while (parts.length < targetLength) {
    // Se for status e temos o primeiro valor não vazio, replica
    if (isStatus && parts[0] !== '') {
      parts.push(parts[0])
    } else {
      parts.push('')
    }
  }
  return parts.length > 0 ? parts : ['']
}

export function ProjetoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [projeto, setProjeto] = useState<any>(null)
  const [colunas, setColunas] = useState<any[]>([])
  const [bases, setBases] = useState<any[]>([])
  const [dados, setDados] = useState<Record<string, string>>({}) // key: baseId_colunaId
  const [loading, setLoading] = useState(true)
  const [isGerenciarBasesOpen, setIsGerenciarBasesOpen] = useState(false)
  const [isEditarProjetoOpen, setIsEditarProjetoOpen] = useState(false)

  // Estado de linhas expandidas por Base
  const [expandedBases, setExpandedBases] = useState<Record<string, boolean>>({})

  // Estados dos Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [filtroColunaId, setFiltroColunaId] = useState<string>('TODAS')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')

  useEffect(() => {
    if (id) fetchProjetoCompleto()
  }, [id])

  const fetchProjetoCompleto = async () => {
    setLoading(true)
    try {
      // 1. Fetch projeto
      const projData = await api.getProjetoById(id!)
      setProjeto(projData)

      // 2. Fetch colunas
      const colData = await api.getProjetoColunasById(id!)
      setColunas(colData)

      // 3. Fetch bases
      const basesData = await api.getProjetoBasesWithDetails(id!)
      
      const formattedBases = basesData.map((b: any) => ({
        id: b.base_id,
        nome_base: b.bases.nome_base,
        empresa: b.bases.clientes?.nome_empresa
      }))
      setBases(formattedBases.sort((a: any, b: any) => a.nome_base.localeCompare(b.nome_base)))

      // 4. Fetch dados
      const dadosData = await api.getProjetoDadosByProjeto(id!)

      const dadosMap: Record<string, string> = {}
      dadosData.forEach((d: any) => {
        dadosMap[`${d.base_id}_${d.coluna_id}`] = d.valor
      })
      setDados(dadosMap)

    } catch (err) {
      console.error(err)
      alert('Erro ao carregar o projeto')
      navigate('/bases')
    } finally {
      setLoading(false)
    }
  }

  // Identifica a quantidade de itens / agências que uma base possui
  const getBaseItemCount = (baseId: string): number => {
    let max = 1
    colunas.forEach(col => {
      // JSON é valor único por base (pode conter '|' no conteúdo) — não conta como agências
      if (col.tipo?.toUpperCase() === 'JSON') return
      const val = dados[`${baseId}_${col.id}`]
      if (val && val.includes('|')) {
        const count = val.split('|').map(s => s.trim()).filter(Boolean).length
        if (count > max) max = count
      }
    })
    return max
  }

  // Obtém o valor de uma sub-linha específica
  const getSubValor = (baseId: string, colunaId: string, subIndex: number): string => {
    const raw = dados[`${baseId}_${colunaId}`] || ''
    const col = colunas.find(c => c.id === colunaId)
    const tipoUp = col?.tipo?.toUpperCase()
    // JSON é único por base: o valor inteiro vai no índice 0 (não divide por '|')
    if (tipoUp === 'JSON') return subIndex === 0 ? raw : ''
    const totalItems = getBaseItemCount(baseId)
    const isStatus = tipoUp === 'STATUS' || tipoUp === 'STATUS_SN'
    const arr = parsePipeValues(raw, totalItems, isStatus)
    return arr[subIndex] || ''
  }

  // Atualiza o valor de uma sub-linha específica
  const handleUpdateSubDado = async (baseId: string, colunaId: string, subIndex: number, novoValor: string) => {
    if (isReadOnlyUser()) return
    const key = `${baseId}_${colunaId}`
    const raw = dados[key] || ''
    const col = colunas.find(c => c.id === colunaId)
    const tipoUp = col?.tipo?.toUpperCase()

    // JSON é único por base: grava o valor inteiro (não junta com '|')
    let joined: string
    if (tipoUp === 'JSON') {
      joined = novoValor
    } else {
      const totalItems = Math.max(getBaseItemCount(baseId), subIndex + 1)
      const isStatus = tipoUp === 'STATUS' || tipoUp === 'STATUS_SN'
      const arr = parsePipeValues(raw, totalItems, isStatus)
      arr[subIndex] = novoValor
      joined = arr.join(' | ')
    }

    // Optimistic update
    setDados(prev => ({ ...prev, [key]: joined }))

    try {
      await api.upsertProjetoDado({
        projeto_id: id!,
        base_id: baseId,
        coluna_id: colunaId,
        valor: joined
      })
    } catch (err) {
      console.error(err)
      setDados(prev => ({ ...prev, [key]: raw }))
      alert('Erro ao salvar o dado.')
    }
  }

  // Adiciona uma nova sub-linha (novo Agency ID) para a base
  const handleAddSubItem = async (baseId: string) => {
    if (isReadOnlyUser()) return
    const currentCount = getBaseItemCount(baseId)
    const nextIndex = currentCount

    // Abre a base expandida automaticamente
    setExpandedBases(prev => ({ ...prev, [baseId]: true }))

    // Identifica a coluna que define o desdobramento (TEXTO_MULTI ou Agency ID)
    const agencyCol = colunas.find(c => c.tipo?.toUpperCase() === 'TEXTO_MULTI' || c.nome.toLowerCase().includes('agency')) || colunas.find(c => c.tipo?.toUpperCase() === 'TEXTO') || colunas[0]
    if (!agencyCol) return

    await handleUpdateSubDado(baseId, agencyCol.id, nextIndex, '')
  }

  // Remove uma sub-linha da base
  const handleRemoveSubItem = async (baseId: string, subIndexToRemove: number) => {
    if (isReadOnlyUser()) return
    if (!confirm('Deseja realmente remover esta linha de Agency ID?')) return

    const totalItems = getBaseItemCount(baseId)
    if (totalItems <= 1) return

    // Atualiza todas as colunas removendo o índice
    const updates: Promise<any>[] = []
    const newDadosState = { ...dados }

    colunas.forEach(col => {
      const key = `${baseId}_${col.id}`
      const raw = dados[key] || ''
      const arr = parsePipeValues(raw, totalItems)
      arr.splice(subIndexToRemove, 1)
      const joined = arr.join(' | ')

      newDadosState[key] = joined
      updates.push(
        api.upsertProjetoDado({
          projeto_id: id!,
          base_id: baseId,
          coluna_id: col.id,
          valor: joined
        })
      )
    })

    setDados(newDadosState)

    try {
      await Promise.all(updates)
    } catch (err) {
      console.error('Erro ao remover sub-item:', err)
      fetchProjetoCompleto()
    }
  }

  const toggleExpand = (baseId: string) => {
    setExpandedBases(prev => ({ ...prev, [baseId]: !prev[baseId] }))
  }

  const handleExpandAll = () => {
    const allExp: Record<string, boolean> = {}
    bases.forEach(b => {
      allExp[b.id] = true
    })
    setExpandedBases(allExp)
  }

  const handleCollapseAll = () => {
    setExpandedBases({})
  }

  // Cálculo do progresso geral considerando todos os sub-itens / agências
  const calculateProgress = () => {
    if (bases.length === 0 || colunas.length === 0) return 0
    
    const indicadores = colunas.filter(c => c.indicador_conclusao)
    if (indicadores.length === 0) return 0

    let totalSubItens = 0
    let concluidos = 0

    bases.forEach(base => {
      const itemCount = getBaseItemCount(base.id)
      for (let i = 0; i < itemCount; i++) {
        totalSubItens++
        let isItemDone = true
        indicadores.forEach(ind => {
          const val = getSubValor(base.id, ind.id, i)
          const tipo = ind.tipo?.toUpperCase()
          if (tipo === 'STATUS' && val !== 'OK') isItemDone = false
          else if (tipo === 'STATUS_SN' && val !== 'SIM') isItemDone = false
          else if (tipo !== 'STATUS' && tipo !== 'STATUS_SN' && (!val || val.trim() === '')) isItemDone = false
        })
        if (isItemDone) concluidos++
      }
    })

    return totalSubItens > 0 ? Math.round((concluidos / totalSubItens) * 100) : 0
  }

  // Contagem total de sub-itens / agências
  const totalAgenciasCount = useMemo(() => {
    return bases.reduce((acc, b) => acc + getBaseItemCount(b.id), 0)
  }, [bases, dados, colunas])

  // Filtragem de bases
  const filteredBases = useMemo(() => {
    return bases.filter(base => {
      const itemCount = getBaseItemCount(base.id)
      
      // 1. Busca por texto (Base, Cliente ou qualquer valor digitado nas colunas/Agency IDs)
      const q = searchQuery.toLowerCase().trim()
      let matchQuery = !q || base.nome_base.toLowerCase().includes(q) || (base.empresa && base.empresa.toLowerCase().includes(q))
      
      if (!matchQuery && q) {
        // Checar se algum Agency ID ou valor da base bate com a busca
        for (const col of colunas) {
          const val = dados[`${base.id}_${col.id}`] || ''
          if (val.toLowerCase().includes(q)) {
            matchQuery = true
            break
          }
        }
      }

      if (!matchQuery) return false

      // 2. Filtro por status de coluna
      if (filtroStatus !== 'TODOS') {
        const targetCols = filtroColunaId === 'TODAS' 
          ? colunas.filter(c => ['STATUS', 'STATUS_SN'].includes(c.tipo?.toUpperCase() || ''))
          : colunas.filter(c => c.id === filtroColunaId)

        if (targetCols.length === 0) return true

        let matchesStatus = false
        for (let i = 0; i < itemCount; i++) {
          for (const col of targetCols) {
            const val = getSubValor(base.id, col.id, i)
            if (filtroStatus === 'EM_BRANCO' && (!val || val === '')) {
              matchesStatus = true
              break
            } else if (val === filtroStatus) {
              matchesStatus = true
              break
            }
          }
          if (matchesStatus) break
        }

        if (!matchesStatus) return false
      }

      return true
    })
  }, [bases, dados, colunas, searchQuery, filtroColunaId, filtroStatus])

  const sanitizeFilename = (name: string) => {
    return (name || 'projeto')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase()
  }

  // Exportar Excel desdobrado por sub-linhas
  const exportToExcel = () => {
    if (!projeto || bases.length === 0) return

    const rows: Record<string, any>[] = []

    filteredBases.forEach(base => {
      const itemCount = getBaseItemCount(base.id)
      for (let i = 0; i < itemCount; i++) {
        const rowObj: Record<string, any> = {
          'Base': base.nome_base,
          'Cliente / Empresa': base.empresa || 'Sem cliente alocado',
          'Item / Agência': itemCount > 1 ? `Agência ${i + 1}` : 'Principal'
        }

        colunas.forEach(col => {
          rowObj[col.nome] = getSubValor(base.id, col.id, i) || (col.tipo === 'STATUS' ? 'EM BRANCO' : '')
        })

        rows.push(rowObj)
      }
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const colWidths = [
      { wch: 18 },
      { wch: 32 },
      { wch: 16 },
      ...colunas.map(c => ({ wch: Math.max(c.nome.length + 5, 18) }))
    ]
    ws['!cols'] = colWidths

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Projeto')
    const filename = `${sanitizeFilename(projeto.nome)}_export_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(wb, filename)
  }

  // Exportar PDF desdobrado por sub-linhas
  const exportToPdf = () => {
    if (!projeto || bases.length === 0) return

    const doc = new jsPDF({
      orientation: colunas.length > 3 ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4'
    })

    const title = `Relatório de Projeto: ${projeto.nome}`
    const dateStr = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const progressVal = calculateProgress()

    doc.setFontSize(15)
    doc.setTextColor(15, 23, 42)
    doc.text(title, 40, 40)

    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(`Gerado em: ${dateStr}   |   Bases: ${bases.length} (${totalAgenciasCount} agências)   |   Progresso Geral: ${progressVal}%`, 40, 56)

    const tableHeaders = ['Base', 'Cliente / Empresa', ...colunas.map(c => c.nome)]
    const tableRows: string[][] = []

    filteredBases.forEach(base => {
      const itemCount = getBaseItemCount(base.id)
      for (let i = 0; i < itemCount; i++) {
        tableRows.push([
          itemCount > 1 ? `${base.nome_base} (#${i + 1})` : base.nome_base,
          base.empresa || 'Sem cliente alocado',
          ...colunas.map(col => getSubValor(base.id, col.id, i) || '-')
        ])
      }
    })

    autoTable(doc, {
      startY: 70,
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 4,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didDrawPage: () => {
        const str = `Página ${doc.getNumberOfPages()}`
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        const pageSize = doc.internal.pageSize
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth()
        doc.text(str, pageWidth - 60, pageHeight - 20)
      }
    })

    const filename = `${sanitizeFilename(projeto.nome)}_relatorio_${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(filename)
  }

  if (loading) return <div className="text-slate-400 p-8 text-center">Carregando detalhes do projeto...</div>
  if (!projeto) return <div className="text-slate-400 p-8 text-center">Projeto não encontrado.</div>

  const progress = calculateProgress()
  const isFiltering = searchQuery !== '' || filtroStatus !== 'TODOS' || filtroColunaId !== 'TODAS'

  return (
    <div className="space-y-5 max-w-full overflow-hidden flex flex-col h-[calc(100vh-80px)]">
      
      {/* Top Bar: Title, Meta and Actions */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/bases')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Voltar para Projetos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{projeto.nome}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                {bases.length} Bases • {totalAgenciasCount} Agências
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Criado em {new Date(projeto.created_at).toLocaleDateString('pt-BR')} • Granularidade com múltiplas agências por base
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Export Buttons */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-sm">
            <button
              onClick={exportToExcel}
              className="px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Exportar dados para Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-0.5"></div>
            <button
              onClick={exportToPdf}
              className="px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Exportar relatório em PDF (.pdf)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>

          {!isReadOnlyUser() && (
            <>
              <button
                onClick={() => setIsEditarProjetoOpen(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Settings className="w-4 h-4 text-brand-400" />
                Editar Projeto
              </button>
              <button
                onClick={() => setIsGerenciarBasesOpen(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Settings2 className="w-4 h-4" />
                Gerenciar Bases
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar Card */}
      <div className="bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg shrink-0">
        <div className="flex justify-between items-end mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Progresso Geral</span>
            <span className="text-[11px] text-slate-500">({totalAgenciasCount} agências avaliadas)</span>
          </div>
          <span className={`text-xl font-black ${getProgressTextColor(progress)}`}>{progress}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`${getProgressColor(progress)} h-full rounded-full transition-all duration-500`} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-dark-card border border-slate-800 rounded-xl p-3.5 shadow-lg shrink-0 flex flex-wrap items-center justify-between gap-3">
        
        {/* Search Input & Status Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
          
          {/* Busca por Base / Cliente / Agency ID */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar Base, Cliente ou Agency ID..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Seletor de Coluna para Filtrar */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium">Etapa:</span>
            <select
              value={filtroColunaId}
              onChange={e => setFiltroColunaId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="TODAS" className="bg-slate-900 text-white">Todas as Colunas</option>
              {colunas.filter(c => ['STATUS', 'STATUS_SN'].includes(c.tipo?.toUpperCase() || '')).map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Status */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
            <span className="text-[11px] text-slate-400 font-medium">Status:</span>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer text-slate-200"
            >
              <option value="TODOS" className="bg-slate-900 text-white">Todos os Status</option>
              <option value="OK" className="bg-slate-900 text-green-400">OK</option>
              <option value="SIM" className="bg-slate-900 text-green-400">SIM</option>
              <option value="PENDENTE" className="bg-slate-900 text-amber-400">PENDENTE</option>
              <option value="NÃO" className="bg-slate-900 text-amber-400">NÃO</option>
              <option value="ERRO" className="bg-slate-900 text-red-400">ERRO</option>
              <option value="EM_BRANCO" className="bg-slate-900 text-slate-400">EM BRANCO</option>
            </select>
          </div>

          {isFiltering && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFiltroColunaId('TODAS')
                setFiltroStatus('TODOS')
              }}
              className="text-xs text-brand-400 hover:text-brand-300 underline font-medium px-2 py-1"
            >
              Limpar Filtros
            </button>
          )}

        </div>

        {/* Expand / Collapse Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Expandir todas as bases com múltiplas agências"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>Expandir Todos</span>
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Recolher todas as bases"
          >
            <Minus className="w-3.5 h-3.5 text-slate-400" />
            <span>Recolher</span>
          </button>
        </div>

      </div>

      {/* Dynamic Table */}
      <div className="bg-dark-card border border-slate-800 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0 shadow-xl">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-max border-collapse">
            <thead className="bg-slate-900/95 text-slate-300 sticky top-0 z-20 border-b border-slate-800 backdrop-blur-md">
              <tr>
                <th className="px-5 py-3.5 font-bold border-r border-slate-800 bg-slate-900 left-0 sticky z-30 min-w-[260px]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-400" />
                    <span>Base / Cliente</span>
                  </div>
                </th>
                {colunas.map(col => (
                  <th key={col.id} className="px-5 py-3.5 font-semibold text-slate-200 min-w-[150px]">
                    <div className="flex items-center space-x-2">
                      <span>{col.nome}</span>
                      {col.indicador_conclusao && (
                        <span title="Indicador de Conclusão">
                          <CheckCircle2 className="w-4 h-4 text-brand-500" />
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBases.length === 0 ? (
                <tr>
                  <td colSpan={colunas.length + 1} className="text-center py-12 text-slate-500 text-sm">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    Nenhuma base ou agência encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredBases.map(base => {
                  const itemCount = getBaseItemCount(base.id)
                  const isExpanded = !!expandedBases[base.id]
                  const hasMultiple = itemCount > 1

                  return (
                    <Fragment key={base.id}>
                      
                      {/* Main Row (Sub-item 0) */}
                      <tr className={`transition-colors ${isExpanded ? 'bg-slate-800/20' : 'hover:bg-slate-800/30'}`}>
                        
                        {/* Coluna Base / Cliente */}
                        <td className="px-5 py-3 border-r border-slate-800/60 bg-dark-card left-0 sticky z-10 font-mono text-white min-w-[260px]">
                          <div className="flex items-start gap-2.5">
                            
                            {/* Botão Expandir (+) */}
                            <button
                              onClick={() => toggleExpand(base.id)}
                              className={`mt-0.5 p-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                                hasMultiple
                                  ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
                              }`}
                              title={isExpanded ? 'Recolher agências' : `Expandir (${itemCount} agência${itemCount > 1 ? 's' : ''})`}
                            >
                              {isExpanded ? (
                                <Minus className="w-3.5 h-3.5" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-100">{base.nome_base}</span>
                                {hasMultiple && (
                                  <span 
                                    onClick={() => toggleExpand(base.id)}
                                    className="px-1.5 py-0.2 text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded cursor-pointer hover:bg-blue-500/25"
                                  >
                                    {itemCount} agências
                                  </span>
                                )}
                              </div>
                              <span className="block text-xs font-sans text-slate-400 truncate max-w-[220px] mt-0.5">
                                {base.empresa || 'Sem cliente alocado'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Colunas do Projeto (Sub-item 0) */}
                        {colunas.map(col => {
                          const valor = getSubValor(base.id, col.id, 0)

                          return (
                            <td key={col.id} className="px-5 py-2.5 min-w-[150px]">
                              {col.tipo?.toUpperCase() === 'STATUS' ? (
                                <select
                                  value={valor}
                                  disabled={isReadOnlyUser()}
                                  onChange={(e) => handleUpdateSubDado(base.id, col.id, 0, e.target.value)}
                                  className={`input-field w-full max-w-[140px] py-1.5 px-2.5 text-xs font-bold border-transparent focus:border-brand-500 rounded-lg ${
                                    isReadOnlyUser() ? 'cursor-default' : 'cursor-pointer'
                                  } ${statusCellClass(valor)}`}
                                >
                                  <option value="" className="bg-slate-900 text-slate-400">EM BRANCO</option>
                                  <option value="OK" className="bg-slate-900 text-green-400">OK</option>
                                  <option value="PENDENTE" className="bg-slate-900 text-amber-400">PENDENTE</option>
                                  <option value="ERRO" className="bg-slate-900 text-red-400">ERRO</option>
                                </select>
                              ) : col.tipo?.toUpperCase() === 'STATUS_SN' ? (
                                <select
                                  value={valor}
                                  disabled={isReadOnlyUser()}
                                  onChange={(e) => handleUpdateSubDado(base.id, col.id, 0, e.target.value)}
                                  className={`input-field w-full max-w-[140px] py-1.5 px-2.5 text-xs font-bold border-transparent focus:border-brand-500 rounded-lg ${
                                    isReadOnlyUser() ? 'cursor-default' : 'cursor-pointer'
                                  } ${statusCellClass(valor)}`}
                                >
                                  <option value="" className="bg-slate-900 text-slate-400">EM BRANCO</option>
                                  <option value="SIM" className="bg-slate-900 text-green-400">SIM</option>
                                  <option value="NÃO" className="bg-slate-900 text-amber-400">NÃO</option>
                                </select>
                              ) : col.tipo?.toUpperCase() === 'DATA' ? (
                                <input
                                  type="date"
                                  value={valor}
                                  disabled={isReadOnlyUser()}
                                  onChange={(e) => handleUpdateSubDado(base.id, col.id, 0, e.target.value)}
                                  className={`input-field py-1.5 px-3 text-xs w-full max-w-[140px] bg-slate-800/80 border-slate-700 focus:border-brand-500 rounded-lg ${
                                    isReadOnlyUser() ? 'cursor-default opacity-80' : ''
                                  }`}
                                />
                              ) : col.tipo?.toUpperCase() === 'JSON' ? (
                                <JsonCell
                                  valor={valor}
                                  readOnly={isReadOnlyUser()}
                                  onChange={(v) => handleUpdateSubDado(base.id, col.id, 0, v)}
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={valor}
                                  disabled={isReadOnlyUser()}
                                  onChange={(e) => handleUpdateSubDado(base.id, col.id, 0, e.target.value)}
                                  placeholder={isReadOnlyUser() ? '' : '...'}
                                  className={`input-field py-1.5 px-3 text-xs font-medium w-full max-w-[140px] bg-slate-800/40 border-slate-700/60 rounded-lg text-slate-200 ${
                                    isReadOnlyUser() ? 'cursor-default opacity-80' : 'hover:bg-slate-800 focus:bg-slate-800 focus:border-brand-500'
                                  } transition-colors`}
                                />
                              )}
                            </td>
                          )
                        })}
                      </tr>

                      {/* Expanded Sub-Rows (Sub-items 1, 2, ...) */}
                      {isExpanded && Array.from({ length: itemCount - 1 }).map((_, idx) => {
                        const subIndex = idx + 1
                        return (
                          <tr key={`${base.id}_sub_${subIndex}`} className="bg-slate-900/40 hover:bg-slate-900/60 transition-colors">
                            
                            {/* Sub-item Label */}
                            <td className="px-5 py-2 border-r border-slate-800/60 bg-slate-900/90 left-0 sticky z-10 min-w-[260px]">
                              <div className="flex items-center justify-between pl-8 pr-2">
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                                  <span className="text-slate-600">↳</span>
                                  <span className="text-slate-400 font-semibold">Agência #{subIndex + 1}</span>
                                </div>
                                {!isReadOnlyUser() && (
                                  <button
                                    onClick={() => handleRemoveSubItem(base.id, subIndex)}
                                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                                    title="Remover esta agência"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Sub-item Columns */}
                            {colunas.map(col => {
                              const valor = getSubValor(base.id, col.id, subIndex)

                              return (
                                <td key={col.id} className="px-5 py-2 min-w-[150px]">
                                  {col.tipo?.toUpperCase() === 'STATUS' ? (
                                    <select
                                      value={valor}
                                      disabled={isReadOnlyUser()}
                                      onChange={(e) => handleUpdateSubDado(base.id, col.id, subIndex, e.target.value)}
                                      className={`input-field w-full max-w-[140px] py-1.5 px-2.5 text-xs font-bold border-transparent focus:border-brand-500 rounded-lg ${
                                        isReadOnlyUser() ? 'cursor-default' : 'cursor-pointer'
                                      } ${statusCellClass(valor)}`}
                                    >
                                      <option value="" className="bg-slate-900 text-slate-400">EM BRANCO</option>
                                      <option value="OK" className="bg-slate-900 text-green-400">OK</option>
                                      <option value="PENDENTE" className="bg-slate-900 text-amber-400">PENDENTE</option>
                                      <option value="ERRO" className="bg-slate-900 text-red-400">ERRO</option>
                                    </select>
                                  ) : col.tipo?.toUpperCase() === 'STATUS_SN' ? (
                                    <select
                                      value={valor}
                                      disabled={isReadOnlyUser()}
                                      onChange={(e) => handleUpdateSubDado(base.id, col.id, subIndex, e.target.value)}
                                      className={`input-field w-full max-w-[140px] py-1.5 px-2.5 text-xs font-bold border-transparent focus:border-brand-500 rounded-lg ${
                                        isReadOnlyUser() ? 'cursor-default' : 'cursor-pointer'
                                      } ${statusCellClass(valor)}`}
                                    >
                                      <option value="" className="bg-slate-900 text-slate-400">EM BRANCO</option>
                                      <option value="SIM" className="bg-slate-900 text-green-400">SIM</option>
                                      <option value="NÃO" className="bg-slate-900 text-amber-400">NÃO</option>
                                    </select>
                                  ) : col.tipo?.toUpperCase() === 'DATA' ? (
                                    <input
                                      type="date"
                                      value={valor}
                                      disabled={isReadOnlyUser()}
                                      onChange={(e) => handleUpdateSubDado(base.id, col.id, subIndex, e.target.value)}
                                      className={`input-field py-1.5 px-3 text-xs w-full max-w-[140px] bg-slate-800/80 border-slate-700 focus:border-brand-500 rounded-lg ${
                                        isReadOnlyUser() ? 'cursor-default opacity-80' : ''
                                      }`}
                                    />
                                  ) : col.tipo?.toUpperCase() === 'JSON' ? (
                                    <JsonCell
                                      valor={valor}
                                      readOnly={isReadOnlyUser()}
                                      onChange={(v) => handleUpdateSubDado(base.id, col.id, subIndex, v)}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={valor}
                                      disabled={isReadOnlyUser()}
                                      onChange={(e) => handleUpdateSubDado(base.id, col.id, subIndex, e.target.value)}
                                      placeholder={isReadOnlyUser() ? '' : '...'}
                                      className={`input-field py-1.5 px-3 text-xs font-medium w-full max-w-[140px] bg-slate-800/40 border-slate-700/60 rounded-lg text-slate-200 ${
                                        isReadOnlyUser() ? 'cursor-default opacity-80' : 'hover:bg-slate-800 focus:bg-slate-800 focus:border-brand-500'
                                      } transition-colors`}
                                    />
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}

                      {/* Expanded Action: Add Sub-Item */}
                      {isExpanded && !isReadOnlyUser() && (
                        <tr className="bg-slate-900/30">
                          <td colSpan={colunas.length + 1} className="px-5 py-2 pl-12">
                            <button
                              onClick={() => handleAddSubItem(base.id)}
                              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Adicionar {colunas.find(c => c.tipo?.toUpperCase() === 'TEXTO_MULTI')?.nome || 'Agency ID'} para {base.nome_base}</span>
                            </button>
                          </td>
                        </tr>
                      )}

                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Bar */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>
            Exibindo <strong>{filteredBases.length}</strong> de <strong>{bases.length}</strong> bases (<strong>{totalAgenciasCount}</strong> agências totais)
          </span>
          <span className="text-[11px] text-slate-500">
            Última sincronização: {new Date().toLocaleTimeString('pt-BR')}
          </span>
        </div>
      </div>

      <GerenciarBasesModal
        isOpen={isGerenciarBasesOpen}
        onClose={() => { setIsGerenciarBasesOpen(false); fetchProjetoCompleto(); }}
        projetoId={id!}
        projetoNome={projeto.nome}
        basesAtuais={bases}
      />

      <EditarProjetoModal
        isOpen={isEditarProjetoOpen}
        onClose={() => setIsEditarProjetoOpen(false)}
        projetoId={id!}
        onSuccess={fetchProjetoCompleto}
      />
    </div>
  )
}
