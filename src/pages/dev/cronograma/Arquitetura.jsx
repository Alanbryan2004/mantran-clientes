import { useState, useEffect, useMemo } from "react";
import AppShell from "../components/AppShell";
import { apiGet, rpc } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { AlertCircle, Cpu } from "lucide-react";
import CronogramaTabs from "./CronogramaTabs";

function formatarHHMM(horasDecimais) {
    if (!horasDecimais) return "0h 0m";
    const h = Math.floor(horasDecimais);
    const m = Math.round((horasDecimais - h) * 60);
    return `${h}h ${m}m`;
}

export default function Arquitetura() {
    const { user } = useAuth();
    
    const [lista, setLista] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);
    const [todosUsuarios, setTodosUsuarios] = useState([]);
    const [apontamentos, setApontamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tooltipContent, setTooltipContent] = useState(null);
    const [filtroTecnico, setFiltroTecnico] = useState("");

    async function carregar() {
        try {
            setLoading(true);
            let dataTecnicos = [];
            try {
                dataTecnicos = await apiGet("/rest/v1/usuario?select=id,nome,login,perfil,e_tecnico,ativo&ativo=eq.true&order=nome.asc");
            } catch {
                dataTecnicos = await apiGet("/rest/v1/usuario?select=id,nome,login,perfil,ativo&ativo=eq.true&order=nome.asc");
            }

            const [dataCronograma, dataApontamentos] = await Promise.all([
                apiGet("/rest/v1/cronograma?select=*,controle_api(tela,nome_tabela,tipo_tabela,status_api,status_teste,status_documentacao)&order=inicio.asc,termino.asc"),
                apiGet("/rest/v1/apontamento_tempo?select=controle_api_id,inicio,fim")
            ]);

            const filteredData = (dataCronograma || []).filter(item => item.controle_api?.tipo_tabela === "Arquitetura");
            
            // AUTO-CURA: Se a tarefa está finalizada mas o relógio ficou aberto (aconteceu antes da atualização)
            const apontamentosAtuais = dataApontamentos || [];
            let precisaRecarregar = false;

            for (const item of filteredData) {
                if (item.controle_api?.status_api === "Finalizado") {
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

                    // AUTO-CURA: Garantir que Teste e Documentação estejam como Finalizado para contar no Dashboard
                    if (item.controle_api?.status_teste !== "Finalizado" || item.controle_api?.status_documentacao !== "Finalizado") {
                        try {
                            if (item.controle_api?.status_teste !== "Finalizado") {
                                await rpc("atualizar_status", { p_controle_api_id: item.controle_api_id, p_campo: "status_teste", p_status: "Finalizado" });
                            }
                            if (item.controle_api?.status_documentacao !== "Finalizado") {
                                await rpc("atualizar_status", { p_controle_api_id: item.controle_api_id, p_campo: "status_documentacao", p_status: "Finalizado" });
                            }
                            // Chama finalizar novamente para garantir data_fim_real preenchida se o backend depender dos três status
                            await rpc("finalizar_trabalho", {
                                p_controle_api_id: item.controle_api_id,
                                p_tecnico_id: item.tecnico_id
                            });
                            precisaRecarregar = true;
                        } catch(e) {
                            console.error("Erro na auto-cura de status Arquitetura", e);
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

            // Filtra apenas usuários que atuam como Técnico
            const apenasTecnicos = (dataTecnicos || []).filter((u) => {
                if (typeof u.e_tecnico === "boolean") {
                    return u.e_tecnico;
                }
                if (u.perfil === "Tecnico") return true;
                if (u.perfil === "Administrador" && ["alan", "gabriel", "daniel", "guilherme"].includes((u.login || "").toLowerCase())) {
                    return true;
                }
                return false;
            });

            setLista(filteredData);
            setTecnicos(apenasTecnicos);
            setTodosUsuarios(dataTecnicos || []);
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
        const tec = (todosUsuarios || []).find(t => t.id === id) || tecnicos.find(t => t.id === id);
        return tec ? tec.nome : "Desconhecido";
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
        const isFinishedA = a.controle_api?.status_api === "Finalizado";
        const isFinishedB = b.controle_api?.status_api === "Finalizado";

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
        // Tarefas de Arquitetura só precisam do status_api Finalizado
        const isFinished = item.controle_api?.status_api === "Finalizado";
                           
        const horasTrab = calcularHorasTrabalhadas(item.controle_api_id);
        const cargaOriginal = Number(item.carga_horaria) || 0;
        
        // Se finalizou antes (ou depois), a carga real daquela tarefa foi o tempo gasto
        const cargaConsiderada = isFinished ? horasTrab : cargaOriginal;

        totalCargaHoraria += cargaConsiderada;
        totalHorasTrabalhadas += Math.min(horasTrab, cargaConsiderada);
    });

    const percentualTotal = totalCargaHoraria > 0 ? (totalHorasTrabalhadas / totalCargaHoraria) * 100 : 0;

    return (
        <AppShell
            title="Cronograma de Arquitetura"
            subtitle="Acompanhamento e evolução técnica da infraestrutura e APIs"
            icon={Cpu}
        >
            <div className="space-y-6">
                <CronogramaTabs />
                {loading ? (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center text-slate-500 font-medium">
                        Carregando cronograma de arquitetura...
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
                                    {tecnicos.map(t => (
                                        <option key={t.id} value={t.id}>{t.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ── Tabela Tarefas de Arquitetura ── */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Tarefas de Arquitetura</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Componentes centrais de backend, microsserviços e frontend</p>
                                </div>
                                <span className="text-xs font-semibold text-slate-500">
                                    Total: <strong className="text-slate-800">{listaFiltrada.length}</strong> itens
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-700">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                            <th className="py-3.5 px-6">Tarefa / Módulo</th>
                                            <th className="py-3.5 px-4 text-center">Início</th>
                                            <th className="py-3.5 px-4 text-center">Término</th>
                                            <th className="py-3.5 px-4 text-center">Técnico</th>
                                            <th className="py-3.5 px-6 text-center w-48">Progresso</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {listaFiltrada.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-10 text-center text-slate-400 text-sm">
                                                    Nenhum cronograma cadastrado.
                                                </td>
                                            </tr>
                                        )}
                                        {listaFiltrada.map((item) => {
                                            // Tarefas de Arquitetura só precisam do status_api Finalizado
                                            const isFinished = item.controle_api?.status_api === "Finalizado";

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
