// Extrai os dados de uma venda a partir do texto do PDF de "impressão de
// documento de saída" emitido pelo Solidus. O PDF tem texto selecionável
// (não é imagem escaneada), então extraímos via posição de cada palavra
// na página (x, y) e reconstruímos linhas e a tabela de itens.
//
// Este parser é específico do layout do Solidus da WG. Se o layout mudar,
// os campos que falharem simplesmente ficam em branco — o usuário sempre
// revisa e completa manualmente antes de salvar, então uma extração
// parcial nunca é destrutiva.

export type PdfTextItem = { text: string; x: number; y: number };

export type ParsedPdfItem = {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

// Uma venda pode ter mais de uma forma de pagamento (ex.: parte no
// crédito, parte no débito). O Solidus repete o bloco "FORMA DE
// PAGAMENTO: / VALOR: / TOTAL DE PARCELAS:" uma vez para cada uma.
export type ParsedPdfPayment = {
  label: string;
  amount: number;
  installments: number | null;
};

export type ParsedPdfSale = {
  saleNumber: string | null;
  saleDate: string | null; // yyyy-mm-dd
  saleType: string | null;
  sellerName: string | null;
  customerName: string | null;
  customerDocument: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  items: ParsedPdfItem[];
  totalAmount: number | null;
  payments: ParsedPdfPayment[];
  notes: string | null;
  // Endereço/telefone da LOJA (filial) que emitiu o documento — vem no
  // cabeçalho, logo abaixo do nome da empresa. Usado para localizar ou
  // cadastrar automaticamente a filial correspondente.
  branchAddress: string | null;
  branchPhone: string | null;
  branchName: string | null;
};

// Faixas de coluna da tabela de itens, em pontos (coordenada x do início
// da palavra). Calibradas a partir de exports reais do Solidus.
const COLUMNS = {
  code: [0, 90] as const,
  description: [90, 290] as const,
  quantity: [290, 330] as const,
  unit: [330, 380] as const,
  unitPrice: [380, 430] as const,
  totalPrice: [430, 480] as const,
};

function inColumn(x: number, col: readonly [number, number]) {
  return x >= col[0] && x < col[1];
}

function parseBrNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseBrDate(raw: string): string | null {
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

// Agrupa palavras em "linhas" quando a distância vertical entre elas é
// pequena. threshold maior agrupa mais (útil para juntar sub-linhas de uma
// mesma célula da tabela); threshold menor mantém linhas de texto corrido
// separadas.
function clusterByY(items: PdfTextItem[], threshold: number): PdfTextItem[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const clusters: PdfTextItem[][] = [];
  let current: PdfTextItem[] = [];
  let lastY: number | null = null;

  for (const item of sorted) {
    if (lastY === null || item.y - lastY <= threshold) {
      current.push(item);
    } else {
      if (current.length > 0) clusters.push(current);
      current = [item];
    }
    lastY = item.y;
  }
  if (current.length > 0) clusters.push(current);
  return clusters;
}

function lineText(items: PdfTextItem[]): string {
  return [...items]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((i) => i.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseItemCluster(cluster: PdfTextItem[]): ParsedPdfItem | null {
  const quantityWord = cluster.find(
    (i) => inColumn(i.x, COLUMNS.quantity) && /^\d+$/.test(i.text)
  );
  const unitWord = cluster.find(
    (i) => inColumn(i.x, COLUMNS.unit) && /^[A-Za-zÀ-ÿ]{1,6}$/.test(i.text)
  );
  const totalWord = cluster.find(
    (i) => inColumn(i.x, COLUMNS.totalPrice) && /^[\d.,]+$/.test(i.text)
  );

  // Assinatura de uma linha de item real: precisa ter quantidade, unidade
  // e valor total nas colunas certas. Sem isso, é um bloco de outra coisa
  // (ex.: "Local de Estocagem").
  if (!quantityWord || !unitWord || !totalWord) return null;

  const unitPriceWord = cluster.find(
    (i) => inColumn(i.x, COLUMNS.unitPrice) && /^[\d.,]+$/.test(i.text)
  );

  const codeText = lineText(cluster.filter((i) => inColumn(i.x, COLUMNS.code)));
  const descriptionText = lineText(
    cluster.filter((i) => inColumn(i.x, COLUMNS.description))
  );

  const quantity = parseInt(quantityWord.text, 10);
  const unitPrice = unitPriceWord ? parseBrNumber(unitPriceWord.text) : null;
  const totalPrice = parseBrNumber(totalWord.text);

  if (!codeText || !descriptionText || totalPrice === null) return null;

  return {
    code: codeText.replace(/\s+/g, ""),
    description: descriptionText,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    unitPrice: unitPrice ?? totalPrice,
    totalPrice,
  };
}

export function parseSolidusPdf(items: PdfTextItem[]): ParsedPdfSale {
  // Linhas de texto "corrido" (cabeçalho, rodapé) — threshold pequeno para
  // não misturar linhas adjacentes que não pertencem à mesma frase.
  const headerLines = clusterByY(items, 2).map(lineText);
  const fullHeaderText = headerLines.join("\n");

  const saleNumberMatch = fullHeaderText.match(/Lan[çc]amento:\s*(\d+)/i);
  const saleDateMatch = fullHeaderText.match(/(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}:\d{2}/);
  const saleTypeMatch = fullHeaderText.match(/Opera[çc][aã]o:\s*(.+)/i);
  const sellerMatch = fullHeaderText.match(
    /Vendedor:\s*([\s\S]*?)(?=\n?Opera[çc][aã]o:|\nCLIENTE:|$)/i
  );
  const customerNameMatch = fullHeaderText.match(/CLIENTE:\s*(.+)/i);
  const documentMatch = fullHeaderText.match(/CPF:\s*([\d./-]+)/i);
  const cnpjMatch = fullHeaderText.match(/CNPJ:\s*([\d./-]+)/i);
  const addressMatch = fullHeaderText.match(
    /ENDERE[ÇC]O:\s*([\s\S]*?)(?=\n?FONES?:|\nTelefone:|$)/i
  );
  const phoneMatch = fullHeaderText.match(/\bFONES?:\s*([\d()\s.-]+?)(?:\n|$)/i);
  const totalMatch = fullHeaderText.match(/(?:^|\n)TOTAL:\s*R?\$?\s*([\d.,]+)/i);

  // Endereço da loja: é a linha que contém um logradouro (Avenida, Rua,
  // Alameda etc.) e vem logo antes da linha "Telefone:" no cabeçalho —
  // diferente do endereço do CLIENTE, que vem identificado por "ENDEREÇO:".
  const branchAddressMatch = fullHeaderText.match(
    /\n((?:Avenida|Alameda|Rua|Rod(?:ovia)?\.?|Estrada|Travessa|Pra[çc]a|Al\.|Av\.)[\s\S]*?)\n(?:Telefone:|Vendedor:|Opera[çc][aã]o:)/i
  );
  const branchPhoneMatch = fullHeaderText.match(/\nTelefone:\s*([\d()\s.-]+?)(?:\n|$)/i);

  // Cada forma de pagamento vem em um bloco de 3 linhas seguidas. Divide
  // o texto a cada ocorrência de "FORMA DE PAGAMENTO:" para não misturar
  // o VALOR/parcelas de uma forma com a de outra quando há mais de uma.
  const paymentSections = fullHeaderText
    .split(/(?=FORMA DE PAGAMENTO:)/i)
    .filter((section) => /FORMA DE PAGAMENTO:/i.test(section));
  const payments: ParsedPdfPayment[] = paymentSections
    .map((section) => {
      const labelMatch = section.match(/FORMA DE PAGAMENTO:\s*(.+)/i);
      const valorMatch = section.match(/VALOR:\s*([\d.,]+)/i);
      const parcelasMatch = section.match(/TOTAL DE PARCELAS:\s*(\d+)/i);
      const label = labelMatch?.[1]?.trim() ?? "";
      const amount = valorMatch ? parseBrNumber(valorMatch[1]) : null;
      return {
        label,
        amount: amount ?? 0,
        installments: parcelasMatch ? parseInt(parcelasMatch[1], 10) : null,
      };
    })
    .filter((p) => p.label.length > 0);

  const notesMatch = fullHeaderText.match(
    /Observa[çc][oõ]es:\s*([\s\S]*?)(?:\n_{4,}|\nINFORMA[ÇC][ÕO]ES|$)/i
  );

  const branchAddress = branchAddressMatch?.[1]?.replace(/\s+/g, " ").trim() || null;
  let branchName: string | null = null;
  if (branchAddress) {
    // Deriva um nome legível pra filial a partir do endereço: cidade (o
    // trecho antes de "- UF,") e, se houver, o número da loja ("Loja 2").
    const cityMatch = branchAddress.match(/,\s*([^,]+?)\s*-\s*[A-Z]{2}\b/);
    const lojaMatch = branchAddress.match(/\bLoja\s*(\d+)\b/i);
    const city = cityMatch?.[1]?.trim();
    if (city) {
      branchName = lojaMatch ? `Loja ${lojaMatch[1]} - ${city}` : city;
    }
  }

  // Tabela de itens: threshold maior agrupa as sub-linhas de uma mesma
  // célula (código quebrado em duas linhas, descrição em duas ou três
  // linhas). Calibrado a partir de exports reais: a distância entre
  // sub-linhas de descrição de um mesmo item é ~9.2pt, enquanto a
  // distância até o bloco seguinte ("Local de Estocagem") é ~11.6pt —
  // 10 fica entre os dois, juntando as linhas de um item sem grudar no
  // próximo.
  const itemClusters = clusterByY(items, 10);
  const items_: ParsedPdfItem[] = [];
  for (const cluster of itemClusters) {
    const parsed = parseItemCluster(cluster);
    if (parsed) items_.push(parsed);
  }

  return {
    saleNumber: saleNumberMatch?.[1] ?? null,
    saleDate: saleDateMatch ? parseBrDate(saleDateMatch[1]) : null,
    saleType: saleTypeMatch?.[1]?.trim() ?? null,
    sellerName: sellerMatch?.[1]?.replace(/\s+/g, " ").trim() || null,
    customerName: customerNameMatch?.[1]?.trim() ?? null,
    customerDocument: (documentMatch?.[1] ?? cnpjMatch?.[1])?.trim() ?? null,
    customerPhone: phoneMatch?.[1]?.trim().replace(/\s{2,}/g, " ") ?? null,
    customerAddress: addressMatch?.[1]?.replace(/\s+/g, " ").trim() || null,
    items: items_,
    totalAmount: totalMatch ? parseBrNumber(totalMatch[1]) : null,
    payments,
    notes: notesMatch?.[1]?.trim().replace(/\n+/g, " ") ?? null,
    branchAddress,
    branchPhone: branchPhoneMatch?.[1]?.trim().replace(/\s{2,}/g, " ") ?? null,
    branchName,
  };
}
