// Valores múltiplos por "pipe" nas colunas do Projeto (uma base pode ter várias agências).
// O valor é gravado como "a | b | c": cada agência é uma parte separada por " | ".

// Separa o valor nas suas partes SEM apagar os espaços que a pessoa digitou.
// O separador gravado tem um espaço de cada lado (" | "); só esses espaços do separador são retirados.
// Antes, cada parte levava .trim(): ao digitar um espaço no fim ("Na ") ele era gravado e relido
// já sem o espaço, então era impossível digitar espaço entre as palavras.
export function dividirPorPipe(val: string): string[] {
  const partes = val.split('|')
  const ultimo = partes.length - 1
  return partes.map((p, i) => {
    let s = p
    if (i > 0 && s.startsWith(' ')) s = s.slice(1)        // espaço que vem depois do separador anterior
    if (i < ultimo && s.endsWith(' ')) s = s.slice(0, -1) // espaço que vem antes do próximo separador
    return s
  })
}

export const parsePipeValues = (val: string | undefined | null, targetLength: number = 1, isStatus: boolean = false): string[] => {
  if (!val) {
    return Array.from({ length: Math.max(1, targetLength) }, () => '')
  }
  // Colunas de status são listas fixas (sem digitação livre): continuam sem espaços nas pontas
  const parts = dividirPorPipe(val).map(s => (isStatus ? s.trim() : s))

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
