// Client-side Gemini Integration proxies requests to our secure full-stack backend endpoints.
// This prevents bundling heavy Node-specific modules in the browser.

function parseValueString(str: string): number {
  let clean = str.replace(/[^\d,.]/g, '');
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.indexOf(',') > clean.indexOf('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  return parseFloat(clean) || 0;
}

export function tryLocalParse(inputText: string): any | null {
  const normalized = inputText.trim().toLowerCase();
  if (!normalized) return null;

  let day: string | null = null;
  let value: number | null = null;
  let description = "";
  let type: "ENTRADA" | "SAIDA" = "ENTRADA";

  // 1. Explicit day: matched by "dia IX" or "dIX" or "dia: IX" or "d: IX"
  const dayMatch = normalized.match(/\b(?:dia|d:?)\s*(\d{1,2})\b/);
  let textForValue = normalized;
  if (dayMatch) {
    day = dayMatch[1].padStart(2, '0');
    textForValue = normalized.replace(/\b(?:dia|d:?)\s*\d{1,2}\b/, "");
  }

  // 2. Clear out any currency sign and find numbers
  const cleanText = textForValue.replace(/r\$\s*/gi, '');
  const numbersFound = cleanText.match(/\d+(?:[\.,]\d+)*(?:[\.,]\d{2})?|\d+/g);

  if (!numbersFound || numbersFound.length === 0) {
    return null; // Can't parse without a number (value)
  }

  // 3. Shorthand day-at-start (e.g., "15 dizimo 100")
  if (!day && numbersFound.length >= 2) {
    const startMatch = cleanText.match(/^\s*(\d{1,2})\b/);
    if (startMatch) {
      day = startMatch[1].padStart(2, '0');
      const otherNumbers = numbersFound.filter(n => n !== startMatch[1]);
      if (otherNumbers.length > 0) {
        value = parseValueString(otherNumbers[0]);
      }
    }
  }

  // 4. Resolve the value
  if (value === null) {
    if (day) {
      const firstNonDay = numbersFound.find(n => n !== day && parseInt(n) !== parseInt(day));
      if (firstNonDay) {
        value = parseValueString(firstNonDay);
      } else {
        value = parseValueString(numbersFound[0]);
      }
    } else {
      value = parseValueString(numbersFound[0]);
    }
  }

  if (value === null || isNaN(value)) {
    return null;
  }

  // 5. Clean words for mapping
  const cleanWordsText = cleanText
    .replace(/\d+(?:[\.,]\d+)*/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .trim();

  const normalizedWords = cleanWordsText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Categories mapping matching our system requirements
  if (normalizedWords.includes("ceia")) {
    description = "OFERTA DO CULTO DE CEIA";
    type = "ENTRADA";
  } else if (normalizedWords.includes("dizimo")) {
    description = "DÍZIMOS";
    type = "ENTRADA";
  } else if (normalizedWords.includes("oferta")) {
    description = "OFERTAS";
    type = "ENTRADA";
  } else if (normalizedWords.includes("semid") || normalizedWords.includes("repasse") || normalizedWords.includes("missoe")) {
    description = "REPASSE SEMIDI";
    type = "SAIDA";
  } else if (normalizedWords.includes("luz") || normalizedWords.includes("energia") || normalizedWords.includes("coelba")) {
    description = "ENERGIA ELÉTRICA";
    type = "SAIDA";
  } else if (normalizedWords.includes("agua") || normalizedWords.includes("embasa") || normalizedWords.includes("esgoto")) {
    description = "PAG ÁGUA";
    type = "SAIDA";
  } else if (normalizedWords.includes("gratific") || normalizedWords.includes("obreiro") || normalizedWords.includes("pagamento")) {
    description = "GRATIFICAÇÃO DO OBREIRO";
    type = "SAIDA";
  } else {
    // Custom expense/entry
    if (cleanWordsText.length >= 2) {
      description = cleanWordsText.toUpperCase();
      type = "SAIDA"; // Default custom to SAIDA unless "receita" / "entrada" is present
      if (normalizedWords.includes("receita") || normalizedWords.includes("entrada") || normalizedWords.includes("ganho")) {
        type = "ENTRADA";
      }
    } else {
      return null;
    }
  }

  return {
    transactions: [
      {
        day: day || new Date().getDate().toString().padStart(2, '0'),
        description,
        value,
        type
      }
    ]
  };
}

export const parseTransactionInput = async (inputText: string): Promise<any | null> => {
  if (!inputText.trim()) return null;

  // Try parsing locally first for 0ms registration latency
  try {
    const localResult = tryLocalParse(inputText);
    if (localResult) {
      return localResult;
    }
  } catch (err) {
    console.error("Local parsing error:", err);
  }

  // Fallback to Gemini API if too complex
  try {
    const response = await fetch("/api/gemini/parse-input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: inputText }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error || `Erro HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Erro no processamento de lançamento pelo Gemini:", error);
    return null;
  }
};

export const parseDocument = async (base64Data: string, mimeType: string): Promise<any | null> => {
  try {
    const response = await fetch("/api/gemini/parse-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Data, mimeType }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error || `Erro HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Erro no escaneamento de documento pelo Gemini:", error);
    return null;
  }
};
