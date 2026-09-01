import { useState, useEffect, useMemo } from 'react'
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
  Calendar
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import clsx from 'clsx'

export type ProcessoTipo = 'Last Mile' | 'First Mile' | 'Line Haul'
export type StatusProcessamento = 'FINALIZADO' | 'PROCESSANDO' | 'NAO_INICIADO'

interface TransportadoraShopee {
  id: string
  nome_empresa: string
  tipo: string
  nome_base?: string
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
  { id: 'First Mile', label: 'First Mile' },
  { id: 'Line Haul', label: 'Line Haul' }
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

  const [transportadoras, setTransportadoras] = useState<TransportadoraShopee[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Seed aleatório para atualização do mock
  const [refreshSeed, setRefreshSeed] = useState(1)

  useEffect(() => {
    fetchTransportadorasShopee()
  }, [])

  const fetchTransportadorasShopee = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_empresa, tipo, bases ( nome_base )')
        .eq('tipo', 'SHOPEE')
        .order('nome_empresa', { ascending: true })

      if (error) throw error

      if (data) {
        const formatted: TransportadoraShopee[] = data.map((c: any) => ({
          id: c.id,
          nome_empresa: c.nome_empresa,
          tipo: c.tipo,
          nome_base: c.bases?.[0]?.nome_base || 'dbMantran'
        }))
        setTransportadoras(formatted)
      }
    } catch (err) {
      console.error('Erro ao buscar transportadoras Shopee:', err)
    } finally {
      setLoading(false)
    }
  }

  // Gera dados mockados coerentes baseados nos filtros
  const dadosProcessamento = useMemo(() => {
    if (transportadoras.length === 0) return []

    const items: ItemProcessamento[] = []
    const processosList: ProcessoTipo[] = ['Last Mile', 'First Mile', 'Line Haul']

    transportadoras.forEach((transp, transpIdx) => {
      // Se selecionou uma transportadora específica e não for esta, pula
      if (transportadoraFiltro !== 'TODAS' && transp.id !== transportadoraFiltro) {
        return
      }

      processosList.forEach((proc, procIdx) => {
        // Se filtrou por processo e não for este, pula
        if (processoFiltro !== 'TODOS' && proc !== processoFiltro) {
          return
        }

        // Pseudo-random determinístico com base nos filtros
        const hash = (transpIdx * 17 + procIdx * 31 + parseInt(mes) * 13 + parseInt(quinzena) * 7 + refreshSeed) % 100

        let status: StatusProcessamento = 'FINALIZADO'
        let tempoStr = '00h 00m 00s'
        let segs = 0
        let registros = 0
        let dataInicio = `${ano}-${mes}-${quinzena === '1' ? '05' : '20'} 08:30:00`
        let dataFim = `${ano}-${mes}-${quinzena === '1' ? '05' : '20'} 09:15:24`

        if (hash < 25) {
          status = 'NAO_INICIADO'
          tempoStr = '-'
          segs = 0
          registros = 0
          dataInicio = '-'
          dataFim = '-'
        } else if (hash < 48) {
          status = 'PROCESSANDO'
          segs = (hash * 45) + 300 // entre 5m e 40m
          const m = Math.floor(segs / 60)
          const s = segs % 60
          tempoStr = `00h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
          registros = hash * 120 + 450
          dataFim = 'Em andamento...'
        } else {
          status = 'FINALIZADO'
          segs = (hash * 75) + 600 // entre 10m e 2h
          const h = Math.floor(segs / 3600)
          const m = Math.floor((segs % 3600) / 60)
          const s = segs % 60
          tempoStr = `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
          registros = (hash * 230) + 1200
        }

        items.push({
          id: `${transp.id}_${proc}`,
          transportadora_id: transp.id,
          transportadora_nome: transp.nome_empresa,
          base_nome: transp.nome_base || 'dbMantran',
          processo: proc,
          status,
          tempo_processamento: tempoStr,
          segundos_processamento: segs,
          registros_processados: registros,
          data_inicio: dataInicio,
          data_fim: dataFim
        })
      })
    })

    return items
  }, [transportadoras, quinzena, mes, ano, processoFiltro, transportadoraFiltro, refreshSeed])

  // Filtro de busca por texto e status
  const filteredItems = useMemo(() => {
    return dadosProcessamento.filter(item => {
      const matchSearch = item.transportadora_nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.processo.toLowerCase().includes(searchQuery.toLowerCase())

      const matchStatus = statusFiltro === 'TODOS' || item.status === statusFiltro

      return matchSearch && matchStatus
    })
  }, [dadosProcessamento, searchQuery, statusFiltro])

  // Contadores métricos
  const totalCount = filteredItems.length
  const finalizadosCount = filteredItems.filter(i => i.status === 'FINALIZADO').length
  const processandoCount = filteredItems.filter(i => i.status === 'PROCESSANDO').length
  const naoIniciadosCount = filteredItems.filter(i => i.status === 'NAO_INICIADO').length

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

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setRefreshSeed(prev => prev + 1)
      setIsRefreshing(false)
    }, 500)
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Processamento Shopee</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  4PL / Hubs
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Acompanhe em tempo real o status de fechamento de Last Mile, First Mile e Line Haul por quinzena
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
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

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total */}
        <div className="bg-dark-card border border-slate-800 rounded-xl p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Rotinas</span>
            <div className="text-xl font-black text-white mt-0.5">{totalCount}</div>
            <span className="text-[10px] text-slate-500">
              {quinzena}ª Quinzena • {MESES.find(m => m.valor === mes)?.nome}/{ano}
            </span>
          </div>
        </div>

        {/* Finalizados (Verde) */}
        <div 
          onClick={() => setStatusFiltro(statusFiltro === 'FINALIZADO' ? 'TODOS' : 'FINALIZADO')}
          className={clsx(
            "bg-dark-card border rounded-xl p-4 flex items-center gap-3.5 shadow-lg cursor-pointer transition-all",
            statusFiltro === 'FINALIZADO' 
              ? "border-green-500/50 bg-green-500/5 shadow-[0_0_12px_rgba(34,197,94,0.1)]" 
              : "border-slate-800 hover:border-slate-700"
          )}
        >
          <div className="w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-green-400 uppercase tracking-wider">Finalizado</span>
              <span className="text-[10px] font-bold text-green-400/80">{percentFinalizado}%</span>
            </div>
            <div className="text-xl font-black text-green-300 mt-0.5">{finalizadosCount}</div>
            <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
              <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${percentFinalizado}%` }}></div>
            </div>
          </div>
        </div>

        {/* Processando (Laranja) */}
        <div 
          onClick={() => setStatusFiltro(statusFiltro === 'PROCESSANDO' ? 'TODOS' : 'PROCESSANDO')}
          className={clsx(
            "bg-dark-card border rounded-xl p-4 flex items-center gap-3.5 shadow-lg cursor-pointer transition-all",
            statusFiltro === 'PROCESSANDO' 
              ? "border-orange-500/50 bg-orange-500/5 shadow-[0_0_12px_rgba(249,115,22,0.1)]" 
              : "border-slate-800 hover:border-slate-700"
          )}
        >
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
            <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">Processando</span>
            <div className="text-xl font-black text-orange-300 mt-0.5">{processandoCount}</div>
            <span className="text-[10px] text-orange-400/80">Em execução no momento</span>
          </div>
        </div>

        {/* Não Iniciado (Vermelho) */}
        <div 
          onClick={() => setStatusFiltro(statusFiltro === 'NAO_INICIADO' ? 'TODOS' : 'NAO_INICIADO')}
          className={clsx(
            "bg-dark-card border rounded-xl p-4 flex items-center gap-3.5 shadow-lg cursor-pointer transition-all",
            statusFiltro === 'NAO_INICIADO' 
              ? "border-red-500/50 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.1)]" 
              : "border-slate-800 hover:border-slate-700"
          )}
        >
          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Não Iniciado</span>
            <div className="text-xl font-black text-red-300 mt-0.5">{naoIniciadosCount}</div>
            <span className="text-[10px] text-red-400/80">Aguardando disparo</span>
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
              {PROCESSOS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
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
              <option value="TODAS">Todas as Transportadoras ({transportadoras.length})</option>
              {transportadoras.map(t => (
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
            {PROCESSOS.map(p => (
              <button
                key={p.id}
                onClick={() => setProcessoFiltro(p.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 border",
                  processoFiltro === p.id
                    ? "bg-brand-500/20 text-brand-300 border-brand-500/40 shadow-sm"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
                )}
              >
                {p.label}
              </button>
            ))}
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
          <span>Exibindo <strong>{filteredItems.length}</strong> de <strong>{dadosProcessamento.length}</strong> rotinas da {quinzena}ª Quinzena</span>
          <span className="text-[11px] text-slate-500">
            Última sincronização: {new Date().toLocaleTimeString('pt-BR')}
          </span>
        </div>
      </div>

    </div>
  )
}
