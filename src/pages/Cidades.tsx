import { useState, useMemo, useEffect } from 'react'
import { 
  Search, 
  X, 
  Copy, 
  Check, 
  Building2, 
  Layers, 
  ChevronRight,
  Filter,
  Map as MapIcon
} from 'lucide-react'
import { RAW, IBGE, UFR, UFN } from '../data/cidadesData'
import clsx from 'clsx'

// Normaliza texto removendo acentos e pontuação para busca rápida
function norm(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

// Formata número de CEP (ex: 14140000 -> "14140-000")
function fmtCep(n: number | string): string {
  const s = String(n).padStart(8, '0')
  return s.slice(0, 5) + '-' + s.slice(5)
}

export interface CidadeItem {
  name: string
  uf: string
  key: string
  ibge: number | string
  ranges: [number, number][]
}

export function Cidades() {
  const [query, setQuery] = useState('')
  const [selectedUf, setSelectedUf] = useState('')
  const [shownCount, setShownCount] = useState(60)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // 1. Processa municípios a partir dos dados brutos agrupando faixas por cidade
  const { cidades, spanUf, countUf, ufsList } = useMemo(() => {
    const cityMap = new Map<string, CidadeItem>()
    for (const [name, uf, a, b] of RAW) {
      const k = uf + '|' + name
      if (!cityMap.has(k)) {
        cityMap.set(k, {
          name,
          uf,
          key: norm(name),
          ibge: IBGE[k] || '',
          ranges: []
        })
      }
      cityMap.get(k)!.ranges.push([a, b])
    }

    const cList = Array.from(cityMap.values()).sort(
      (x, y) => x.key.localeCompare(y.key) || x.uf.localeCompare(y.uf)
    )

    const span: Record<string, [number, number]> = {}
    const count: Record<string, number> = {}

    for (const uf in UFR) {
      const r = UFR[uf]
      span[uf] = [Math.min(...r.map(x => x[0])), Math.max(...r.map(x => x[1]))]
      count[uf] = 0
    }

    for (const c of cList) {
      if (count[c.uf] !== undefined) count[c.uf]++
    }

    const ufs = Object.keys(UFN).sort((a, b) => UFN[a].localeCompare(UFN[b]))

    return { cidades: cList, spanUf: span, countUf: count, ufsList: ufs }
  }, [])

  // Copia texto com feedback visual
  const copyText = async (text: string, id: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1800)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  // Reseta a paginação ao mudar a busca ou UF
  useEffect(() => {
    setShownCount(60)
  }, [query, selectedUf])

  // Identifica o modo de busca: 'home', 'cep', 'ibge' ou 'text'
  const searchResult = useMemo(() => {
    const raw = query.trim()
    const uf = selectedUf
    const hasLetters = /[a-zA-ZÀ-ÿ]/.test(raw)
    const digits = raw.replace(/\D/g, '')

    // Se não há pesquisa e nem UF selecionada -> Tela Inicial (Home com Cards de Estados)
    if (!raw && !uf) {
      return {
        mode: 'home' as const,
        items: [] as CidadeItem[],
        status: `5.570 municípios em 27 unidades da federação. Escolha um estado ou digite para consultar.`,
        pinCep: null as number | null
      }
    }

    // Busca por dígitos (CEP ou IBGE)
    if (!hasLetters && digits.length > 0) {
      const d = digits.slice(0, 8)

      // 7 dígitos numéricos: Pode ser código IBGE exato!
      if (d.length === 7) {
        const hit = cidades.find(c => String(c.ibge) === d && (!uf || c.uf === uf))
        if (hit) {
          return {
            mode: 'ibge' as const,
            items: [hit],
            status: `Código IBGE ${d} identificado: ${hit.name} (${hit.uf}).`,
            pinCep: null
          }
        }
      }

      // CEP de 8 dígitos ou busca parcial de CEP
      let lo: number
      let hi: number
      let pin: number | null = null

      if (d.length === 8) {
        lo = hi = +d
        pin = +d
      } else {
        lo = +(d.padEnd(8, '0'))
        hi = +(d.padEnd(8, '9'))
      }

      const res: (CidadeItem & { w: number; s: number })[] = []
      for (const c of cidades) {
        if (uf && c.uf !== uf) continue
        const rs = c.ranges.filter(([a, b]) => a <= hi && b >= lo)
        if (rs.length > 0) {
          res.push({
            ...c,
            ranges: rs,
            w: Math.min(...rs.map(([a, b]) => b - a)),
            s: Math.min(...rs.map(r => r[0]))
          })
        }
      }

      res.sort(d.length === 8 ? (x, y) => x.w - y.w : (x, y) => x.s - y.s)

      const ufHit = Object.keys(UFR).find(k => UFR[k].some(([a, b]) => a <= hi && b >= lo))

      let msg = ''
      if (d.length === 8) {
        if (res.length > 0) {
          msg = `CEP ${fmtCep(+d)} pertence a ${res[0].name} (${res[0].uf})${res.length > 1 ? ` (também abrangido em outras ${res.length - 1} faixas).` : '.'}`
        } else {
          msg = `CEP ${fmtCep(+d)}${ufHit ? ` está na faixa estadual de ${UFN[ufHit]}, mas sem município específico.` : ' não foi encontrado em nenhuma faixa conhecida.'}`
        }
      } else {
        msg = `${res.length} ${res.length === 1 ? 'município tem' : 'municípios têm'} CEP iniciando com ${d}. Digite os 8 números para localização exata.`
      }

      return {
        mode: 'cep' as const,
        items: res,
        status: msg,
        pinCep: pin
      }
    }

    // Busca por Texto (Nome do Município)
    const nq = norm(raw)
    let res = cidades.filter(c => (!uf || c.uf === uf) && (!nq || c.key.includes(nq)))

    if (nq) {
      res.sort((a, b) => {
        const scoreA = a.key === nq ? 0 : a.key.startsWith(nq) ? 1 : 2
        const scoreB = b.key === nq ? 0 : b.key.startsWith(nq) ? 1 : 2
        return scoreA - scoreB
      })
    }

    let statusMsg = `${res.length.toLocaleString('pt-BR')} ${res.length === 1 ? 'município encontrado' : 'municípios encontrados'}`
    if (uf) statusMsg += ` em ${UFN[uf]}`
    if (nq) statusMsg += ` com "${raw}" no nome`

    return {
      mode: 'text' as const,
      items: res,
      status: statusMsg,
      pinCep: null
    }
  }, [cidades, query, selectedUf])

  const ufsOrdenadosPorCep = useMemo(() => {
    return Object.keys(UFR).sort((a, b) => (spanUf[a]?.[0] || 0) - (spanUf[b]?.[0] || 0))
  }, [spanUf])

  const currentItems = searchResult.items
  const visibleItems = currentItems.slice(0, shownCount)

  // Renderiza o destaque do termo no nome da cidade
  const renderHighlightedName = (name: string) => {
    if (searchResult.mode !== 'text' || !query.trim()) return name
    const nq = norm(query)
    if (!nq) return name

    const chars = [...name]
    let n = ''
    const map: number[] = []

    chars.forEach((ch, i) => {
      const c = norm(ch) || (ch === ' ' ? ' ' : '')
      for (const _ of c) {
        n += _
        map.push(i)
      }
    })

    const idx = n.indexOf(nq)
    if (idx < 0) return name

    const s = map[idx]
    const e = map[idx + nq.length - 1] + 1

    return (
      <>
        {chars.slice(0, s).join('')}
        <span className="text-brand-700 font-black bg-brand-50 border border-brand-200/80 px-1 rounded">
          {chars.slice(s, e).join('')}
        </span>
        {chars.slice(e).join('')}
      </>
    )
  }

  return (
    <div className="max-w-none w-full min-w-0 bg-slate-50 rounded-2xl p-4 sm:p-6 min-h-full space-y-5">
      {/* Cabeçalho Institucional - Padrão FAQ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="h-10 sm:h-11 px-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center shrink-0">
            <img 
              src="/Logo_Mantran.png" 
              alt="Mantran" 
              className="h-6 sm:h-7 w-auto object-contain select-none"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Cidades & Faixas de CEP
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700">
                IBGE & Correios Brasil
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Consulta rápida e instantânea de faixas de CEP e códigos IBGE de todos os municípios do Brasil.
            </p>
          </div>
        </div>

        {/* Badges de Totais */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex items-center gap-2 shadow-2xs">
            <Building2 className="w-4 h-4 text-brand-600" />
            <span><strong className="text-slate-900 font-bold">5.570</strong> Cidades</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex items-center gap-2 shadow-2xs">
            <MapIcon className="w-4 h-4 text-blue-600" />
            <span><strong className="text-slate-900 font-bold">27</strong> Estados</span>
          </div>
        </div>
      </div>

      {/* Caixa de Busca e Filtros - Estilo FAQ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch gap-3">
          {/* Campo de Busca Texto / CEP / IBGE */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Digite o nome da cidade (ex: Cravinhos), CEP (ex: 14140-000) ou Código IBGE (ex: 3513108)..."
              className="w-full pl-10 pr-9 py-2.5 text-sm sm:text-base bg-slate-50 border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all shadow-2xs"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Select de Estado (UF) */}
          <div className="relative md:w-64 shrink-0">
            <select
              value={selectedUf}
              onChange={e => setSelectedUf(e.target.value)}
              className="w-full pl-3.5 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all cursor-pointer appearance-none shadow-2xs"
            >
              <option value="">Todos os Estados (27)</option>
              {ufsList.map(uf => (
                <option key={uf} value={uf}>
                  {UFN[uf]} ({uf})
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <Filter className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Mensagem de Status da Busca */}
        <div className="mt-3.5 flex items-center justify-between gap-3 text-xs sm:text-sm text-slate-600 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="truncate">{searchResult.status}</span>
          </div>
          {(query || selectedUf) && (
            <button
              onClick={() => { setQuery(''); setSelectedUf(''); }}
              className="text-xs text-brand-600 hover:text-brand-700 font-bold hover:underline shrink-0 cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Banner de Estado Selecionado */}
      {selectedUf && (
        <div className="bg-white border border-brand-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 font-black text-xl flex items-center justify-center shrink-0">
              {selectedUf}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                {UFN[selectedUf]}
                <span className="text-xs font-normal text-slate-500">({countUf[selectedUf]} municípios)</span>
              </h2>
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                Faixa Geral do Estado: {UFR[selectedUf]?.map(([a, b]) => `${fmtCep(a)} a ${fmtCep(b)}`).join('  e  ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedUf('')}
            className="py-1.5 px-3 flex items-center gap-1.5 text-xs font-bold rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900 shadow-2xs self-start sm:self-auto transition-colors cursor-pointer"
          >
            Ver todos os estados
          </button>
        </div>
      )}

      {/* Visão Inicial (Home): Grade de 27 Estados */}
      {searchResult.mode === 'home' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-600" />
              <span>Faixas de CEP por Estado</span>
            </h2>
            <span className="text-xs text-slate-500">Ordenado por faixa inicial de CEP</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {ufsOrdenadosPorCep.map(uf => {
              const ranges = UFR[uf] || []
              return (
                <button
                  key={uf}
                  type="button"
                  onClick={() => setSelectedUf(uf)}
                  className="bg-white border border-slate-200 hover:border-brand-400 hover:shadow-md rounded-xl p-3.5 text-left transition-all group flex flex-col justify-between shadow-2xs cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg font-black text-slate-900 group-hover:text-brand-600 transition-colors">
                        {uf}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="text-xs font-bold text-slate-700 truncate" title={UFN[uf]}>
                      {UFN[uf]}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <div className="text-[11px] font-mono text-slate-600 leading-tight">
                      {ranges.map(([a, b], idx) => (
                        <div key={idx} className="truncate">
                          {fmtCep(a)} a {fmtCep(b)}
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1.5 font-medium">
                      {countUf[uf]} municípios
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Resultados da Pesquisa */}
      {searchResult.mode !== 'home' && (
        <div className="space-y-4">
          {visibleItems.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Nenhum município encontrado</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {searchResult.mode === 'cep'
                  ? 'Verifique os dígitos digitados. Um CEP completo possui 8 números, ex: 14140-000.'
                  : 'Tente buscar com apenas parte do nome, sem acentos, ou escolha "Todos os Estados".'}
              </p>
              <button
                type="button"
                onClick={() => { setQuery(''); setSelectedUf(''); }}
                className="mt-5 py-2 px-4 text-xs font-bold rounded-xl bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 hover:border-brand-300 shadow-sm transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                Ver todos os estados
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((cidade, index) => {
                const ufSpan = spanUf[cidade.uf] || [0, 1]
                const spanTotal = ufSpan[1] - ufSpan[0] || 1
                const copyIbgeKey = `ibge-${cidade.uf}-${cidade.name}`

                return (
                  <div
                    key={`${cidade.uf}-${cidade.name}-${index}`}
                    className="bg-white border border-slate-200 hover:border-brand-300 rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    {/* Dados Principais: Nome, UF e Código IBGE */}
                    <div className="min-w-0 md:w-1/3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                          {renderHighlightedName(cidade.name)}
                        </h3>
                        <span 
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-50 border border-brand-200 text-brand-700 shrink-0"
                          title={UFN[cidade.uf]}
                        >
                          {cidade.uf}
                        </span>
                      </div>

                      {/* Código IBGE */}
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <span>Código IBGE:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {cidade.ibge || 'Não cadastrado'}
                        </span>
                        {cidade.ibge && (
                          <button
                            type="button"
                            onClick={() => copyText(String(cidade.ibge), copyIbgeKey)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Copiar código IBGE"
                          >
                            {copiedId === copyIbgeKey ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Faixas de CEP e Barra Visual de Espectro */}
                    <div className="flex-1 space-y-2">
                      {cidade.ranges.map(([a, b], rIdx) => {
                        const copyRangeKey = `cep-${cidade.uf}-${cidade.name}-${rIdx}`
                        const L = Math.max(0, Math.min(100, ((a - ufSpan[0]) / spanTotal) * 100))
                        const W = Math.max(2, Math.min(100 - L, ((b - a) / spanTotal) * 100))
                        const cepText = `${fmtCep(a)} a ${fmtCep(b)}`
                        const hasPin = searchResult.pinCep != null && searchResult.pinCep >= a && searchResult.pinCep <= b
                        const pinPos = hasPin ? ((searchResult.pinCep! - ufSpan[0]) / spanTotal) * 100 : null

                        return (
                          <div
                            key={rIdx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-mono font-bold text-slate-800 whitespace-nowrap">
                                {fmtCep(a)} <span className="text-slate-400 font-normal">a</span> {fmtCep(b)}
                              </span>
                            </div>

                            {/* Barra de Espectro dentro do Estado */}
                            <div className="flex-1 mx-2 sm:mx-4 hidden sm:block relative">
                              <div 
                                className="h-2 bg-slate-200 rounded-full overflow-hidden relative"
                                title={`Posição da faixa dentro do estado de ${UFN[cidade.uf]}`}
                              >
                                <div
                                  className="h-full bg-brand-500 rounded-full"
                                  style={{ marginLeft: `${L}%`, width: `${W}%` }}
                                />
                              </div>
                              {hasPin && pinPos != null && (
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-4 bg-amber-500 border border-white rounded-xs shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                                  style={{ left: `${pinPos}%` }}
                                  title={`CEP pesquisado: ${fmtCep(searchResult.pinCep!)}`}
                                />
                              )}
                            </div>

                            {/* Botão Copiar Faixa */}
                            <button
                              type="button"
                              onClick={() => copyText(cepText, copyRangeKey)}
                              className={clsx(
                                "py-1 px-2.5 flex items-center gap-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs self-end sm:self-auto",
                                copiedId === copyRangeKey
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs"
                                  : "bg-white border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 hover:bg-slate-50"
                              )}
                              title="Copiar faixa de CEP"
                            >
                              {copiedId === copyRangeKey ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Botão Carregar Mais */}
              {currentItems.length > shownCount && (
                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={() => setShownCount(prev => prev + 60)}
                    className="py-2.5 px-6 text-sm font-bold rounded-xl bg-white border border-slate-300 text-slate-700 hover:border-brand-400 hover:text-brand-600 hover:bg-slate-50 shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Mostrar mais {Math.min(60, currentItems.length - shownCount)} municípios</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({currentItems.length - countShown(shownCount, currentItems.length)} restantes)
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rodapé institucional com marca d'água igual FAQ */}
      <div className="mt-12 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <img src="/Logo_Mantran.png" alt="Mantran" className="h-3.5 w-auto object-contain opacity-50 grayscale" />
          <span>Consulta de Cidades, Faixas de CEP e IBGE — Base Mantran</span>
        </div>
        <span>Dados oficiais IBGE e Correios Brasil</span>
      </div>
    </div>
  )
}

function countShown(shown: number, total: number) {
  return Math.min(shown, total)
}
