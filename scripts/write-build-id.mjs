// Roda antes de cada build (npm run build) e grava um identificador único
// da versão. Tela aberta e servidor comparam esse valor: se forem
// diferentes, a tela avisa "nova versão disponível, atualize".
import { writeFileSync } from "node:fs";

const buildId = new Date().toISOString();
writeFileSync(
  new URL("../src/lib/build-id.ts", import.meta.url),
  `// Gerado automaticamente por scripts/write-build-id.mjs a cada build.\nexport const BUILD_ID = "${buildId}";\n`
);
writeFileSync(new URL("../public/versao.json", import.meta.url), JSON.stringify({ buildId }));
console.log("build id:", buildId);
