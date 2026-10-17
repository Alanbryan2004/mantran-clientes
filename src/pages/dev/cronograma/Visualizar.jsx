import { useState, useEffect, useMemo } from "react";
import AppShell from "../components/AppShell";
import { apiGet, rpc } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { AlertCircle, CheckCircle2, XCircle, Clock, HelpCircle, Calendar } from "lucide-react";

function formatarHHMM(horasDecimais) {
    if (!horasDecimais) return "0h 0m";
    const h = Math.floor(horasDecimais);
    const m = Math.round((horasDecimais - h) * 60);
    return `${h}h ${m}m`;
}

export default function Visualizar() {
    const { user } = useAuth();
    
    const [lista, setLista] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [apontamentos, setApontamentos] = useState([]);
    const [cenariosQa, setCenariosQa] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tooltipContent, setTooltipContent] = useState(null);
    const [filtroTecnico, setFiltroTecnico] = useState("");

    async function carregar() {
        try {
            setLoading(true);
            const [dataCronograma, dataTecnicos, dataApontamentos, dataCenarios] = await Promise.all([
                apiGet("/rest/v1/cronograma?select=*,controle_api(tela,nome_tabela,tipo_tabela,status_api,status_teste,status_documentacao)&order=inicio.asc,termino.asc").catch(() => []),
                apiGet("/rest/v1/usuario?select=id,nome").catch(() => []),
                apiGet("/rest/v1/apontamento_tempo?select=controle_api_id,inicio,fim").catch(() => []),
                apiGet("/rest/v1/qa_cenarios?select=*").catch(() => [])
            ]);

            const filteredData = (dataCronograma || []).filter(item => item.controle_api?.tipo_tabela !== "Arquitetura");
            
            // AUTO-CURA: Se a tarefa está finalizada mas o relógio ficou aberto (aconteceu antes da atualização)
            const apontamentosAtuais = dataApontamentos || [];
            let precisaRecarregar = false;

            for (const item of filteredData) {
                const isFinished = item.controle_api?.status_api === "Finalizado" && 
                                   item.controle_api?.status_teste === "Finalizado" && 
                                   item.controle_api?.status_documentacao === "Finalizado";
                if (isFinished) {
                    const abertos = apontamentosAtuais.filter(a => a.controle_api_id === item.controle_api_id && !a.fim);
                    if (abertos.length > 0) {
                        try {
                            await rpc("finalizar_trabalho", {
                                p_controle_api_id: item.controle_api_id,
                                p_tecnico_id: item.tecnico_id
                            });
                            precisaRecarregar = true;
                        } catch (e) {
                            console.error("Erro ao auto-finalizar", e);
                        }
                    }
                }
            }

            if (precisaRecarregar) {
                const novosApontamentos = await apiGet("/rest/v1/apontamento_tempo?select=controle_api_id,inicio,fim");
                setApontamentos(novosApontamentos || []);
            } else {
                setApontamentos(apontamentosAtuais);
            }

            setLista(filteredData);
            setTecnicos(dataTecnicos || []);
            setCenariosQa(dataCenarios || []);
        } catch (err) {
            console.error("Erro ao carregar dados", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        carregar();
    }, [user?.id]);

    const getNomeTecnico = (id) => {
        const tec = tecnicos.find(t => t.id === id);
        return tec ? tec.nome : "Desconhecido";
    };

    const getQaStatus = (item) => {
        const tela = (item.controle_api?.tela || "").trim();
        const nomeTabela = (item.controle_api?.nome_tabela || "").trim();

        const cenarios = (cenariosQa || []).filter((c) => {
            if (!c.tela) return false;
            const cTela = c.tela.trim().toLowerCase();
            return (
                (tela && cTela === tela.toLowerCase()) ||
                (nomeTabela && cTela === nomeTabela.toLowerCase())
            );
        });

        if (cenarios.length === 0) {
            return {
                status: "SEM_CENARIOS",
                label: "Sem cenários cadastrados no QA",
                cor: "#9ca3af",
                bg: "#f3f4f6",
                Icon: HelpCircle
            };
        }

        const erros = cenarios.filter((c) => c.status === "ERRO");
        if (erros.length > 0) {
            return {
                status: "REPROVADO",
                label: `Reprovada no QA (${erros.length} erro${erros.length > 1 ? "s" : ""})`,
                cor: "#dc2626",
                bg: "#fee2e2",
                Icon: XCircle
            };
        }

        const todosOk = cenarios.every((c) => c.status === "OK");
        if (todosOk) {
            return {
                status: "APROVADO",
                label: `Aprovada no QA (100% OK - ${cenarios.length} cenário${cenarios.length > 1 ? "s" : ""})`,
                cor: "#16a34a",
                bg: "#dcfce7",
                Icon: CheckCircle2
            };
        }

        const totalOk = cenarios.filter((c) => c.status === "OK").length;
        const totalPend = cenarios.filter((c) => c.status === "PENDENTE").length;
        return {
            status: "PENDENTE",
            label: `Pendente / Em Teste (${totalOk} OK, ${totalPend} pendente${totalPend > 1 ? "s" : ""})`,
            cor: "#2563eb",
            bg: "#dbeafe",
            Icon: Clock
        };
    };

    const calcularHorasTrabalhadas = (controleApiId) => {
        const ap = apontamentos.filter(a => a.controle_api_id === controleApiId);
        let totalTime = 0;
        const now = Date.now();
        
        for (const a of ap) {
            const start = new Date(a.inicio).getTime();
            const end = a.fim ? new Date(a.fim).getTime() : now;
            totalTime += (end - start);
        }
        
        return totalTime / 1000 / 3600; // Em horas
    };

    const exibirTooltip = (item, e) => {
        if (!item.justificativa && !item.termino_original) return;
        
        setTooltipContent({
            termino_original: item.termino_original,
            justificativa: item.justificativa,
            x: e.clientX,
            y: e.clientY
        });
    };

    const ocultarTooltip = () => {
        setTooltipContent(null);
    };

    const listaFiltrada = (filtroTecnico 
        ? lista.filter(item => item.tecnico_id === filtroTecnico)
        : [...lista]
    ).sort((a, b) => {
        const isFinishedA = a.controle_api?.status_api === "Finalizado" && 
                            a.controle_api?.status_teste === "Finalizado" && 
                            a.controle_api?.status_documentacao === "Finalizado";
        const isFinishedB = b.controle_api?.status_api === "Finalizado" && 
                            b.controle_api?.status_teste === "Finalizado" && 
                            b.controle_api?.status_documentacao === "Finalizado";

        if (isFinishedA && !isFinishedB) return -1;
        if (!isFinishedA && isFinishedB) return 1;

        // Se não estão finalizados, verificamos se estão em andamento
        const horasA = calcularHorasTrabalhadas(a.controle_api_id);
        const horasB = calcularHorasTrabalhadas(b.controle_api_id);

        const emAndamentoA = a.controle_api?.status_api === "Trabalhando" || horasA > 0;
        const emAndamentoB = b.controle_api?.status_api === "Trabalhando" || horasB > 0;

        if (emAndamentoA && !emAndamentoB) return -1;
        if (!emAndamentoA && emAndamentoB) return 1;
        
        // Se ambos estão em andamento, desempata colocando quem tem MAIS horas primeiro
        if (emAndamentoA && emAndamentoB && horasA !== horasB) {
            return horasB - horasA;
        }

        return new Date(a.inicio).getTime() - new Date(b.inicio).getTime();
    });

    const dataFinalProjeto = listaFiltrada.length > 0 
        ? new Date(Math.max(...listaFiltrada.map(i => new Date(i.termino).getTime())))
        : null;

    let totalCargaHoraria = 0;
    let totalHorasTrabalhadas = 0;

    listaFiltrada.forEach(item => {
        const isFinished = item.controle_api?.status_api === "Finalizado" && 
                           item.controle_api?.status_teste === "Finalizado" && 
                           item.controle_api?.status_documentacao === "Finalizado";
                           
        const horasTrab = calcularHorasTrabalhadas(item.controle_api_id);
        const cargaOriginal = Number(item.carga_horaria) || 0;
        
        // Se finalizou, a carga real daquela tarefa foi o tempo efetivo que levou
        const cargaConsiderada = isFinished ? horasTrab : cargaOriginal;

        totalCargaHoraria += cargaConsiderada;
        totalHorasTrabalhadas += Math.min(horasTrab, cargaConsiderada);
    });

    const percentualTotal = totalCargaHoraria > 0 ? (totalHorasTrabalhadas / totalCargaHoraria) * 100 : 0;

    const tecnicosFiltro = useMemo(() => {
        const idsPresentes = new Set(lista.map(item => item.tecnico_id).filter(Boolean));
        return tecnicos.filter(t => idsPresentes.has(t.id));
    }, [lista, tecnicos]);

    return (
        <AppShell
            title="Cronograma de Entregas"
            subtitle="Acompanhamento e previsão de conclusão das telas do sistema"
            icon={Calendar}
        >
            <div className="space-y-6">
                {loading ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 font-medium">
                        Carregando cronograma...
                    </div>
                ) : (
                    <>
                        {/* ── KPI & Filtro Card ── */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                            <div>
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    Previsão de Fim do Projeto
                                </span>
                                <div className="text-2xl font-black text-brand-600 tracking-tight">
                                    {dataFinalProjeto ? dataFinalProjeto.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "-"}
                                </div>
                            </div>

                            <div className="flex-1 lg:max-w-md">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Progresso Geral</span>
                                    <span className="text-xs font-black text-slate-800">
                                        {formatarHHMM(totalHorasTrabalhadas)} / {formatarHHMM(totalCargaHoraria)} ({percentualTotal.toFixed(0)}%)
                                    </span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            percentualTotal >= 100 ? "bg-emerald-500" : "bg-brand-600"
                                        }`}
                                        style={{ width: `${Math.min(percentualTotal, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-700 whitespace-nowrap uppercase tracking-wider">
                                    Técnico:
                                </span>
                                <select
                                    value={filtroTecnico}
                                    onChange={(e) => setFiltroTecnico(e.target.value)}
                                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium cursor-pointer min-w-[180px]"
                                >
                                    <option value="">-- Todos os Técnicos --</option>
                                    {tecnicosFiltro.map(t => (
                                        <option key={t.id} value={t.id}>{t.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ── Tabela de Cronograma ── */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Tarefas do Cronograma</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Visão detalhada por tela, prazo e técnico atribuído</p>
                                </div>
                                <span className="text-xs font-semibold text-slate-500">
                                    Total: <strong className="text-slate-800">{listaFiltrada.length}</strong> tarefas
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-700">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                            <th className="py-3.5 px-6">Tela / Objeto</th>
                                            <th className="py-3.5 px-4 text-center">Início</th>
                                            <th className="py-3.5 px-4 text-center">Término</th>
                                            <th className="py-3.5 px-4 text-center">Técnico</th>
                                            <th className="py-3.5 px-4 text-center w-20">QA</th>
                                            <th className="py-3.5 px-6 text-center w-48">Progresso</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {listaFiltrada.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-10 text-center text-slate-400 text-sm">
                                                    Nenhum cronograma cadastrado.
                                                </td>
                                            </tr>
                                        )}
                                        {listaFiltrada.map((item) => {
                                            const isFinished = item.controle_api?.status_api === "Finalizado" && 
                                                               item.controle_api?.status_teste === "Finalizado" && 
                                                               item.controle_api?.status_documentacao === "Finalizado";

                                            const horasTrab = calcularHorasTrabalhadas(item.controle_api_id);
                                            let percent = item.carga_horaria > 0 ? (horasTrab / item.carga_horaria) * 100 : 0;
                                            
                                            let barClass = "bg-blue-600";
                                            if (isFinished) {
                                                barClass = "bg-emerald-500";
                                            } else if (percent > 100) {
                                                barClass = "bg-rose-500";
                                            }
                                            
                                            const widthPercent = isFinished ? 100 : Math.min(percent, 100);
                                            const displayPercent = isFinished ? 100 : percent;
                                            
                                            const hasAlteration = !!item.justificativa;
                                            const qaStatus = getQaStatus(item);
                                            const QaIcon = qaStatus.Icon;

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="py-3.5 px-6">
                                                        <div className="font-bold text-slate-900">{item.controle_api?.nome_tabela}</div>
                                                        <div className="text-xs text-slate-500 font-medium">{item.controle_api?.tela}</div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center text-xs font-semibold text-slate-600">
                                                        {new Date(item.inicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <div className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600">
                                                            {new Date(item.termino).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                            {hasAlteration && (
                                                                <AlertCircle 
                                                                    size={15} 
                                                                    className="text-amber-500 cursor-pointer inline"
                                                                    onMouseEnter={(e) => exibirTooltip(item, e)}
                                                                    onMouseLeave={ocultarTooltip}
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                            {getNomeTecnico(item.tecnico_id)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <div 
                                                            title={qaStatus.label}
                                                            style={{
                                                                background: qaStatus.bg,
                                                                color: qaStatus.cor,
                                                            }}
                                                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg shadow-sm border border-black/5 cursor-help"
                                                        >
                                                            <QaIcon size={16} strokeWidth={2.4} />
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-6 text-center">
                                                        <div className="flex flex-col gap-1 items-center">
                                                            <span className="text-[11px] font-bold text-slate-700">
                                                                {formatarHHMM(horasTrab)} / {item.carga_horaria}h ({displayPercent.toFixed(0)}%)
                                                            </span>
                                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-300 ${barClass}`}
                                                                    style={{ width: `${widthPercent}%` }} 
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* Tooltip para justificativa */}
                {tooltipContent && (
                    <div 
                        style={{
                            position: "fixed",
                            top: tooltipContent.y + 10,
                            left: tooltipContent.x + 10,
                            zIndex: 9999,
                            pointerEvents: "none"
                        }}
                        className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg w-64 text-left"
                    >
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alteração de Prazo</div>
                        {tooltipContent.termino_original && (
                            <div className="text-xs text-slate-700 mb-1.5">
                                <strong>Data Inicial:</strong> {new Date(tooltipContent.termino_original).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </div>
                        )}
                        <div className="text-xs text-slate-800">
                            <strong>Justificativa:</strong><br />
                            <span className="text-slate-600">{tooltipContent.justificativa}</span>
                        </div>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
