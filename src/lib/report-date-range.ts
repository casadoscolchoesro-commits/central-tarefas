/** Lê o período (from/to) da URL, com padrão de últimos 30 dias.
 *
 * `to` nos parâmetros é sempre a última data EXIBIDA (inclusiva); a busca
 * no banco usa um limite exclusivo (`< p_to`), então internamente somamos
 * 1 dia. Usado tanto pelas páginas de relatório quanto pela rota de PDF,
 * pra garantir que os dois sempre concordem no mesmo intervalo.
 */
export function parseDateRange(params: { from?: string; to?: string }) {
  const today = new Date();
  const defaultTo = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const defaultFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const from = params.from ? new Date(params.from) : defaultFrom;
  // Se veio um "to" explícito da URL, é a data de exibição — o limite
  // exclusivo da consulta é o dia seguinte.
  const to = params.to ? new Date(new Date(params.to).getTime() + 24 * 60 * 60 * 1000) : defaultTo;

  return {
    today,
    from,
    to,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    fromStr: from.toISOString().slice(0, 10),
    toStr: new Date(to.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  };
}
