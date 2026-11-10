// Utilitários de CNPJ para formulários.

// Aplica a máscara 00.000.000/0000-00 enquanto a pessoa digita.
export function formatarCnpj(valor: string): string {
  const d = (valor || '').replace(/\D/g, '').slice(0, 14)
  let out = d
  if (d.length > 2) out = `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length > 5) out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length > 8) out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  if (d.length > 12) out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  return out
}

// Confere os dígitos verificadores do CNPJ.
export function cnpjValido(valor: string): boolean {
  const c = (valor || '').replace(/\D/g, '')
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  const dv = (n: number) => {
    let soma = 0
    let peso = n - 7
    for (let i = 0; i < n; i++) {
      soma += Number(c[i]) * peso--
      if (peso < 2) peso = 9
    }
    const r = soma % 11
    return r < 2 ? 0 : 11 - r
  }
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13])
}
