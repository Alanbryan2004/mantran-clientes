// Formatação de telefone brasileiro (fixo e celular).
// Funciona tanto na digitação (entrada parcial) quanto na exibição de valores
// já cadastrados. Mantém até 11 dígitos:
//   10 dígitos -> (11) 2345-6789   (fixo)
//   11 dígitos -> (11) 91234-5678  (celular)

export function formatTelefone(valor: string | null | undefined): string {
  const d = (valor ?? '').toString().replace(/\D/g, '').slice(0, 11)
  if (!d) return ''

  if (d.length <= 2) {
    return `(${d}`
  }
  if (d.length <= 6) {
    // (11) 2345
    return `(${d.slice(0, 2)}) ${d.slice(2)}`
  }
  if (d.length <= 10) {
    // fixo: (11) 2345-6789 (vai preenchendo)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  // celular: (11) 91234-5678
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Retorna somente os dígitos (útil para salvar "cru" no banco, se desejado).
export function soDigitosTelefone(valor: string | null | undefined): string {
  return (valor ?? '').toString().replace(/\D/g, '').slice(0, 11)
}
