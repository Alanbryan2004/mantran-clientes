import { Link } from 'react-router-dom'
import { Wrench, MapPin, FileSpreadsheet, FileStack, ArrowRight } from 'lucide-react'
import { permissionsApi } from '../lib/permissions'

// ============================================================
// Utilitários — tela-índice para funcionários.
// Reúne as ferramentas que saíram da barra lateral (Cidades, Separador e Juntar Planilhas).
// Cada card só aparece se o perfil tem acesso à tela correspondente.
// ============================================================
const UTILITARIOS = [
  {
    path: '/cidades',
    titulo: 'Cidades',
    descricao: 'Consulta de municípios, faixas de CEP e códigos IBGE.',
    icone: MapPin
  },
  {
    path: '/separador-planilhas',
    titulo: 'Separador de Planilhas',
    descricao: 'Validação e divisão de planilhas de pré-fatura Shopee por operação.',
    icone: FileSpreadsheet
  },
  {
    path: '/juntar-planilhas',
    titulo: 'Juntar Planilhas',
    descricao: 'Unificação e conferência de planilhas Shopee 4PL por operação.',
    icone: FileStack
  }
]

export function Utilitarios() {
  const disponiveis = UTILITARIOS.filter(u => permissionsApi.canAccessRoute(u.path))

  return (
    <div className="w-full flex flex-col gap-6 text-slate-800">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 shrink-0">
          <Wrench className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Utilitários</h1>
          <p className="text-[11px] sm:text-xs text-slate-500">Escolha a ferramenta que deseja usar</p>
        </div>
      </div>

      {disponiveis.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-500 shadow-sm">
          Nenhum utilitário disponível para o seu perfil.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {disponiveis.map(u => {
            const Icone = u.icone
            return (
              <Link
                key={u.path}
                to={u.path}
                className="group bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all flex flex-col gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 group-hover:scale-105 transition-transform">
                  <Icone className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-black text-slate-900 group-hover:text-brand-600 transition-colors">{u.titulo}</h2>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{u.descricao}</p>
                </div>
                <span className="text-xs font-bold text-brand-600 flex items-center gap-1.5">
                  Abrir <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
