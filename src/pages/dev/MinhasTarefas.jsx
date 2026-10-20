import { useEffect, useMemo, useState } from "react";
import AppShell from "./components/AppShell";
import { apiGet, rpc, apiPatch, limparApontamentosAntigos, criarNotificacao } from "./services/api";
import { useAuth } from "./contexts/AuthContext";
import { getImagensCenario } from "./QATestes";
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, Clock } from "lucide-react";

export default function MinhasTarefas() {
  const { user } = useAuth();

  const [tarefas, setTarefas] = useState([]);
  const [apontamentos, setApontamentos] = useState([]);
  const [cenariosQa, setCenariosQa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Modal de Análise e Correção de Erros de QA
  const [modalQa, setModalQa] = useState(null); // { tela, tarefa }
  const [salvandoCorrecao, setSalvandoCorrecao] = useState(false);
  const [modalZoomImagem, setModalZoomImagem] = useState(null); // { imagens: [], index: 0 }

  // Sub-modal: correção de UM cenário (print + descrição)
  const [modalCorrecao, setModalCorrecao] = useState(null); // { cenario }
  const [textoCorrecao, setTextoCorrecao] = useState("");
  const [imagensCorrecao, setImagensCorrecao] = useState([]); // array de data URLs
  const [salvandoCorrecaoCenario, setSalvandoCorrecaoCenario] = useState(false);

  const tecnicoId = user?.id;
  const tecnicoNome = user?.nome;

  async function carregar() {
    if (!tecnicoId) return;

    setLoading(true);
    setErro("");
    try {
      // Auto-pausa retroativa para garantir consistência de apontamentos anteriores
      await limparApontamentosAntigos();

      const [rows, allApontamentos, allQaCenarios] = await Promise.all([
        apiGet(
          `/rest/v1/controle_api?select=id,tela,nome_tabela,tipo_tabela,nivel_api,peso_api,qtd_campos,tecnico_id,tecnico_nome,status_api,status_teste,status_documentacao,observacoes,modulo,data_inicio,data_fim_real,endpoints` +
            `&tecnico_id=eq.${encodeURIComponent(tecnicoId)}` +
            `&order=created_at.asc`
        ),
        apiGet(
          `/rest/v1/apontamento_tempo?select=controle_api_id,inicio,fim` +
            `&tecnico_id=eq.${encodeURIComponent(tecnicoId)}`
        ),
        apiGet(`/rest/v1/qa_cenarios?select=*`).catch(() => [])
      ]);
      
      setTarefas(rows || []);
      setApontamentos(allApontamentos || []);
      setCenariosQa(allQaCenarios || []);
    } catch (e) {
      setErro(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [tecnicoId]);

  useEffect(() => {
    const timer = setInterval(() => {
      const nowTs = Date.now();
      setNow(nowTs);

      // Verificação em tempo real pós-18:00
      const current = new Date(nowTs);
      if (current.getHours() >= 18) {
        const activeIds = (apontamentos || []).filter(a => !a.fim).map(a => a.controle_api_id);
        if (activeIds.length > 0) {
          const tarefasAtivas = tarefas.filter(t => activeIds.includes(t.id) && busyId !== t.id);
          for (const t of tarefasAtivas) {
            console.log(`[Auto-Pausa] Horário limite atingido (18:00). Pausando tarefa: ${t.nome_tabela}`);
            pausar(t);
          }
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [apontamentos, tarefas, busyId]);

  // Colar (Ctrl+V) imagem no sub-modal de correção do cenário
  useEffect(() => {
    if (!modalCorrecao) return;
    const handleGlobalPaste = (e) => {
      const items = (e.clipboardData || window.clipboardData)?.items;
      if (!items) return;
      for (let item of items) {
        if (item.type && item.type.indexOf("image") === 0) {
          const file = item.getAsFile();
          processarImagem(file, (dataUrl) => setImagensCorrecao((prev) => [...prev, dataUrl]));
          break;
        }
      }
    };
    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [modalCorrecao]);

  const apontAbertos = useMemo(() => {
    return (apontamentos || []).filter(a => !a.fim).map(a => a.controle_api_id);
  }, [apontamentos]);

  // Verifica se a tarefa possui apontamento de erro no QA
  const getErrosQaDaTarefa = (t) => {
    const nomeTela = t.tela || t.nome_tabela;
    return (cenariosQa || []).filter(
      (c) => (c.tela === nomeTela || c.tela === t.tela || c.tela === t.nome_tabela) && c.status === "ERRO"
    );
  };

  const isReprovadaQa = (t) => {
    return getErrosQaDaTarefa(t).length > 0;
  };

  const resumo = useMemo(() => {
    const total = tarefas.length;
    const concluidas = tarefas.filter((t) => isConcluida(t) && !isReprovadaQa(t)).length;
    const trabalhando = tarefas.filter((t) => apontAbertos.includes(t.id)).length;
    const pendentes = total - concluidas;
    return { total, pendentes, trabalhando, concluidas };
  }, [tarefas, apontAbertos, cenariosQa]);

  // 👉 MOSTRAR SOMENTE TAREFAS NÃO CONCLUÍDAS OU REPROVADAS NO QA
  // Reprovadas (com apontamento de erro do QA) sempre no TOPO da lista.
  const tarefasVisiveis = useMemo(() => {
    const lista = tarefas.filter((t) => !isConcluida(t) || isReprovadaQa(t));
    return lista.sort((a, b) => {
      const ra = isReprovadaQa(a) ? 1 : 0;
      const rb = isReprovadaQa(b) ? 1 : 0;
      return rb - ra; // reprovadas (1) antes das demais (0)
    });
  }, [tarefas, cenariosQa]);

  async function iniciar(tarefa) {
    setBusyId(tarefa.id);
    try {
      await rpc("iniciar_trabalho", {
        p_controle_api_id: tarefa.id,
        p_tecnico_id: tecnicoId,
        p_tecnico_nome: tecnicoNome,
      });

      // Garantir que a fase correta fique como "Trabalhando" e as finalizadas não sejam sobrescritas
      let newApi = tarefa.status_api || "Pendente";
      let newTeste = tarefa.status_teste || "Pendente";
      let newDoc = tarefa.status_documentacao || "Pendente";

      if (newApi !== "Finalizado") {
        newApi = "Trabalhando";
      } else if (newTeste !== "Finalizado") {
        newTeste = "Trabalhando";
      } else if (newDoc !== "Finalizado") {
        newDoc = "Trabalhando";
      }

      await apiPatch(`/rest/v1/controle_api?id=eq.${tarefa.id}`, {
        status_api: newApi,
        status_teste: newTeste,
        status_documentacao: newDoc,
      });

      await carregar();
    } catch (e) {
      setErro(String(e.message || e));
    } finally {
      setBusyId(null);
    }
  }

  async function pausar(tarefa) {
    setBusyId(tarefa.id);
    try {
      await rpc("pausar_trabalho", {
        p_controle_api_id: tarefa.id,
        p_tecnico_id: tecnicoId,
      });
      await carregar();
    } catch (e) {
      setErro(String(e.message || e));
    } finally {
      setBusyId(null);
    }
  }

  async function retomar(tarefa) {
    setBusyId(tarefa.id);
    try {
      await rpc("retomar_trabalho", {
        p_controle_api_id: tarefa.id,
        p_tecnico_id: tecnicoId,
        p_tecnico_nome: tecnicoNome,
      });
      await carregar();
    } catch (e) {
      setErro(String(e.message || e));
    } finally {
      setBusyId(null);
    }
  }

  async function finalizar(tarefa) {
    setBusyId(tarefa.id);
    try {
      await rpc("finalizar_trabalho", {
        p_controle_api_id: tarefa.id,
        p_tecnico_id: tecnicoId,
      });
      await carregar();
    } catch (e) {
      setErro(String(e.message || e));
    } finally {
      setBusyId(null);
    }
  }

  async function devolver(tarefa) {
    if (!window.confirm(`Tem certeza que deseja devolver a tarefa "${tarefa.nome_tabela}" para a lista de Pendentes?`)) {
      return;
    }
    setBusyId(tarefa.id);
    try {
      await apiPatch(`/rest/v1/controle_api?id=eq.${tarefa.id}`, {
        tecnico_id: null,
        tecnico_nome: null,
        status_api: "Pendente",
        status_teste: "Pendente",
        status_documentacao: "Pendente",
        data_inicio: null,
        tela: ""
      });
      await carregar();
    } catch (e) {
      setErro(String(e.message || e));
    } finally {
      setBusyId(null);
    }
  }

    async function mudarStatus(tarefa, campo, status) {
    setBusyId(tarefa.id);
    try {
      await rpc("atualizar_status", {
        p_controle_api_id: tarefa.id,
        p_campo: campo,
        p_status: status,
      });

      // Auto-finaliza o timer se a tarefa ficou totalmente concluída
      const novaTarefa = { ...tarefa, [campo]: status };

      // AUTO-COMPLETAR para tarefas de Arquitetura
      if (novaTarefa.tipo_tabela === "Arquitetura" && novaTarefa.status_api === "Finalizado") {
        if (novaTarefa.status_teste !== "Finalizado") {
          await rpc("atualizar_status", { p_controle_api_id: tarefa.id, p_campo: "status_teste", p_status: "Finalizado" });
          novaTarefa.status_teste = "Finalizado";
        }
        if (novaTarefa.status_documentacao !== "Finalizado") {
          await rpc("atualizar_status", { p_controle_api_id: tarefa.id, p_campo: "status_documentacao", p_status: "Finalizado" });
          novaTarefa.status_documentacao = "Finalizado";
        }
      }

      if (isConcluida(novaTarefa)) {
        await rpc("finalizar_trabalho", {
          p_controle_api_id: tarefa.id,
          p_tecnico_id: tecnicoId,
        });
      }

      await carregar();
    } catch (e) {
      setErro(String(e.message || e));
    } finally {
      setBusyId(null);
    }
  }

  async function salvarObs(tarefa, texto) {
    setBusyId(tarefa.id);
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      await fetch(`${baseUrl}/rest/v1/controle_api?id=eq.${tarefa.id}`, {
        method: "PATCH",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ observacoes: texto }),
      });

      await carregar();
    } catch (e) {
      setErro(String(e.message || e));
    } finally {
      setBusyId(null);
    }
  }

  function abrirModalQa(tarefa) {
    setModalQa({
      tarefa,
      tela: tarefa.tela || tarefa.nome_tabela
    });
  }

  // Abre o sub-modal de correção de UM cenário (print + descrição)
  function abrirModalCorrecao(cenario) {
    setModalCorrecao({ cenario });
    setTextoCorrecao(cenario.observacao_correcao || "");
    setImagensCorrecao(getImagensCorrecao(cenario));
  }

  // Salva a correção do cenário: status CORRIGIDO + texto + print(s).
  async function salvarCorrecaoCenario() {
    if (!textoCorrecao.trim()) {
      alert("Descreva a correção efetuada neste cenário.");
      return;
    }
    setSalvandoCorrecaoCenario(true);
    try {
      const payloadImagem =
        imagensCorrecao.length === 0
          ? null
          : imagensCorrecao.length === 1
          ? imagensCorrecao[0]
          : JSON.stringify(imagensCorrecao);

      await apiPatch(`/rest/v1/qa_cenarios?id=eq.${modalCorrecao.cenario.id}`, {
        status: "CORRIGIDO",
        observacao_correcao: textoCorrecao.trim(),
        evidencia_correcao: payloadImagem,
        updated_at: new Date().toISOString()
      });

      setModalCorrecao(null);
      setTextoCorrecao("");
      setImagensCorrecao([]);
      await carregar();
    } catch (e) {
      alert("Erro ao salvar correção: " + (e.message || String(e)));
    } finally {
      setSalvandoCorrecaoCenario(false);
    }
  }

  async function retornarParaValidacao() {
    // Só retorna quando não há mais cenários em ERRO (todos foram corrigidos).
    const errosRestantes = modalQa ? getErrosQaDaTarefa(modalQa.tarefa) : [];
    if (errosRestantes.length > 0) {
      alert("Ainda há cenários pendentes de correção. Corrija todos antes de retornar para validação.");
      return;
    }

    setSalvandoCorrecao(true);
    try {
      // Os cenários corrigidos (status CORRIGIDO) voltam para PENDENTE para o QA revalidar.
      const corrigidos = (cenariosQa || []).filter(
        (c) => (c.tela === modalQa.tela || c.tela === modalQa.tarefa?.tela || c.tela === modalQa.tarefa?.nome_tabela) && c.status === "CORRIGIDO"
      );
      for (const cenario of corrigidos) {
        await apiPatch(`/rest/v1/qa_cenarios?id=eq.${cenario.id}`, {
          status: "PENDENTE",
          updated_at: new Date().toISOString()
        });
      }

      // =========================================================================
      // NOTIFICAÇÃO NO MANTRAN CLIENTES PARA O USUÁRIO QA QUE ESTAVA VALIDANDO
      // =========================================================================
      try {
        const nomeTela = modalQa.tela;
        const nomeTecnico = user?.nome || user?.login || "Técnico";
        const idTecnico = user?.id || null;

        // Identifica os usuários QA que apontaram os erros corrigidos
        let usuariosSistema = null;
        const qasMap = new Map(); // id -> nome

        for (const cenario of corrigidos) {
          if (cenario.qa_id) {
            qasMap.set(cenario.qa_id, cenario.qa_nome || "QA");
          } else if (cenario.qa_nome) {
            if (!usuariosSistema) {
              usuariosSistema = await apiGet("/rest/v1/usuario?select=id,nome,login&ativo=eq.true").catch(() => []);
            }
            const qaUser = (usuariosSistema || []).find(
              (u) =>
                u.nome?.trim().toLowerCase() === cenario.qa_nome?.trim().toLowerCase() ||
                u.login?.trim().toLowerCase() === cenario.qa_nome?.trim().toLowerCase()
            );
            if (qaUser) {
              qasMap.set(qaUser.id, qaUser.nome || cenario.qa_nome);
            }
          }
        }

        // Enviar notificação para o(s) usuário(s) QA responsável(is)
        if (qasMap.size > 0) {
          for (const [qaId, qaNome] of qasMap.entries()) {
            await criarNotificacao({
              titulo: `🔁 Tela "${nomeTela}" Pronta para Nova Validação`,
              mensagem: `O Técnico "${nomeTecnico}" Corrigiu a Tela "${nomeTela}" e já esta disponivel para Nova Validação.`,
              tipo: "qa_corrigido",
              destinatario_usuario_id: qaId,
              dados_extras: {
                modulo: "qa",
                acao: "correcao_retorno",
                tela: nomeTela,
                tecnico_id: idTecnico,
                tecnico_nome: nomeTecnico,
                qa_id: qaId,
                qa_nome: qaNome
              }
            });
          }
        } else {
          // Fallback: se nenhum QA específico foi localizado, envia notificação geral da tela
          await criarNotificacao({
            titulo: `🔁 Tela "${nomeTela}" Pronta para Nova Validação`,
            mensagem: `O Técnico "${nomeTecnico}" Corrigiu a Tela "${nomeTela}" e já esta disponivel para Nova Validação.`,
            tipo: "qa_corrigido",
            destinatario_usuario_id: null,
            dados_extras: {
              modulo: "qa",
              acao: "correcao_retorno",
              tela: nomeTela,
              tecnico_id: idTecnico,
              tecnico_nome: nomeTecnico
            }
          });
        }
      } catch (notifErr) {
        console.warn("Aviso ao enviar notificação de QA corrigido para Mantran Clientes:", notifErr);
      }

      setModalQa(null);
      await carregar();
    } catch (e) {
      alert("Erro ao retornar para validação: " + (e.message || String(e)));
    } finally {
      setSalvandoCorrecao(false);
    }
  }

  return (
    <AppShell 
      title="Minhas Tarefas" 
      subtitle="Apontamento de horas, execução de tarefas e análise de homologação"
      icon={Clock}
    >
      {loading && <div>Carregando...</div>}
      {erro && <div style={styles.err}>{erro}</div>}

      {!loading && (
        <>
          <div style={styles.grid}>
            <Card title="Total" value={resumo.total} />
            <Card title="Pendentes" value={resumo.pendentes} />
            <Card title="Trabalhando" value={resumo.trabalhando} />
            <Card title="Concluídas" value={resumo.concluidas} />
          </div>

          <div style={{ height: 16 }} />

          <div style={styles.list}>
            {tarefasVisiveis.length === 0 ? (
              <div style={{ padding: 14, color: "#6b7280" }}>
                Nenhuma tarefa pendente 🎉
              </div>
            ) : (
              tarefasVisiveis.map((t) => {
                const aberto = apontAbertos.includes(t.id);
                const concl = isConcluida(t);
                const errosQa = getErrosQaDaTarefa(t);
                const isReprovada = errosQa.length > 0;
                const podeFinalizar =
                  t.status_api === "Finalizado" &&
                  t.status_teste === "Finalizado" &&
                  t.status_documentacao === "Finalizado";

                return (
                  <div 
                    key={t.id} 
                    style={{
                      ...styles.taskCard,
                      borderColor: isReprovada ? "#fca5a5" : "#eee",
                      boxShadow: isReprovada ? "0 0 0 1px #ef4444, 0 4px 6px -1px rgba(239, 68, 68, 0.1)" : "none"
                    }}
                  >
                    {/* ALERTA / BANNER SE A TELA ESTIVER REPROVADA PELO QA */}
                    {isReprovada && (
                      <div style={styles.reprovadoBanner}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20 }}>🚨</span>
                          <div>
                            <div style={{ fontWeight: 800, color: "#991b1b", fontSize: 14 }}>
                              REPROVADO PELO QA ({errosQa.length} {errosQa.length === 1 ? "apontamento de erro" : "apontamentos de erro"})
                            </div>
                            <div style={{ fontSize: 12, color: "#b91c1c" }}>
                              Esta tela foi reprovada pela equipe de QA. Clique abaixo para verificar os erros e enviar para nova validação.
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {(() => {
                            const todasImagens = errosQa.flatMap(c => getImagensCenario(c));
                            if (todasImagens.length === 0) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => setModalZoomImagem({ imagens: todasImagens, index: 0 })}
                                style={styles.btnVerPrintBanner}
                                title="Visualizar prints do erro anexados pelo QA"
                              >
                                📸 Ver Prints do Erro ({todasImagens.length})
                              </button>
                            );
                          })()}
                          <button
                            onClick={() => abrirModalQa(t)}
                            style={styles.btnVerErroQa}
                          >
                            ⚠️ Reprovado - Ver Erro e Revalidar
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={styles.taskTop}>
                      <div>
                        <div style={styles.taskTitle}>
                          {t.nome_tabela}
                          {isReprovada && (
                            <span style={styles.badgeReprovado}>Reprovado no QA</span>
                          )}
                        </div>
                        <div style={styles.taskSub}>
                          Tela: <b>{t.tela}</b> | Tipo: <b>{t.tipo_tabela}</b> | Nível:{" "}
                          <b>{t.nivel_api}</b> | Campos: <b>{t.qtd_campos}</b>
                        </div>
                        <div style={styles.taskSub}>
                          Módulo: <b>{t.modulo}</b>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={styles.timeSpent}>
                          ⏱️ {formatarHHMM(
                            ((apontamentos || [])
                              .filter(a => a.controle_api_id === t.id)
                              .reduce((acc, a) => {
                                const start = new Date(a.inicio).getTime();
                                const end = a.fim ? new Date(a.fim).getTime() : now;
                                return acc + (end - start);
                              }, 0) / 1000) / 3600
                          )}
                        </div>
                        <div style={styles.statePill}>
                          {aberto ? "Em andamento" : "Pausada"}
                        </div>
                      </div>
                    </div>

                    {/* Quando REPROVADA pelo QA (devolução de erro), ocultamos os
                        controles de produção (ações, status API/Teste/Doc, observações
                        e endpoints). O técnico age pelo banner "Ver Erro e Revalidar". */}
                    {!isReprovada && (
                      <>
                        <div style={styles.actions}>
                          <button
                            style={btn(!aberto)}
                            disabled={busyId === t.id || aberto}
                            onClick={() => iniciar(t)}
                          >
                            ▶ Iniciar
                          </button>

                          <button
                            style={btn(aberto)}
                            disabled={busyId === t.id || !aberto}
                            onClick={() => pausar(t)}
                          >
                            ⏸ Pausar
                          </button>

                          <button
                            style={btnDanger(podeFinalizar && !aberto)}
                            disabled={busyId === t.id || aberto || !podeFinalizar}
                            onClick={() => finalizar(t)}
                          >
                            ⏹ Finalizar
                          </button>

                          {!concl && (
                            <button
                              style={btnWarning(!aberto)}
                              disabled={busyId === t.id || aberto}
                              onClick={() => devolver(t)}
                              title="Devolver para Pendentes"
                            >
                              ↩ Devolver
                            </button>
                          )}
                        </div>

                        <div style={styles.statusRow}>
                          <StatusSelect
                            label="API"
                            value={t.status_api}
                            onChange={(v) => mudarStatus(t, "status_api", v)}
                          />
                          <StatusSelect
                            label="Teste"
                            value={t.status_teste}
                            onChange={(v) => mudarStatus(t, "status_teste", v)}
                          />
                          <StatusSelect
                            label="Doc"
                            value={t.status_documentacao}
                            onChange={(v) =>
                              mudarStatus(t, "status_documentacao", v)
                            }
                          />
                        </div>

                        <div style={styles.obsWrap}>
                          <textarea
                            style={styles.textarea}
                            defaultValue={t.observacoes || ""}
                            placeholder="Observações…"
                            onBlur={(e) =>
                              salvarObs(t, e.target.value || null)
                            }
                          />
                        </div>

                        <EndpointsEditor tarefa={t} setErro={setErro} />
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* MODAL PARA O TÉCNICO VER ERRO DO QA E RETORNAR PARA VALIDAÇÃO */}
      {modalQa && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🚨</span>
                <div>
                  <h3 style={styles.modalTitle}>Apontamentos de Erro do QA</h3>
                  <span style={styles.modalSubHeader}>Tela: <strong>{modalQa.tela}</strong></span>
                </div>
              </div>
            </div>

            <div style={styles.modalBody}>
              {(() => {
                // Lista AO VIVO de cenários em ERRO (os corrigidos somem da lista).
                const errosAtuais = getErrosQaDaTarefa(modalQa.tarefa);
                const corrigidosCount = (cenariosQa || []).filter(
                  (c) => (c.tela === modalQa.tela || c.tela === modalQa.tarefa?.tela || c.tela === modalQa.tarefa?.nome_tabela) && c.status === "CORRIGIDO"
                ).length;

                if (errosAtuais.length === 0) {
                  return (
                    <div style={styles.todosCorrigidosBox}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#15803d" }}>
                        ✅ Todos os cenários foram corrigidos
                      </div>
                      <div style={{ fontSize: 13, color: "#166534", marginTop: 4 }}>
                        {corrigidosCount} cenário(s) corrigido(s). Clique em "Retornar para Nova Validação" para enviar ao QA.
                      </div>
                    </div>
                  );
                }

                return (
                  <>
                    <div style={{ fontSize: 13, color: "#374151" }}>
                      {errosAtuais.length} cenário(s) a corrigir{corrigidosCount > 0 ? ` • ${corrigidosCount} já corrigido(s)` : ""}:
                    </div>

                    <div style={styles.qaErrorsList}>
                      {errosAtuais.map((c, i) => (
                        <div key={c.id} style={styles.qaErrorCard}>
                          <div style={styles.qaErrorHeaderRow}>
                            <div style={styles.qaErrorHeader}>
                              <span style={styles.qaErrorBadge}>Cenário #{i + 1}</span>
                              <strong style={{ fontSize: 14, color: "#111827" }}>{c.titulo}</strong>
                            </div>
                            <button
                              type="button"
                              style={styles.btnCorrigidoCenario}
                              onClick={() => abrirModalCorrecao(c)}
                              title="Marcar este cenário como corrigido (anexar print e descrever a correção)"
                            >
                              ✔ Corrigido
                            </button>
                          </div>

                    {c.descricao && (
                      <div style={styles.qaErrorDesc}>
                        <strong>Regra de Negócio:</strong> {c.descricao}
                      </div>
                    )}

                    <div style={styles.qaErrorObs}>
                      <strong style={{ color: "#991b1b" }}>Erro apontado pelo QA ({c.qa_nome || "QA"}):</strong>
                      <div style={{ marginTop: 4, color: "#7f1d1d", whiteSpace: "pre-wrap" }}>
                        {c.observacao_erro || "Nenhum detalhe adicional informado."}
                      </div>

                      {/* PRINTS ANEXADOS PELO QA */}
                      {(() => {
                        const cImagens = getImagensCenario(c);
                        if (cImagens.length === 0) return null;
                        return (
                          <div style={styles.printContainerTech}>
                            <div style={styles.printHeaderTech}>
                              <span>📸 <strong>Prints / Evidências Anexadas ({cImagens.length}):</strong></span>
                              <button
                                type="button"
                                style={styles.btnZoomPrintTech}
                                onClick={() => setModalZoomImagem({ imagens: cImagens, index: 0 })}
                              >
                                🔍 Ver em Tela Cheia
                              </button>
                            </div>
                            <div style={styles.galleryGridTech}>
                              {cImagens.map((img, imgIdx) => (
                                <div
                                  key={imgIdx}
                                  style={styles.galleryItemTech}
                                  onClick={() => setModalZoomImagem({ imagens: cImagens, index: imgIdx })}
                                >
                                  <img
                                    src={img}
                                    alt={`Print ${imgIdx + 1}`}
                                    style={styles.printThumbTech}
                                    title={`Print #${imgIdx + 1} - Clique para ampliar`}
                                  />
                                  <span style={styles.galleryBadgeTech}>#{imgIdx + 1}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.btnModalCancel}
                onClick={() => setModalQa(null)}
                disabled={salvandoCorrecao}
              >
                Fechar
              </button>
              {(() => {
                const errosAtuais = getErrosQaDaTarefa(modalQa.tarefa);
                const tudoCorrigido = errosAtuais.length === 0;
                return (
                  <button
                    style={{
                      ...styles.btnModalReturnQa,
                      opacity: tudoCorrigido ? 1 : 0.5,
                      cursor: tudoCorrigido ? "pointer" : "not-allowed"
                    }}
                    onClick={retornarParaValidacao}
                    disabled={salvandoCorrecao || !tudoCorrigido}
                    title={tudoCorrigido ? "Enviar para nova validação do QA" : "Corrija todos os cenários antes de retornar"}
                  >
                    {salvandoCorrecao ? "Enviando..." : "🔁 Retornar para Nova Validação"}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: CORREÇÃO DE UM CENÁRIO (print + descrição) */}
      {modalCorrecao && (
        <div style={styles.modalOverlay}>
          <div style={styles.correcaoModalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🛠️</span>
                <div>
                  <h3 style={styles.modalTitle}>Registrar Correção do Cenário</h3>
                  <span style={styles.modalSubHeader}>
                    Cenário: <strong>{modalCorrecao.cenario.titulo}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.qaErrorObs}>
                <strong style={{ color: "#991b1b" }}>Erro apontado pelo QA:</strong>
                <div style={{ marginTop: 4, color: "#7f1d1d", whiteSpace: "pre-wrap" }}>
                  {modalCorrecao.cenario.observacao_erro || "Nenhum detalhe adicional informado."}
                </div>
              </div>

              <div style={styles.correcaoField}>
                <label style={styles.correcaoLabel}>
                  Descreva a correção efetuada: <span style={{ color: "red" }}>*</span>
                </label>
                <textarea
                  style={styles.correcaoTextarea}
                  placeholder="Ex: Corrigido o tratamento de validação e ajustado o status retornado."
                  value={textoCorrecao}
                  onChange={(e) => setTextoCorrecao(e.target.value)}
                  rows={4}
                  autoFocus
                />
              </div>

              <div style={styles.correcaoField}>
                <label style={styles.correcaoLabel}>
                  📸 Prints da correção ({imagensCorrecao.length}) — cole com Ctrl+V ou selecione abaixo
                </label>
                {imagensCorrecao.length > 0 && (
                  <div style={styles.galleryGridTech}>
                    {imagensCorrecao.map((img, i) => (
                      <div key={i} style={styles.galleryItemTech}>
                        <img
                          src={img}
                          alt={`Correção ${i + 1}`}
                          style={styles.printThumbTech}
                          onClick={() => setModalZoomImagem({ imagens: imagensCorrecao, index: i })}
                          title="Clique para ampliar"
                        />
                        <button
                          type="button"
                          style={styles.btnRemoveImgCorrecao}
                          onClick={() => setImagensCorrecao((prev) => prev.filter((_, idx) => idx !== i))}
                          title="Remover este print"
                        >
                          ✖
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label style={styles.uploadCorrecaoBtn}>
                  📁 Selecionar imagens do computador
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      for (const file of files) {
                        processarImagem(file, (dataUrl) => setImagensCorrecao((prev) => [...prev, dataUrl]));
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.btnModalCancel}
                onClick={() => { setModalCorrecao(null); setTextoCorrecao(""); setImagensCorrecao([]); }}
                disabled={salvandoCorrecaoCenario}
              >
                Cancelar
              </button>
              <button
                style={styles.btnSalvarCorrecao}
                onClick={salvarCorrecaoCenario}
                disabled={salvandoCorrecaoCenario}
              >
                {salvandoCorrecaoCenario ? "Salvando..." : "✔ Marcar como Corrigido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LIGHTBOX / ZOOM DE IMAGEM COM NAVEGAÇÃO DE GALERIA */}
      {modalZoomImagem && (() => {
        const list = Array.isArray(modalZoomImagem.imagens)
          ? modalZoomImagem.imagens
          : typeof modalZoomImagem === "string"
          ? [modalZoomImagem]
          : [];
        const idx = typeof modalZoomImagem.index === "number" ? modalZoomImagem.index : 0;
        const currentImg = list[idx] || list[0];

        return (
          <div style={styles.lightboxOverlay} onClick={() => setModalZoomImagem(null)}>
            <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.lightboxHeader}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                  <ImageIcon size={16} /> Print / Evidência do Erro {list.length > 1 ? `(${idx + 1} de ${list.length})` : ""}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {list.length > 1 && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        style={styles.btnLightboxNav}
                        disabled={idx === 0}
                        onClick={() => setModalZoomImagem({ imagens: list, index: Math.max(0, idx - 1) })}
                        title="Print Anterior"
                      >
                        <ChevronLeft size={18} color={idx === 0 ? "#64748b" : "#fff"} />
                      </button>
                      <button
                        style={styles.btnLightboxNav}
                        disabled={idx === list.length - 1}
                        onClick={() => setModalZoomImagem({ imagens: list, index: Math.min(list.length - 1, idx + 1) })}
                        title="Próximo Print"
                      >
                        <ChevronRight size={18} color={idx === list.length - 1 ? "#64748b" : "#fff"} />
                      </button>
                    </div>
                  )}
                  <button style={styles.btnLightboxClose} onClick={() => setModalZoomImagem(null)}>
                    <X size={20} color="#fff" />
                  </button>
                </div>
              </div>
              <div style={styles.lightboxImgWrap}>
                <img src={currentImg} alt={`Print ${idx + 1}`} style={styles.lightboxImage} />
              </div>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}

async function salvarEndpoints(tarefaId, novosEndpoints, setErro) {
  try {
    await apiPatch(`/rest/v1/controle_api?id=eq.${tarefaId}`, {
      endpoints: novosEndpoints
    });
  } catch (e) {
    setErro(String(e.message || e));
  }
}

function EndpointsEditor({ tarefa, setErro }) {
  const [endpoints, setEndpoints] = useState(tarefa.endpoints || []);

  function adicionar() {
    setEndpoints([...endpoints, ""]);
  }

  function atualizar(index, valor) {
    const novos = [...endpoints];
    novos[index] = valor;
    setEndpoints(novos);
  }

  function remover(index) {
    const novos = endpoints.filter((_, i) => i !== index);
    setEndpoints(novos);
    salvarEndpoints(tarefa.id, novos, setErro);
  }

  function salvarNoBlur() {
    salvarEndpoints(tarefa.id, endpoints, setErro);
  }

  return (
    <div style={styles.endpointsWrap}>
      <div style={styles.endpointsTitle}>Endpoints</div>
      {endpoints.map((ep, i) => (
        <div key={i} style={styles.endpointRow}>
          <input
            style={styles.endpointInput}
            value={ep}
            placeholder="Ex: /rest/v1/rota..."
            onChange={(e) => atualizar(i, e.target.value)}
            onBlur={salvarNoBlur}
          />
          <button style={styles.btnRemoveEp} onClick={() => remover(i)} title="Remover endpoint">
            ✖
          </button>
        </div>
      ))}
      <button style={styles.btnAddEp} onClick={adicionar}>
        + Adicionar Endpoint
      </button>
    </div>
  );
}

// Processa/comprime imagem (igual ao QATestes) para anexar a correção.
function processarImagem(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const MAX = 1200;
      if (width > height) {
        if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
      } else {
        if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Extrai as imagens da correção (mesmo formato de evidencia_imagem).
function getImagensCorrecao(cenario) {
  if (!cenario || !cenario.evidencia_correcao) return [];
  if (Array.isArray(cenario.evidencia_correcao)) return cenario.evidencia_correcao;
  try {
    const parsed = JSON.parse(cenario.evidencia_correcao);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
    if (typeof parsed === "string" && parsed.trim()) return [parsed];
  } catch {
    if (typeof cenario.evidencia_correcao === "string" && cenario.evidencia_correcao.trim()) {
      return [cenario.evidencia_correcao];
    }
  }
  return [];
}

function isConcluida(t) {
  if (!t) return false;
  if (t.tipo_tabela === "Arquitetura") {
    return t.status_api === "Finalizado";
  }
  return (
    t.status_api === "Finalizado" &&
    t.status_teste === "Finalizado" &&
    t.status_documentacao === "Finalizado"
  );
}

function StatusSelect({ label, value, onChange }) {
  return (
    <div style={styles.statusBox}>
      <div style={styles.statusLabel}>{label}</div>
      <select
        style={styles.select}
        value={value || "Pendente"}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="Pendente">Pendente</option>
        <option value="Trabalhando">Trabalhando</option>
        <option value="Finalizado">Finalizado</option>
      </select>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

function btn(active) {
  return { ...styles.btn, opacity: active ? 1 : 0.6 };
}

function btnDanger(active) {
  return {
    ...styles.btn,
    borderColor: active ? "#ef4444" : "#e5e7eb",
    color: active ? "#ef4444" : "#111827",
    opacity: active ? 1 : 0.6,
  };
}

function btnWarning(active) {
  return {
    ...styles.btn,
    borderColor: active ? "#f59e0b" : "#e5e7eb",
    color: active ? "#d97706" : "#111827",
    opacity: active ? 1 : 0.6,
  };
}

function formatarHHMM(horasDecimais) {
  const h = Math.floor(horasDecimais);
  const m = Math.floor((horasDecimais - h) * 60);
  return `${h}h ${m}m`;
}

const styles = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "16px 20px", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)" },
  cardTitle: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  cardValue: { fontSize: 26, fontWeight: 900, color: "#0f172a", marginTop: 4 },

  list: { display: "flex", flexDirection: "column", gap: 12 },

  taskCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 18,
    background: "#fff",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
    transition: "all 0.15s ease"
  },

  taskTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  taskTitle: { fontSize: 16, fontWeight: 800, color: "#0f172a" },
  taskSub: { fontSize: 12, color: "#64748b", marginTop: 2 },

  statePill: {
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569"
  },

  timeSpent: {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "monospace",
    color: "#0f172a",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    padding: "6px 12px",
    borderRadius: 10,
  },

  actions: { display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" },
  btn: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "8px 14px",
    cursor: "pointer",
    background: "#fff",
    color: "#334155",
    fontWeight: 700,
    fontSize: 12,
    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
    transition: "all 0.15s ease"
  },

  statusRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 14 },
  statusBox: { background: "#f8fafc", padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" },
  statusLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 },
  select: { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, color: "#1e293b", fontWeight: 600 },

  obsWrap: { marginTop: 14 },
  textarea: { width: "100%", minHeight: 70, padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, color: "#1e293b" },

  endpointsWrap: { marginTop: 16, background: "#f8fafc", padding: 14, borderRadius: 12, border: "1px dashed #cbd5e1" },
  endpointsTitle: { fontSize: 12, fontWeight: 800, marginBottom: 10, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" },
  endpointRow: { display: "flex", gap: 8, marginBottom: 8 },
  endpointInput: { flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, color: "#1e293b" },
  btnRemoveEp: { background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 8, padding: "0 12px", cursor: "pointer", fontWeight: "bold" },
  btnAddEp: { background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 700, color: "#334155", marginTop: 4, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.04)" },

  err: {
    marginTop: 10,
    background: "#FEF2F2",
    color: "#991B1B",
    padding: 10,
    borderRadius: 12,
  },

  /* ESTILOS QA */
  reprovadoBanner: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10
  },
  btnVerErroQa: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer"
  },
  btnReprovadoAction: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12
  },
  btnVerPrintBanner: {
    background: "#fff",
    border: "1px solid #dc2626",
    color: "#dc2626",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4
  },
  btnVerPrintAction: {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    borderRadius: 10,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 4
  },
  badgeReprovado: {
    marginLeft: 8,
    background: "#fee2e2",
    color: "#dc2626",
    border: "1px solid #fca5a5",
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 800
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: 16
  },
  modalCard: {
    background: "#fff",
    borderRadius: 14,
    width: "100%",
    maxWidth: 920,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  correcaoModalCard: {
    background: "#fff",
    borderRadius: 14,
    width: "100%",
    maxWidth: 640,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  qaErrorHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6
  },
  btnCorrigidoCenario: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  todosCorrigidosBox: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "16px 18px",
    textAlign: "center"
  },
  btnRemoveImgCorrecao: {
    position: "absolute",
    top: 2,
    right: 2,
    background: "rgba(220,38,38,0.9)",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    width: 20,
    height: 20,
    fontSize: 11,
    cursor: "pointer",
    lineHeight: 1
  },
  uploadCorrecaoBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    padding: "8px 14px",
    border: "1px dashed #cbd5e1",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    cursor: "pointer",
    background: "#f8fafc",
    width: "fit-content"
  },
  btnSalvarCorrecao: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer"
  },
  modalHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #fee2e2",
    background: "#fff"
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#991b1b",
    margin: 0
  },
  modalSubHeader: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    display: "block"
  },
  modalBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    maxHeight: "65vh",
    overflowY: "auto"
  },
  qaErrorsList: {
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  qaErrorCard: {
    background: "#fef2f2",
    border: "1px solid #fee2e2",
    borderRadius: 8,
    padding: "10px 12px"
  },
  qaErrorHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4
  },
  qaErrorBadge: {
    fontSize: 10,
    fontWeight: 800,
    background: "#fee2e2",
    color: "#b91c1c",
    border: "1px solid #fca5a5",
    padding: "2px 6px",
    borderRadius: 4
  },
  qaErrorDesc: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4
  },
  qaErrorObs: {
    fontSize: 12,
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px dashed #fecaca"
  },
  correcaoField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 6
  },
  correcaoLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#1e293b"
  },
  correcaoTextarea: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 13,
    outline: "none",
    resize: "vertical"
  },
  modalFooter: {
    padding: "14px 20px",
    borderTop: "1px solid #f1f5f9",
    background: "#f8fafc",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10
  },
  btnModalCancel: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    color: "#475569",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  },
  btnModalReturnQa: {
    background: "#16a34a",
    border: "none",
    color: "#fff",
    borderRadius: 8,
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer"
  },

  /* ESTILOS DE PRINT / LIGHTBOX */
  printContainerTech: {
    marginTop: 8,
    padding: "8px 10px",
    background: "#fff",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  printHeaderTech: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 11,
    color: "#991b1b"
  },
  btnZoomPrintTech: {
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer"
  },
  galleryGridTech: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  },
  galleryItemTech: {
    position: "relative",
    cursor: "pointer",
    borderRadius: 6,
    overflow: "hidden",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    lineHeight: 0
  },
  galleryBadgeTech: {
    position: "absolute",
    bottom: 4,
    right: 4,
    background: "rgba(15, 23, 42, 0.75)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    padding: "1px 5px",
    borderRadius: 4
  },
  printThumbTech: {
    height: 90,
    width: 140,
    objectFit: "cover",
    cursor: "pointer",
    background: "#f8fafc"
  },
  lightboxOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.85)",
    backdropFilter: "blur(6px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
    padding: 20
  },
  lightboxContent: {
    maxWidth: "90vw",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  lightboxHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  btnLightboxNav: {
    background: "rgba(255, 255, 255, 0.2)",
    border: "none",
    borderRadius: 6,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  },
  btnLightboxClose: {
    background: "rgba(255, 255, 255, 0.2)",
    border: "none",
    borderRadius: "50%",
    width: 32,
    height: 32,
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  lightboxImgWrap: {
    overflow: "auto",
    maxHeight: "82vh",
    borderRadius: 8,
    border: "1px solid rgba(255, 255, 255, 0.2)",
    background: "#0f172a",
    display: "flex",
    justifyContent: "center"
  },
  lightboxImage: {
    maxWidth: "100%",
    maxHeight: "80vh",
    objectFit: "contain",
    borderRadius: 6
  }
};
