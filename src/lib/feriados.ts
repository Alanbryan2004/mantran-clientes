// Utilitário de feriados nacionais e verificação de dia útil.
// Cálculo local (sem depender de rede/API) — inclui feriados fixos e móveis
// derivados da Páscoa (Carnaval, Sexta-feira Santa, Corpus Christi).

// Calcula o Domingo de Páscoa de um ano (algoritmo de Meeus/Butcher).
function calcularPascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31) // 3 = março, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, mes - 1, dia)
}

function toISODate(d: Date): string {
  const ano = d.getFullYear()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function addDias(d: Date, dias: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + dias)
  return r
}

export interface Feriado {
  data: string // YYYY-MM-DD
  nome: string
}

// Retorna os feriados nacionais brasileiros de um ano (fixos + móveis).
export function getFeriadosNacionais(ano: number): Feriado[] {
  const pascoa = calcularPascoa(ano)

  const feriados: Feriado[] = [
    { data: `${ano}-01-01`, nome: 'Confraternização Universal' },
    { data: `${ano}-04-21`, nome: 'Tiradentes' },
    { data: `${ano}-05-01`, nome: 'Dia do Trabalho' },
    { data: `${ano}-09-07`, nome: 'Independência do Brasil' },
    { data: `${ano}-10-12`, nome: 'Nossa Senhora Aparecida' },
    { data: `${ano}-11-02`, nome: 'Finados' },
    { data: `${ano}-11-15`, nome: 'Proclamação da República' },
    { data: `${ano}-11-20`, nome: 'Consciência Negra' },
    { data: `${ano}-12-25`, nome: 'Natal' },
    // Móveis (relativos à Páscoa)
    { data: toISODate(addDias(pascoa, -47)), nome: 'Carnaval' },
    { data: toISODate(addDias(pascoa, -2)), nome: 'Sexta-feira Santa' },
    { data: toISODate(addDias(pascoa, 60)), nome: 'Corpus Christi' },
  ]

  return feriados
}

// Se a data (padrão: hoje) é feriado nacional, retorna o feriado; senão null.
export function getFeriado(data: Date = new Date()): Feriado | null {
  const iso = toISODate(data)
  const feriados = getFeriadosNacionais(data.getFullYear())
  return feriados.find(f => f.data === iso) || null
}

// True se a data cai em sábado (6) ou domingo (0).
export function isFimDeSemana(data: Date = new Date()): boolean {
  const dia = data.getDay()
  return dia === 0 || dia === 6
}

export type MotivoNaoUtil = 'sabado' | 'domingo' | 'feriado' | null

// Retorna o motivo pelo qual a data não é dia útil, ou null se for dia útil.
export function getMotivoNaoUtil(data: Date = new Date()): { motivo: MotivoNaoUtil; feriado?: Feriado } {
  const dia = data.getDay()
  if (dia === 6) return { motivo: 'sabado' }
  if (dia === 0) return { motivo: 'domingo' }
  const feriado = getFeriado(data)
  if (feriado) return { motivo: 'feriado', feriado }
  return { motivo: null }
}

// True se a data é um dia útil (não é fim de semana nem feriado nacional).
export function isDiaUtil(data: Date = new Date()): boolean {
  return getMotivoNaoUtil(data).motivo === null
}
