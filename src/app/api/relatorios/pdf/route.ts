import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/current-user";
import { DEPARTMENT_LABELS, type TaskDepartment } from "@/lib/departments";
import { ReportPdfDocument, type PdfSection } from "@/lib/pdf/ReportDocument";
import { parseDateRange } from "@/lib/report-date-range";

export const runtime = "nodejs";

const TITLES: Record<string, string> = {
  volume: "Volume de protocolos",
  financeiro: "Financeiro",
  filiais: "Desempenho por filial",
  "tempo-resolucao": "Tempo de resolução",
  tarefas: "Tarefas",
  usuarios: "Desempenho por usuário",
};

function formatMoney(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function deptLabel(d: string) {
  return DEPARTMENT_LABELS[d as TaskDepartment] ?? d;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const supabase = await createClient();
  const { data: canView } = await supabase.rpc("has_report_access", { p_user_id: user.id });
  if (!canView) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";
  const title = TITLES[type];
  if (!title) {
    return NextResponse.json({ error: "Tipo de relatório inválido." }, { status: 400 });
  }

  const range = parseDateRange({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  const { from, fromIso, toIso } = range;
  const toDisplay = new Date(range.to.getTime() - 24 * 60 * 60 * 1000);
  const periodLabel = `${from.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} — ${toDisplay.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;

  const sections: PdfSection[] = [];

  if (type === "volume") {
    const [{ data: byType }, { data: byReason }] = await Promise.all([
      supabase.rpc("report_volume_by_type", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_volume_by_reason", { p_from: fromIso, p_to: toIso }),
    ]);
    sections.push({
      title: "Volume de protocolos por tipo",
      columns: [
        { key: "type", label: "Tipo" },
        { key: "cnt", label: "Qtd", align: "right", width: 20 },
      ],
      rows: (byType ?? []).map((r: { type_name: string; cnt: number }) => ({
        type: r.type_name,
        cnt: r.cnt,
      })),
    });
    sections.push({
      title: "Top motivos",
      columns: [
        { key: "reason", label: "Motivo" },
        { key: "cnt", label: "Qtd", align: "right", width: 20 },
      ],
      rows: (byReason ?? []).map((r: { reason_name: string; cnt: number }) => ({
        reason: r.reason_name,
        cnt: r.cnt,
      })),
    });
  }

  if (type === "financeiro") {
    const [{ data: byMonth }, { data: bySalesperson }] = await Promise.all([
      supabase.rpc("report_financial_by_month", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_financial_by_salesperson", { p_from: fromIso, p_to: toIso }),
    ]);
    sections.push({
      title: "Impacto financeiro por mês",
      columns: [
        { key: "month", label: "Mês" },
        { key: "total", label: "Impacto (R$)", align: "right", width: 30 },
      ],
      rows: (byMonth ?? []).map((r: { month_label: string; total_impact: number }) => ({
        month: r.month_label,
        total: formatMoney(r.total_impact),
      })),
    });
    sections.push({
      title: "Impacto financeiro por vendedor",
      subtitle: "Só o valor efetivamente estornado ao cliente (não inclui crédito cliente).",
      columns: [
        { key: "salesperson", label: "Vendedor" },
        { key: "cnt", label: "Protocolos", align: "right", width: 20 },
        { key: "total", label: "Impacto (R$)", align: "right", width: 25 },
      ],
      rows: (bySalesperson ?? []).map((r: { salesperson_name: string; cnt: number; total_impact: number }) => ({
        salesperson: r.salesperson_name,
        cnt: r.cnt,
        total: formatMoney(r.total_impact),
      })),
    });
  }

  if (type === "filiais") {
    const [{ data: perf }, { data: reasons }, { data: comparison }] = await Promise.all([
      supabase.rpc("report_branch_performance", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_reasons_by_branch", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_branch_comparison", { p_from: fromIso, p_to: toIso }),
    ]);
    sections.push({
      title: "Desempenho por filial",
      columns: [
        { key: "branch", label: "Filial" },
        { key: "cnt", label: "Protocolos", align: "right", width: 20 },
        { key: "total", label: "Impacto (R$)", align: "right", width: 25 },
      ],
      rows: (perf ?? []).map((r: { branch_name: string; cnt: number; total_impact: number }) => ({
        branch: r.branch_name,
        cnt: r.cnt,
        total: formatMoney(r.total_impact),
      })),
    });
    sections.push({
      title: "Filiais comparadas",
      subtitle: "Volume, tempo médio de resolução e % dentro do prazo.",
      columns: [
        { key: "branch", label: "Filial" },
        { key: "cnt", label: "Protocolos", align: "right", width: 20 },
        { key: "avg", label: "Tempo médio", align: "right", width: 20 },
        { key: "pct", label: "% no prazo", align: "right", width: 20 },
      ],
      rows: (comparison ?? []).map((r: { branch_name: string; cnt: number; avg_resolution_days: number | null; pct_on_time: number | null }) => ({
        branch: r.branch_name,
        cnt: r.cnt,
        avg: r.avg_resolution_days != null ? `${r.avg_resolution_days} dias` : "—",
        pct: r.pct_on_time != null ? `${r.pct_on_time}%` : "—",
      })),
    });
    sections.push({
      title: "Motivos por filial",
      subtitle: "Combinações mais frequentes no período (até 50).",
      columns: [
        { key: "branch", label: "Filial", width: 35 },
        { key: "reason", label: "Motivo" },
        { key: "cnt", label: "Qtd", align: "right", width: 15 },
      ],
      rows: (reasons ?? []).map((r: { branch_name: string; reason_name: string; cnt: number }) => ({
        branch: r.branch_name,
        reason: r.reason_name,
        cnt: r.cnt,
      })),
    });
  }

  if (type === "compras") {
    const [{ data: summary }, { data: byKind }, { data: byResponder }] = await Promise.all([
      supabase.rpc("report_purchasing_summary", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_purchasing_by_kind", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_purchasing_by_responder", { p_from: fromIso, p_to: toIso }),
    ]);
    const kindLabel = (k: string) => ({ preco_custo: "Preço de Produto", cadastro: "Cadastro de produto", prazo_encomenda: "Prazo de encomenda" }[k] ?? k);
    const s = summary?.[0] as { total: number; pendente: number; concluido: number; avg_response_hours: number | null } | undefined;
    sections.push({
      title: "Resumo",
      columns: [
        { key: "label", label: "" },
        { key: "value", label: "" },
      ],
      rows: [
        { label: "Total no período", value: String(s?.total ?? 0) },
        { label: "Pendentes", value: String(s?.pendente ?? 0) },
        { label: "Concluídas", value: String(s?.concluido ?? 0) },
        { label: "Tempo médio de resposta", value: s?.avg_response_hours != null ? `${s.avg_response_hours}h` : "—" },
      ],
    });
    sections.push({
      title: "Por tipo de solicitação",
      columns: [
        { key: "kind", label: "Tipo" },
        { key: "cnt", label: "Qtd", align: "right", width: 15 },
        { key: "avg", label: "Tempo médio", align: "right", width: 20 },
      ],
      rows: (byKind ?? []).map((r: { kind: string; cnt: number; avg_response_hours: number | null }) => ({
        kind: kindLabel(r.kind),
        cnt: r.cnt,
        avg: r.avg_response_hours != null ? `${r.avg_response_hours}h` : "—",
      })),
    });
    sections.push({
      title: "Por quem responde",
      columns: [
        { key: "name", label: "Pessoa" },
        { key: "cnt", label: "Respondidas", align: "right", width: 20 },
        { key: "avg", label: "Tempo médio", align: "right", width: 20 },
      ],
      rows: (byResponder ?? []).map((r: { responder_name: string; cnt: number; avg_response_hours: number | null }) => ({
        name: r.responder_name,
        cnt: r.cnt,
        avg: r.avg_response_hours != null ? `${r.avg_response_hours}h` : "—",
      })),
    });
  }

  if (type === "tarefas-avulsas") {
    const [{ data: byCreator }, { data: byClaimer }, { data: dismissal }] = await Promise.all([
      supabase.rpc("report_standalone_tasks_by_creator", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_standalone_tasks_by_claimer", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_standalone_dismissal_rate", { p_from: fromIso, p_to: toIso }),
    ]);
    const d = dismissal?.[0] as { total: number; completed: number; dismissed: number; dismissal_rate: number | null } | undefined;
    sections.push({
      title: "Resumo",
      columns: [
        { key: "label", label: "" },
        { key: "value", label: "" },
      ],
      rows: [
        { label: "Taxa de dispensa", value: d?.dismissal_rate != null ? `${d.dismissal_rate}%` : "—" },
        { label: "Concluídas", value: String(d?.completed ?? 0) },
        { label: "Dispensadas", value: String(d?.dismissed ?? 0) },
      ],
    });
    sections.push({
      title: "Quem mais cria",
      columns: [
        { key: "name", label: "Pessoa" },
        { key: "cnt", label: "Qtd", align: "right", width: 20 },
      ],
      rows: (byCreator ?? []).map((r: { user_name: string; cnt: number }) => ({ name: r.user_name, cnt: r.cnt })),
    });
    sections.push({
      title: "Quem mais assume",
      columns: [
        { key: "name", label: "Pessoa" },
        { key: "cnt", label: "Qtd", align: "right", width: 20 },
      ],
      rows: (byClaimer ?? []).map((r: { user_name: string; cnt: number }) => ({ name: r.user_name, cnt: r.cnt })),
    });
  }

  if (type === "diferenca-credito") {
    const [{ data: summary }, { data: byBranch }] = await Promise.all([
      supabase.rpc("report_difference_and_credit", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_difference_by_branch", { p_from: fromIso, p_to: toIso }),
    ]);
    const s = summary?.[0] as {
      cnt_with_difference: number; total_difference: number; avg_difference: number | null;
      cnt_with_credit: number; total_credit: number;
    } | undefined;
    sections.push({
      title: "Resumo",
      columns: [
        { key: "label", label: "" },
        { key: "value", label: "" },
      ],
      rows: [
        { label: "Total em diferença paga", value: `R$ ${formatMoney(s?.total_difference ?? 0)}` },
        { label: "Diferença média", value: s?.avg_difference != null ? `R$ ${formatMoney(s.avg_difference)}` : "—" },
        { label: "Total em crédito cliente", value: `R$ ${formatMoney(s?.total_credit ?? 0)}` },
      ],
    });
    sections.push({
      title: "Por filial",
      columns: [
        { key: "branch", label: "Filial" },
        { key: "diff", label: "Diferença paga (R$)", align: "right", width: 25 },
        { key: "credit", label: "Crédito cliente (R$)", align: "right", width: 25 },
      ],
      rows: (byBranch ?? []).map((r: { branch_name: string; total_difference: number; total_credit: number }) => ({
        branch: r.branch_name,
        diff: formatMoney(r.total_difference),
        credit: formatMoney(r.total_credit),
      })),
    });
  }

  if (type === "produtividade") {
    const { data } = await supabase.rpc("report_productivity_by_user", { p_from: fromIso, p_to: toIso });
    sections.push({
      title: "Produtividade por pessoa",
      columns: [
        { key: "name", label: "Pessoa" },
        { key: "protocols", label: "Protocolos", align: "right", width: 15 },
        { key: "tasks", label: "Tarefas", align: "right", width: 15 },
        { key: "standalone", label: "Avulsas criadas", align: "right", width: 18 },
        { key: "purchasing", label: "Compras", align: "right", width: 15 },
      ],
      rows: (data ?? []).map((r: {
        user_name: string; protocols_opened: number; tasks_completed: number;
        standalone_created: number; purchasing_responded: number;
      }) => ({
        name: r.user_name,
        protocols: r.protocols_opened,
        tasks: r.tasks_completed,
        standalone: r.standalone_created,
        purchasing: r.purchasing_responded,
      })),
    });
  }

  if (type === "tempo-resolucao") {
    const [{ data: byType }, { data: byUser }] = await Promise.all([
      supabase.rpc("report_resolution_time_by_type", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_resolution_time_by_user", { p_from: fromIso, p_to: toIso }),
    ]);
    sections.push({
      title: "Tempo médio de resolução por tipo",
      subtitle: "Só considera protocolos concluídos no período.",
      columns: [
        { key: "type", label: "Tipo" },
        { key: "avg", label: "Média (dias)", align: "right", width: 25 },
        { key: "cnt", label: "Concluídos", align: "right", width: 20 },
      ],
      rows: (byType ?? []).map((r: { type_name: string; avg_days: number; cnt: number }) => ({
        type: r.type_name,
        avg: r.avg_days,
        cnt: r.cnt,
      })),
    });
    sections.push({
      title: "Tempo médio de resolução por usuário",
      columns: [
        { key: "user", label: "Usuário" },
        { key: "avg", label: "Média (dias)", align: "right", width: 25 },
        { key: "cnt", label: "Concluídos", align: "right", width: 20 },
      ],
      rows: (byUser ?? []).map((r: { user_name: string; avg_days: number; cnt: number }) => ({
        user: r.user_name,
        avg: r.avg_days,
        cnt: r.cnt,
      })),
    });
  }

  if (type === "prazos") {
    const [{ data: summary }, { data: byDept }, { data: overdueNow }] = await Promise.all([
      supabase.rpc("report_deadline_summary", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_deadline_by_department", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_currently_overdue", { p_limit: 30 }),
    ]);
    sections.push({
      title: "Cumprimento de prazo por categoria",
      columns: [
        { key: "cat", label: "Categoria" },
        { key: "total", label: "Total", align: "right", width: 15 },
        { key: "on_time", label: "No prazo", align: "right", width: 15 },
        { key: "late", label: "Atrasados", align: "right", width: 15 },
        { key: "pct", label: "% no prazo", align: "right", width: 15 },
      ],
      rows: (summary ?? []).map((r: { category: string; total: number; on_time: number; late: number; pct_on_time: number | null }) => ({
        cat: r.category,
        total: r.total,
        on_time: r.on_time,
        late: r.late,
        pct: r.pct_on_time != null ? `${r.pct_on_time}%` : "—",
      })),
    });
    sections.push({
      title: "Tarefas por setor",
      columns: [
        { key: "dept", label: "Setor" },
        { key: "total", label: "Total", align: "right", width: 15 },
        { key: "late", label: "Atrasadas", align: "right", width: 15 },
        { key: "pct", label: "% no prazo", align: "right", width: 15 },
      ],
      rows: (byDept ?? []).map((r: { department: string; total: number; late: number; pct_on_time: number }) => ({
        dept: deptLabel(r.department),
        total: r.total,
        late: r.late,
        pct: `${r.pct_on_time}%`,
      })),
    });
    sections.push({
      title: "Mais atrasados agora",
      subtitle: "Itens em aberto que já passaram do prazo, dos três tipos.",
      columns: [
        { key: "kind", label: "Tipo" },
        { key: "label", label: "Item" },
        { key: "hours", label: "Atraso", align: "right", width: 20 },
      ],
      rows: (overdueNow ?? []).map((r: { kind: string; label: string; hours_late: number }) => ({
        kind: r.kind,
        label: r.label,
        hours: `${r.hours_late}h`,
      })),
      emptyLabel: "Nada atrasado no momento.",
    });
  }

  if (type === "tarefas") {
    const [{ data: overdue }, { data: completed }, { data: dismissal }] = await Promise.all([
      supabase.rpc("report_overdue_tasks_by_department"),
      supabase.rpc("report_tasks_completed_by_department", { p_from: fromIso, p_to: toIso }),
      supabase.rpc("report_dismissal_rate_by_department", { p_from: fromIso, p_to: toIso }),
    ]);
    sections.push({
      title: "Tarefas em atraso por setor",
      subtitle: "Situação atual — tarefas pendentes de protocolos cujo prazo já passou.",
      columns: [
        { key: "dept", label: "Setor" },
        { key: "cnt", label: "Atrasadas", align: "right", width: 20 },
      ],
      rows: (overdue ?? []).map((r: { department: string; overdue_cnt: number }) => ({
        dept: deptLabel(r.department),
        cnt: r.overdue_cnt,
      })),
      emptyLabel: "Nenhuma tarefa em atraso no momento.",
    });
    sections.push({
      title: "Tarefas concluídas por setor",
      columns: [
        { key: "dept", label: "Setor" },
        { key: "cnt", label: "Concluídas", align: "right", width: 20 },
      ],
      rows: (completed ?? []).map((r: { department: string; cnt: number }) => ({
        dept: deptLabel(r.department),
        cnt: r.cnt,
      })),
    });
    sections.push({
      title: "Taxa de dispensa por setor",
      subtitle: "Entre as tarefas criadas no período já resolvidas, quantas foram dispensadas.",
      columns: [
        { key: "dept", label: "Setor" },
        { key: "rate", label: "Taxa", align: "right", width: 15 },
        { key: "ratio", label: "Dispensadas/Total", align: "right", width: 25 },
      ],
      rows: (dismissal ?? []).map(
        (r: { department: string; completed_cnt: number; dismissed_cnt: number; dismissal_rate: number | null }) => ({
          dept: deptLabel(r.department),
          rate: r.dismissal_rate != null ? `${r.dismissal_rate}%` : "—",
          ratio: `${r.dismissed_cnt}/${r.completed_cnt + r.dismissed_cnt}`,
        }),
      ),
    });
  }

  if (type === "usuarios") {
    const [{ data: byUser }, { data: byUserType }, { data: byUserReason }, { data: tasksByUser }] =
      await Promise.all([
        supabase.rpc("report_protocols_by_user", { p_from: fromIso, p_to: toIso }),
        supabase.rpc("report_protocols_by_user_type", { p_from: fromIso, p_to: toIso }),
        supabase.rpc("report_protocols_by_user_reason", { p_from: fromIso, p_to: toIso }),
        supabase.rpc("report_tasks_completed_by_user", { p_from: fromIso, p_to: toIso }),
      ]);
    sections.push({
      title: "Protocolos por usuário",
      columns: [
        { key: "user", label: "Usuário" },
        { key: "cnt", label: "Protocolos", align: "right", width: 20 },
      ],
      rows: (byUser ?? []).map((r: { user_name: string; cnt: number }) => ({
        user: r.user_name,
        cnt: r.cnt,
      })),
    });
    sections.push({
      title: "Tipo de protocolo por usuário",
      subtitle: "Combinações mais frequentes no período (até 50).",
      columns: [
        { key: "user", label: "Usuário", width: 35 },
        { key: "type", label: "Tipo" },
        { key: "cnt", label: "Qtd", align: "right", width: 15 },
      ],
      rows: (byUserType ?? []).map((r: { user_name: string; type_name: string; cnt: number }) => ({
        user: r.user_name,
        type: r.type_name,
        cnt: r.cnt,
      })),
    });
    sections.push({
      title: "Motivos por usuário",
      subtitle: "Combinações mais frequentes no período (até 50).",
      columns: [
        { key: "user", label: "Usuário", width: 35 },
        { key: "reason", label: "Motivo" },
        { key: "cnt", label: "Qtd", align: "right", width: 15 },
      ],
      rows: (byUserReason ?? []).map((r: { user_name: string; reason_name: string; cnt: number }) => ({
        user: r.user_name,
        reason: r.reason_name,
        cnt: r.cnt,
      })),
    });
    sections.push({
      title: "Tarefas concluídas por usuário",
      columns: [
        { key: "user", label: "Usuário" },
        { key: "cnt", label: "Concluídas", align: "right", width: 20 },
      ],
      rows: (tasksByUser ?? []).map((r: { user_name: string; cnt: number }) => ({
        user: r.user_name,
        cnt: r.cnt,
      })),
    });
  }

  const generatedAtLabel = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const generatedByLabel = user.fullName;

  const buffer = await renderToBuffer(
    createElement(ReportPdfDocument, {
      title,
      periodLabel,
      generatedAtLabel,
      generatedByLabel,
      sections,
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="relatorio-${type}.pdf"`,
    },
  });
}
