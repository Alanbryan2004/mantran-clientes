import { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  ShoppingBag, 
  Search, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileSpreadsheet, 
  FileText,
  Truck,
  Layers,
  Calendar,
  Database
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isAdminUser } from '../lib/auth'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import clsx from 'clsx'

export type ProcessoTipo = 'Last Mile' | 'First Mile' | 'Line Haul' | 'Mobile Hub'
export type StatusProcessamento = 'FINALIZADO' | 'PROCESSANDO' | 'NAO_INICIADO'

export interface ShopeeProcessamentoDB {
  id: string
  transportadora_id?: string | null
  nome_empresa: string
  nome_base?: string | null
  cnpj?: string | null
  quinzena: number
  mes: number
  ano: number
  processo: ProcessoTipo
  status: StatusProcessamento
  segundos_processamento?: number | null
  registros_processados?: number | null
  data_inicio?: string | null
  data_fim?: string | null
  created_at?: string
  updated_at?: string
}

function formatarTempoSegundos(totalSegundos?: number | null): string {
  if (totalSegundos === undefined || totalSegundos === null || totalSegundos <= 0) return '-'
  const h = Math.floor(totalSegundos / 3600)
  const m = Math.floor((totalSegundos % 3600) / 60)
  const s = totalSegundos % 60
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

function formatarDataHora(isoString?: string | null): string {
  if (!isoString) return '-'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return isoString
  }
}

interface ItemProcessamento {
  id: string
  transportadora_id: string
  transportadora_nome: string
  base_nome: string
  processo: ProcessoTipo
  status: StatusProcessamento
  tempo_processamento: string
  segundos_processamento: number
  registros_processados: number
  data_inicio: string
  data_fim?: string
}

const MESES = [
  { valor: '01', nome: 'Janeiro' },
  { valor: '02', nome: 'Fevereiro' },
  { valor: '03', nome: 'Março' },
  { valor: '04', nome: 'Abril' },
  { valor: '05', nome: 'Maio' },
  { valor: '06', nome: 'Junho' },
  { valor: '07', nome: 'Julho' },
  { valor: '08', nome: 'Agosto' },
  { valor: '09', nome: 'Setembro' },
  { valor: '10', nome: 'Outubro' },
  { valor: '11', nome: 'Novembro' },
  { valor: '12', nome: 'Dezembro' }
]

const ANOS = ['2026', '2025', '2024']

const PROCESSOS: { id: 'TODOS' | ProcessoTipo; label: string }[] = [
  { id: 'TODOS', label: 'Todos os Processos' },
  { id: 'Last Mile', label: 'Last Mile' },
  { id: 'Line Haul', label: 'Line Haul' },
  { id: 'First Mile', label: 'First Mile' },
  { id: 'Mobile Hub', label: 'Mobile Hub' }
]

export function ProcessamentoShopee() {
  // Filtros
  const [quinzena, setQuinzena] = useState<'1' | '2'>('1')
  const [mes, setMes] = useState('09')
  const [ano, setAno] = useState('2026')
  const [processoFiltro, setProcessoFiltro] = useState<'TODOS' | ProcessoTipo>('TODOS')
  const [transportadoraFiltro, setTransportadoraFiltro] = useState<string>('TODAS')
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | StatusProcessamento>('TODOS')
  const [searchQuery, setSearchQuery] = useState('')

  const [clientesShopee, setClientesShopee] = useState<any[]>([])
  const [bases, setBases] = useState<any[]>([])
  const [processamentosDB, setProcessamentosDB] = useState<ShopeeProcessamentoDB[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSyncingSqlServer, setIsSyncingSqlServer] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)
  const isAdmin = isAdminUser()
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<string>(() =>
    new Date().toLocaleTimeString('pt-BR')
  )

  const fetchDadosClientesShopee = useCallback(async () => {
    try {
      const [resClientes, resBases] = await Promise.all([
        supabase
          .from('clientes')
          .select('id, nome_empresa, tipo, processos_shopee')
          .eq('tipo', 'SHOPEE'),
        supabase
          .from('bases')
          .select('id, nome_base, cliente_id')
      ])

      if (resClientes.data) setClientesShopee(resClientes.data)
      if (resBases.data) setBases(resBases.data)
    } catch (err) {
      console.error('Erro ao buscar clientes Shopee e bases:', err)
    }
  }, [])

  const fetchProcessamentos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('shopee_processamentos')
        .select('*')
        .eq('quinzena', Number(quinzena))
        .eq('mes', Number(mes))
        .eq('ano', Number(ano))

      if (error) {
        console.error('Erro ao buscar shopee_processamentos:', error)
        return
      }

      setProcessamentosDB((data as ShopeeProcessamentoDB[]) || [])
      setUltimaSincronizacao(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      console.error('Erro ao buscar shopee_processamentos:', err)
    }
  }, [quinzena, mes, ano])

  // Carga inicial
  useEffect(() => {
    const carregarTudo = async () => {
      setLoading(true)
      await Promise.all([fetchProcessamentos(), fetchDadosClientesShopee()])
      setLoading(false)
    }
    carregarTudo()
  }, [fetchProcessamentos, fetchDadosClientesShopee])

  // Atualiza processamentos ao alterar filtros de competência (quinzena, mês, ano)
  useEffect(() => {
    fetchProcessamentos()
  }, [fetchProcessamentos])

  // Inscrição Realtime no Supabase para a tabela shopee_processamentos e clientes
  useEffect(() => {
    const channel = supabase
      .channel('shopee_processamentos_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopee_processamentos' },
        () => {
          fetchProcessamentos()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clientes' },
        () => {
          fetchDadosClientesShopee()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchProcessamentos, fetchDadosClientesShopee])

  // Mapeamento de base por cliente
  const basesMapPorCliente = useMemo(() => {
    const map = new Map<string, string>()
    bases.forEach(b => {
      if (b.cliente_id) map.set(b.cliente_id, b.nome_base)
    })
    return map
  }, [bases])

  // Contagem real de processos cadastrados nos Clientes Shopee (base para o Total de Processos e Combobox)
  const contagemProcessosClientes = useMemo(() => {
    const counts = {
      TODOS: 0,
      'Last Mile': 0,
      'Line Haul': 0,
      'First Mile': 0,
      'Mobile Hub': 0
    }

    clientesShopee.forEach(c => {
      const procs = Array.isArray(c.processos_shopee) ? c.processos_shopee : []
      procs.forEach((p: ProcessoTipo) => {
        if (counts[p] !== undefined) {
          counts[p]++
          counts.TODOS++
        }
      })
    })

    return counts
  }, [clientesShopee])

  // Transportadoras únicas disponíveis (exatamente os clientes Shopee cadastrados)
  const transportadorasDisponiveis = useMemo(() => {
    return clientesShopee
      .filter(c => c.id && c.nome_empresa)
      .map(c => ({ id: c.id, nome_empresa: c.nome_empresa }))
      .sort((a, b) => a.nome_empresa.localeCompare(b.nome_empresa))
  }, [clientesShopee])

  // Ajusta filtro de transportadora caso a selecionada não exista na nova competência
  useEffect(() => {
    if (transportadoraFiltro !== 'TODAS') {
      const existe = transportadorasDisponiveis.some(t => t.id === transportadoraFiltro)
      if (!existe) {
        setTransportadoraFiltro('TODAS')
      }
    }
  }, [transportadorasDisponiveis, transportadoraFiltro])

  // Processamentos esperados dos clientes Shopee mesclados com status real de shopee_processamentos
  const dadosProcessamento = useMemo<ItemProcessamento[]>(() => {
    // 1. Indexar registros existentes no banco para busca rápida por base, id e nome_empresa
    const mapDB = new Map<string, ShopeeProcessamentoDB>()
    processamentosDB.forEach(p => {
      if (!p.processo) return
      const procKey = p.processo.trim().toLowerCase()
      const keys: string[] = []
      if (p.nome_base) keys.push(`${p.nome_base.trim().toLowerCase()}|${procKey}`)
      if (p.transportadora_id) keys.push(`${p.transportadora_id.trim().toLowerCase()}|${procKey}`)
      if (p.nome_empresa) keys.push(`${p.nome_empresa.trim().toLowerCase()}|${procKey}`)

      keys.forEach(k => {
        const existing = mapDB.get(k)
        if (!existing || p.status === 'FINALIZADO' || (p.status === 'PROCESSANDO' && existing.status !== 'FINALIZADO')) {
          mapDB.set(k, p)
        }
      })
    })

    const itens: ItemProcessamento[] = []

    // 2. Gerar processos a partir dos clientes Shopee (a fonte da verdade absoluta!)
    clientesShopee.forEach(cliente => {
      const nomeBase = basesMapPorCliente.get(cliente.id) || 'dbMantran'
      const procs = Array.isArray(cliente.processos_shopee) ? cliente.processos_shopee : []

      procs.forEach((proc: ProcessoTipo) => {
        // Filtro por processo
        if (processoFiltro !== 'TODOS' && proc !== processoFiltro) return

        // Filtro por transportadora
        if (transportadoraFiltro !== 'TODAS' && cliente.id !== transportadoraFiltro) return

        const keyBase = `${nomeBase.trim().toLowerCase()}|${proc.trim().toLowerCase()}`
        const keyId = `${cliente.id.trim().toLowerCase()}|${proc.trim().toLowerCase()}`
        const keyEmpresa = `${cliente.nome_empresa.trim().toLowerCase()}|${proc.trim().toLowerCase()}`

        const procDB = (nomeBase ? mapDB.get(keyBase) : null) || mapDB.get(keyId) || mapDB.get(keyEmpresa)

        if (procDB) {
          const status: StatusProcessamento = procDB.status || 'NAO_INICIADO'
          let segs = procDB.segundos_processamento || 0
          let tempoStr = '-'

          if (status === 'FINALIZADO') {
            if (segs > 0) tempoStr = formatarTempoSegundos(segs)
            else if (procDB.data_inicio && procDB.data_fim) {
              const diff = Math.max(0, Math.floor((new Date(procDB.data_fim).getTime() - new Date(procDB.data_inicio).getTime()) / 1000))
              tempoStr = formatarTempoSegundos(diff)
              segs = diff
            } else {
              tempoStr = '00h 00m 00s'
            }
          } else if (status === 'PROCESSANDO') {
            if (segs > 0) tempoStr = formatarTempoSegundos(segs)
            else if (procDB.data_inicio) {
              const diff = Math.max(0, Math.floor((Date.now() - new Date(procDB.data_inicio).getTime()) / 1000))
              tempoStr = formatarTempoSegundos(diff)
              segs = diff
            } else {
              tempoStr = 'Em andamento...'
            }
          }

          itens.push({
            id: procDB.id,
            transportadora_id: cliente.id,
            transportadora_nome: cliente.nome_empresa,
            base_nome: nomeBase,
            processo: proc,
            status,
            tempo_processamento: tempoStr,
            segundos_processamento: segs,
            registros_processados: procDB.registros_processados || 0,
            data_inicio: formatarDataHora(procDB.data_inicio),
            data_fim: status === 'PROCESSANDO' ? 'Em andamento...' : formatarDataHora(procDB.data_fim)
          })
        } else {
          // Processo do cliente Shopee ainda não iniciado na competência selecionada
          itens.push({
            id: `${cliente.id}-${proc}`,
            transportadora_id: cliente.id,
            transportadora_nome: cliente.nome_empresa,
            base_nome: nomeBase,
            processo: proc,
            status: 'NAO_INICIADO',
            tempo_processamento: '-',
            segundos_processamento: 0,
            registros_processados: 0,
            data_inicio: '-',
            data_fim: '-'
          })
        }
      })
    })

    return itens.sort((a, b) => {
      const cmp = a.transportadora_nome.localeCompare(b.transportadora_nome)
      if (cmp !== 0) return cmp
      return a.processo.localeCompare(b.processo)
    })
  }, [clientesShopee, basesMapPorCliente, processamentosDB, processoFiltro, transportadoraFiltro])

  // Filtro de busca por texto e status
  const filteredItems = useMemo(() => {
    return dadosProcessamento.filter(item => {
      const matchSearch = item.transportadora_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.processo.toLowerCase().includes(searchQuery.toLowerCase())

      const matchStatus = statusFiltro === 'TODOS' || item.status === statusFiltro

      return matchSearch && matchStatus
    })
  }, [dadosProcessamento, searchQuery, statusFiltro])

  // Contadores métricos (calculados com base na busca para manter estabilidade ao clicar nos cards de status)
  const itemsParaContadores = useMemo(() => {
    return dadosProcessamento.filter(item => {
      return item.transportadora_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.processo.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [dadosProcessamento, searchQuery])

  const totalCount = itemsParaContadores.length
  const naoIniciadosCount = itemsParaContadores.filter(i => i.status === 'NAO_INICIADO').length
  const processandoCount = itemsParaContadores.filter(i => i.status === 'PROCESSANDO').length
  const finalizadosCount = itemsParaContadores.filter(i => i.status === 'FINALIZADO').length

  const percentFinalizado = totalCount > 0 ? Math.round((finalizadosCount / totalCount) * 100) : 0

  // Exportar Excel
  const exportToExcel = () => {
    if (filteredItems.length === 0) return

    const rows = filteredItems.map(item => ({
      'Transportadora Shopee': item.transportadora_nome,
      'Quinzena': `${quinzena}ª Quinzena`,
      'Mês / Ano': `${mes}/${ano}`,
      'Processo': item.processo,
      'Status': item.status === 'FINALIZADO' ? 'Finalizado' : item.status === 'PROCESSANDO' ? 'Processando' : 'Não Iniciado',
      'Tempo de Processamento': item.tempo_processamento
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 34 }, // Transportadora
      { wch: 15 }, // Quinzena
      { wch: 12 }, // Mes/Ano
      { wch: 18 }, // Processo
      { wch: 18 }, // Status
      { wch: 24 }  // Tempo
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Processamento Shopee')
    XLSX.writeFile(wb, `processamento_shopee_${quinzena}Q_${mes}_${ano}.xlsx`)
  }

  // Exportar PDF
  const exportToPdf = () => {
    if (filteredItems.length === 0) return

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    })

    const title = `Relatório de Processamento Shopee - ${quinzena}ª Quinzena de ${MESES.find(m => m.valor === mes)?.nome || mes}/${ano}`
    const dateStr = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    // Header
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text(title, 40, 40)

    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(`Gerado em: ${dateStr}   |   Total: ${totalCount}   |   Concluídos: ${finalizadosCount} (${percentFinalizado}%)`, 40, 56)

    const tableHeaders = ['Transportadora Shopee', 'Processo', 'Status', 'Tempo de Processamento']
    const tableRows = filteredItems.map(item => [
      item.transportadora_nome,
      item.processo,
      item.status === 'FINALIZADO' ? 'Finalizado' : item.status === 'PROCESSANDO' ? 'Processando' : 'Não Iniciado',
      item.tempo_processamento
    ])

    autoTable(doc, {
      startY: 70,
      head: [tableHeaders],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 5,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    })

    doc.save(`processamento_shopee_${quinzena}Q_${mes}_${ano}.pdf`)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetchProcessamentos()
      setUltimaSincronizacao(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      console.error('Erro ao atualizar dados:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSyncSqlServer = async () => {
    if (isSyncingSqlServer) return
    const confirma = window.confirm(
      'Deseja sincronizar a tabela shopee_processamentos do SQL Server (dbSuporte) diretamente para o Supabase agora?'
    )
    if (!confirma) return

    setIsSyncingSqlServer(true)
    setSyncFeedback(null)
    try {
      const response = await fetch('/api/sincronizar-shopee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.erro || 'Falha ao sincronizar com o SQL Server.')
      }

      setSyncFeedback({
        tipo: 'sucesso',
        texto: data.mensagem || `${data.total} registros sincronizados com sucesso!`
      })
      await fetchProcessamentos()
      setUltimaSincronizacao(new Date().toLocaleTimeString('pt-BR'))
    } catch (err: any) {
      console.error('Erro na sincronização:', err)
      setSyncFeedback({
        tipo: 'erro',
        texto: err.message || 'Erro ao sincronizar dados com o SQL Server.'
      })
    } finally {
      setIsSyncingSqlServer(false)
      setTimeout(() => {
        setSyncFeedback(null)
      }, 7000)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight flex flex-wrap items-center gap-1.5 sm:gap-2 leading-tight">
                <span>Processamento Shopee</span>
                <span className="text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  4PL / Hubs
                </span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 leading-tight">
                Acompanhe em tempo real o status de fechamento de Last Mile, First Mile e Line Haul por quinzena
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Botão Exclusivo Administrador: Sincronizar com SQL Server */}
          {isAdmin && (
            <button
              onClick={handleSyncSqlServer}
              disabled={isSyncingSqlServer}
              className={clsx(
                "px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer border select-none",
                isSyncingSqlServer
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30 cursor-wait"
                  : "bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 hover:from-amber-500/30 hover:via-orange-500/30 hover:to-red-500/30 text-amber-300 border-amber-500/40 hover:border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              )}
              title="Sincronizar tabela shopee_processamentos do SQL Server (dbSuporte) para o Supabase (Exclusivo Administrador)"
            >
              {isSyncingSqlServer ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Sincronizando SQL Server...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sincronizar SQL Server</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-sm">
            <button
              onClick={exportToExcel}
              disabled={filteredItems.length === 0}
              className="px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Exportar para Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-0.5"></div>
            <button
              onClick={exportToPdf}
              disabled={filteredItems.length === 0}
              className="px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Exportar para PDF (.pdf)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5"
            title="Atualizar dados de processamento"
          >
            <RefreshCw className={clsx("w-3.5 h-3.5 text-brand-400", isRefreshing && "animate-spin")} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Feedback de Sincronização */}
      {syncFeedback && (
        <div className={clsx(
          "p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 shadow-lg",
          syncFeedback.tipo === 'sucesso' 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-rose-500/10 border-rose-500/30 text-rose-300"
        )}>
          <div className="flex items-center gap-2.5">
            {syncFeedback.tipo === 'sucesso' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{syncFeedback.texto}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total de Processos */}
        <div 
          onClick={() => setStatusFiltro('TODOS')}
          className={clsx(
            "bg-dark-card border rounded-xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 shadow-lg relative overflow-hidden cursor-pointer transition-all",
            statusFiltro === 'TODOS' 
              ? "border-blue-500/50 bg-blue-500/5 shadow-[0_0_12px_rgba(59,130,246,0.1)]" 
              : "border-slate-800 hover:border-slate-700"
          )}
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wide sm:tracking-wider leading-tight block">Total de Processos</span>
            <div className="text-lg sm:text-xl font-black text-white mt-0.5">{totalCount}</div>
            <span className="text-[10px] text-slate-500 leading-tight block truncate">
              {quinzena}ª Quinzena • {MESES.find(m => m.valor === mes)?.nome}/{ano}
            </span>
          </div>
        </div>

        {/* Não Iniciado (Vermelho) */}
        <div 
          onClick={() => setStatusFiltro(statusFiltro === 'NAO_INICIADO' ? 'TODOS' : 'NAO_INICIADO')}
          className={clsx(
            "bg-dark-card border rounded-xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 shadow-lg cursor-pointer transition-all",
            statusFiltro === 'NAO_INICIADO' 
              ? "border-red-500/50 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.1)]" 
              : "border-slate-800 hover:border-slate-700"
          )}
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-red-400 uppercase tracking-wide sm:tracking-wider leading-tight block">Não Iniciado</span>
            <div className="text-lg sm:text-xl font-black text-red-300 mt-0.5">{naoIniciadosCount}</div>
            <span className="text-[10px] text-red-400/80 leading-tight block truncate">Aguardando disparo</span>
          </div>
        </div>

        {/* Processando (Laranja) */}
        <div 
          onClick={() => setStatusFiltro(statusFiltro === 'PROCESSANDO' ? 'TODOS' : 'PROCESSANDO')}
          className={clsx(
            "bg-dark-card border rounded-xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 shadow-lg cursor-pointer transition-all",
            statusFiltro === 'PROCESSANDO' 
              ? "border-orange-500/50 bg-orange-500/5 shadow-[0_0_12px_rgba(249,115,22,0.1)]" 
              : "border-slate-800 hover:border-slate-700"
          )}
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-orange-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-orange-400 uppercase tracking-wide sm:tracking-wider leading-tight block">Processando</span>
            <div className="text-lg sm:text-xl font-black text-orange-300 mt-0.5">{processandoCount}</div>
            <span className="text-[10px] text-orange-400/80 leading-tight block truncate">Em execução no momento</span>
          </div>
        </div>

        {/* Finalizados (Verde) */}
        <div 
          onClick={() => setStatusFiltro(statusFiltro === 'FINALIZADO' ? 'TODOS' : 'FINALIZADO')}
          className={clsx(
            "bg-dark-card border rounded-xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 shadow-lg cursor-pointer transition-all",
            statusFiltro === 'FINALIZADO' 
              ? "border-green-500/50 bg-green-500/5 shadow-[0_0_12px_rgba(34,197,94,0.1)]" 
              : "border-slate-800 hover:border-slate-700"
          )}
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-green-400 uppercase tracking-wide sm:tracking-wider leading-tight truncate">Finalizado</span>
              <span className="text-[10px] font-bold text-green-400/80 shrink-0">{percentFinalizado}%</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-green-300 mt-0.5">{finalizadosCount}</div>
            <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
              <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentFinalizado}%` }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* Filter Control Bar */}
      <div className="bg-dark-card border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Quinzena */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-brand-400" />
              <span>Quinzena</span>
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setQuinzena('1')}
                className={clsx(
                  "py-1.5 text-xs font-bold rounded-md transition-all",
                  quinzena === '1'
                    ? "bg-brand-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                )}
              >
                1ª Quinzena
              </button>
              <button
                type="button"
                onClick={() => setQuinzena('2')}
                className={clsx(
                  "py-1.5 text-xs font-bold rounded-md transition-all",
                  quinzena === '2'
                    ? "bg-brand-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                )}
              >
                2ª Quinzena
              </button>
            </div>
          </div>

          {/* Mês */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Mês
            </label>
            <select
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="input-field py-2 px-3 text-xs w-full bg-slate-800/80 border-slate-700 text-white cursor-pointer"
            >
              {MESES.map(m => (
                <option key={m.valor} value={m.valor}>
                  {m.valor} - {m.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Ano */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Ano
            </label>
            <select
              value={ano}
              onChange={e => setAno(e.target.value)}
              className="input-field py-2 px-3 text-xs w-full bg-slate-800/80 border-slate-700 text-white cursor-pointer"
            >
              {ANOS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Processo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              <span>Processo</span>
            </label>
            <select
              value={processoFiltro}
              onChange={e => setProcessoFiltro(e.target.value as any)}
              className="input-field py-2 px-3 text-xs w-full bg-slate-800/80 border-slate-700 text-white cursor-pointer font-medium"
            >
              {PROCESSOS.map(p => {
                const count = contagemProcessosClientes[p.id] ?? 0
                return (
                  <option key={p.id} value={p.id}>
                    {p.label} ({count})
                  </option>
                )
              })}
            </select>
          </div>

          {/* Transportadora Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              <span>Transportadora</span>
            </label>
            <select
              value={transportadoraFiltro}
              onChange={e => setTransportadoraFiltro(e.target.value)}
              className="input-field py-2 px-3 text-xs w-full bg-slate-800/80 border-slate-700 text-white cursor-pointer truncate"
            >
              <option value="TODAS">Todas as Transportadoras ({transportadorasDisponiveis.length})</option>
              {transportadorasDisponiveis.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nome_empresa}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span>Status</span>
            </label>
            <select
              value={statusFiltro}
              onChange={e => setStatusFiltro(e.target.value as any)}
              className="input-field py-2 px-3 text-xs w-full bg-slate-800/80 border-slate-700 text-white cursor-pointer font-medium"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="FINALIZADO">🟢 Finalizado</option>
              <option value="PROCESSANDO">🟠 Processando</option>
              <option value="NAO_INICIADO">🔴 Não Iniciado</option>
            </select>
          </div>

        </div>

        {/* Search & Quick Process Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar transportadora Shopee..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-9 py-2 text-xs w-full bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-brand-500"
            />
          </div>

          {/* Process Shortcut Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {PROCESSOS.map(p => {
              const count = contagemProcessosClientes[p.id] ?? 0
              return (
                <button
                  key={p.id}
                  onClick={() => setProcessoFiltro(p.id)}
                  className={clsx(
                    "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5",
                    processoFiltro === p.id
                      ? "bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm"
                      : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
                  )}
                >
                  <span>{p.label}</span>
                  <span
                    className={clsx(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                      processoFiltro === p.id
                        ? "bg-brand-500/40 text-brand-200"
                        : "bg-slate-800 text-slate-400"
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

        </div>
      </div>

      {/* Main Table */}
      <div className="bg-dark-card border border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar max-h-[calc(100vh-340px)]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Transportadora Shopee</th>
                <th className="py-3.5 px-4">Processo</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Tempo de Processamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Carregando transportadoras Shopee...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-500" />
                      <span className="font-semibold text-slate-300">Nenhum registro encontrado</span>
                      <span className="text-xs text-slate-500">Tente alterar os filtros ou termo de busca</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Transportadora */}
                    <td className="py-3.5 px-4 font-bold text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {item.transportadora_nome.charAt(0)}
                        </div>
                        <span className="truncate group-hover:text-brand-300 transition-colors">
                          {item.transportadora_nome}
                        </span>
                      </div>
                    </td>

                    {/* Processo */}
                    <td className="py-3.5 px-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-md text-[11px] font-bold border inline-flex items-center gap-1.5",
                        item.processo === 'Last Mile'
                          ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                          : item.processo === 'First Mile'
                          ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                          : item.processo === 'Mobile Hub'
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                      )}>
                        <Layers className="w-3 h-3 opacity-70" />
                        <span>{item.processo}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {item.status === 'FINALIZADO' && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/30 inline-flex items-center gap-1.5 shadow-[0_0_8px_rgba(34,197,94,0.15)]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          <span>Finalizado</span>
                        </span>
                      )}

                      {item.status === 'PROCESSANDO' && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 inline-flex items-center gap-1.5 shadow-[0_0_8px_rgba(249,115,22,0.15)]">
                          <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />
                          <span>Processando</span>
                        </span>
                      )}

                      {item.status === 'NAO_INICIADO' && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 inline-flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                          <span>Não Iniciado</span>
                        </span>
                      )}
                    </td>

                    {/* Tempo de Processamento */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                        <Clock className={clsx(
                          "w-3.5 h-3.5",
                          item.status === 'FINALIZADO' ? "text-green-400" : item.status === 'PROCESSANDO' ? "text-orange-400" : "text-slate-600"
                        )} />
                        <span className={clsx(
                          item.status === 'FINALIZADO'
                            ? "text-slate-200"
                            : item.status === 'PROCESSANDO'
                            ? "text-orange-300"
                            : "text-slate-600"
                        )}>
                          {item.tempo_processamento}
                        </span>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer bar */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Exibindo <strong>{filteredItems.length}</strong> de <strong>{dadosProcessamento.length}</strong> processos da {quinzena}ª Quinzena</span>
          <span className="text-[11px] text-slate-500">
            Última sincronização: {ultimaSincronizacao}
          </span>
        </div>
      </div>

    </div>
  )
}
