import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { LOGO_TEXTO_WHITE_PNG, LOGO_VERMELHINHA_WHITE_PNG } from "./logo-assets";

const RED = "#b91c3c";
const RED_DARK = "#8b1531";
const GRAPHITE = "#232329";
const GRAPHITE_MUTED = "#6b6b74";
const BORDER = "#e1dfda";
const STRIPE = "#f6f5f3";

const styles = StyleSheet.create({
  page: {
    paddingBottom: 48,
    fontSize: 9,
    color: GRAPHITE,
    fontFamily: "Helvetica",
  },
  header: {
    backgroundColor: RED,
    paddingVertical: 16,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLogoTexto: { height: 26 },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
  headerTitle: { color: "#ffffff", fontSize: 15, fontWeight: 700 },
  headerSubtitle: { color: "#f3cdd4", fontSize: 8, marginTop: 2 },
  headerLogoVermelhinha: { height: 34 },
  body: { paddingHorizontal: 28, paddingTop: 16 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 12,
  },
  metaField: { marginRight: 28, marginBottom: 6 },
  metaLabel: { fontSize: 7, color: GRAPHITE_MUTED, textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 10, color: RED_DARK, fontWeight: 700, marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: GRAPHITE, marginBottom: 6 },
  sectionSubtitle: { fontSize: 8, color: GRAPHITE_MUTED, marginBottom: 6, marginTop: -4 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 2 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: RED },
  tableHeaderCell: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 5,
    paddingHorizontal: 6,
    textTransform: "uppercase",
  },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER },
  tableRowStripe: { backgroundColor: STRIPE },
  tableCell: { fontSize: 9, paddingVertical: 5, paddingHorizontal: 6, color: GRAPHITE },
  tableCellMuted: { fontSize: 8, color: GRAPHITE_MUTED },
  emptyText: { fontSize: 9, color: GRAPHITE_MUTED, fontStyle: "italic" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: GRAPHITE_MUTED,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
  },
});

export type PdfColumn = { key: string; label: string; width?: number; align?: "left" | "right" };
export type PdfSection = {
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: Record<string, string | number>[];
  emptyLabel?: string;
};

/** Sempre retorna a largura em porcentagem — `col.width` é um número de 0
 * a 100 (ex.: 20 = "20%"), nunca pontos. Se não informado, divide
 * igualmente entre as colunas da seção. */
function columnWidth(col: PdfColumn, totalColumns: number): string {
  const pct = col.width ?? 100 / totalColumns;
  return `${pct}%`;
}

export function ReportPdfDocument({
  title,
  periodLabel,
  generatedAtLabel,
  generatedByLabel,
  sections,
}: {
  title: string;
  periodLabel: string;
  generatedAtLabel: string;
  generatedByLabel: string;
  sections: PdfSection[];
}) {
  return (
    <Document title={`Relatório — ${title}`}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Image src={LOGO_TEXTO_WHITE_PNG} style={styles.headerLogoTexto} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>RELATÓRIO — {title.toUpperCase()}</Text>
            <Text style={styles.headerSubtitle}>Central de Cancelamentos — Casa dos Colchões &amp; Estofados</Text>
          </View>
          <Image src={LOGO_VERMELHINHA_WHITE_PNG} style={styles.headerLogoVermelhinha} />
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Período</Text>
              <Text style={styles.metaValue}>{periodLabel}</Text>
            </View>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Gerado em</Text>
              <Text style={styles.metaValue}>{generatedAtLabel}</Text>
            </View>
            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Gerado por</Text>
              <Text style={styles.metaValue}>{generatedByLabel}</Text>
            </View>
          </View>

          {sections.map((section, sIdx) => (
            <View key={sIdx} style={styles.section} wrap={false}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.subtitle && <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>}

              {section.rows.length === 0 ? (
                <Text style={styles.emptyText}>{section.emptyLabel ?? "Sem dados no período."}</Text>
              ) : (
                <View style={styles.table}>
                  <View style={styles.tableHeaderRow}>
                    {section.columns.map((col) => (
                      <Text
                        key={col.key}
                        style={[
                          styles.tableHeaderCell,
                          { width: columnWidth(col, section.columns.length), textAlign: col.align ?? "left" },
                        ]}
                      >
                        {col.label}
                      </Text>
                    ))}
                  </View>
                  {section.rows.map((row, rIdx) => (
                    <View
                      key={rIdx}
                      style={[styles.tableRow, ...(rIdx % 2 === 1 ? [styles.tableRowStripe] : [])]}
                    >
                      {section.columns.map((col) => (
                        <Text
                          key={col.key}
                          style={[
                            styles.tableCell,
                            { width: columnWidth(col, section.columns.length), textAlign: col.align ?? "left" },
                          ]}
                        >
                          {row[col.key] ?? "—"}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Gerado em {generatedAtLabel} por {generatedByLabel}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
