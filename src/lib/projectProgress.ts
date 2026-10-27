// Utilitário para cálculo de progresso consistente entre Bases, Dashboard e ProjetoDetalhes

export const parsePipeValues = (
  val: string | undefined | null,
  targetLength: number = 1,
  isStatus: boolean = false
): string[] => {
  if (!val) {
    return Array.from({ length: Math.max(1, targetLength) }, () => '')
  }
  const parts = val.split('|').map(s => s.trim())

  // Se for uma coluna de status e havia apenas 1 valor definido (ex: 'OK' ou 'PENDENTE') e a base tem múltiplas agências,
  // repete o mesmo status para as demais agências
  if (isStatus && parts.length === 1 && targetLength > 1 && parts[0] !== '') {
    return Array.from({ length: targetLength }, () => parts[0])
  }

  while (parts.length < targetLength) {
    parts.push('')
  }
  return parts
}

export const getBaseItemCount = (baseId: string, colunas: any[], dadosMap: Record<string, string>): number => {
  let max = 1
  colunas.forEach(col => {
    // JSON é valor único por base (pode conter '|' no conteúdo) — não conta como agências
    if (col.tipo?.toUpperCase() === 'JSON') return
    const val = dadosMap[`${baseId}_${col.id}`]
    if (val && val.includes('|')) {
      const count = val.split('|').map(s => s.trim()).filter(Boolean).length
      if (count > max) max = count
    }
  })
  return max
}

export const getSubValor = (
  baseId: string,
  colunaId: string,
  subIndex: number,
  colunas: any[],
  dadosMap: Record<string, string>
): string => {
  const raw = dadosMap[`${baseId}_${colunaId}`] || ''
  const col = colunas.find(c => c.id === colunaId)
  const tipoUp = col?.tipo?.toUpperCase()
  if (tipoUp === 'JSON') return subIndex === 0 ? raw : ''
  const totalItems = getBaseItemCount(baseId, colunas, dadosMap)
  const isStatus = tipoUp === 'STATUS' || tipoUp === 'STATUS_SN'
  const arr = parsePipeValues(raw, totalItems, isStatus)
  return arr[subIndex] || ''
}

export function calcularProgressoProjeto(
  allCols: any[],
  bases: { base_id?: string; id?: string }[],
  dadosMap: Record<string, string>
): number {
  if (bases.length === 0 || allCols.length === 0) return 0
  const indicadores = allCols.filter(c => c.indicador_conclusao)
  if (indicadores.length === 0) return 0

  let totalSubItens = 0
  let concluidos = 0

  bases.forEach(base => {
    const baseId = base.base_id || base.id || ''
    if (!baseId) return
    const itemCount = getBaseItemCount(baseId, allCols, dadosMap)
    for (let i = 0; i < itemCount; i++) {
      totalSubItens++
      let isItemDone = true
      indicadores.forEach(ind => {
        const val = getSubValor(baseId, ind.id, i, allCols, dadosMap)
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
