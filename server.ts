import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `Você é o Tesoureiro Sênior da Igreja de Deus Missionária.
Sua missão é realizar a TRANSCRIÇÃO COMPLETA de lançamentos financeiros.

REGRAS DE NOMENCLATURA (OBRIGATÓRIO):
1. "oferta de ceia", "oferta ceia", "culto ceia" -> "OFERTA DO CULTO DE CEIA"
2. "gratific", "gratificação", "pagamento obreiro" -> "GRATIFICAÇÃO DO OBREIRO"
3. "semid", "missões", "repasse" -> "REPASSE SEMIDI"
4. "luz", "energia" -> "ENERGIA ELÉTRICA"
5. "água", "embasa" -> "ÁGUA E ESGOTO"
6. "dizimo" -> "DÍZIMOS"
7. "oferta" -> "OFERTAS"

EXTRAÇÃO DE DADOS:
- Se o usuário disser "oferta de ceia", você deve retornar apenas a ENTRADA. O sistema cuidará da saída automaticamente.
- Extraia Dia, Descrição, Valor e Tipo (ENTRADA ou SAIDA).
- Retorne APENAS o JSON no formato solicitado.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    header: {
      type: Type.OBJECT,
      properties: {
        month: { type: Type.STRING },
        year: { type: Type.STRING },
        previousBalance: { type: Type.NUMBER }
      }
    },
    transactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING },
          description: { type: Type.STRING },
          value: { type: Type.NUMBER },
          type: { type: Type.STRING, enum: ["ENTRADA", "SAIDA"] }
        },
        required: ["description", "value", "type"],
      }
    }
  },
  required: ["transactions"]
};

// Lazy initialization of Gemini SDK as required by security guidelines
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY não configurada. Por favor, adicione-a em Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use increased body limit to support document base64 uploads safely
  app.use(express.json({ limit: '20mb' }));

  // API Endpoints
  // Endpoint to parse direct/voice input
  app.post("/api/gemini/parse-input", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "O texto de lançamento é obrigatório." });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Processe este lançamento: "${text}"`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const parsedText = response.text;
      if (!parsedText) {
        return res.status(500).json({ error: "Gemini não retornou dados para este lançamento." });
      }

      return res.json(JSON.parse(parsedText));
    } catch (error: any) {
      console.error("[Backend] Erro no /api/gemini/parse-input:", error);
      return res.status(500).json({ error: error?.message || "Erro interno do servidor." });
    }
  });

  // Endpoint to scan / OCR complete document
  app.post("/api/gemini/parse-document", async (req, res) => {
    try {
      const { base64Data, mimeType } = req.body;
      if (!base64Data || !mimeType) {
        return res.status(400).json({ error: "Dados do arquivo e tipo MIME são necessários." });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: `AJA COMO UM SCANNER DE ALTA PRECISÃO.
Sua tarefa é extrair TODOS os dados deste relatório financeiro para restaurar o estado do app.

DADOS DO CABEÇALHO:
1. Mês e Ano (ex: "JANEIRO", "2024").
2. Saldo Anterior (o valor que inicia o mês).

DADOS DAS TRANSAÇÕES:
- Extraia cada linha da tabela individualmente.
- Identifique o Dia, Descrição, Valor e se é ENTRADA ou SAÍDA.
- IMPORTANTE: Ignore linhas que sejam apenas TOTAIS, SUBTOTAIS ou SALDO ATUAL, pois o app calcula isso sozinho.
- Se houver "DÍZIMO DA SEDE 10%" ou "REPASSE SEMIDI" na lista de transações, extraia-os normalmente.

REGRAS DE VALOR:
- Certifique-se de ler os centavos corretamente.
- Remova símbolos de moeda (R$) e retorne apenas o número.

Retorne APENAS o JSON no formato RESPONSE_SCHEMA.` }
          ]
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const parsedText = response.text;
      if (!parsedText) {
        return res.status(500).json({ error: "Gemini não retornou dados para este documento." });
      }

      return res.json(JSON.parse(parsedText));
    } catch (error: any) {
      console.error("[Backend] Erro no /api/gemini/parse-document:", error);
      return res.status(500).json({ error: error?.message || "Erro interno do servidor." });
    }
  });

  // Vite Integration & Static File Serving
  if (process.env.NODE_ENV !== "production") {
    console.log("[Backend] Iniciando em Modo Desenvolvimento com Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Backend] Iniciando em Modo Produção...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Backend] Servidor rodando com sucesso no endereço http://localhost:${PORT}`);
  });
}

startServer();
