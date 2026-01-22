
import { GoogleGenAI, Type } from "@google/genai";
import { Company } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIInsights = async (companies: Company[]) => {
  if (companies.length === 0) return "Adicione empresas para obter insights da IA.";

  const companySummary = companies.map(c => 
    `${c.name} (Corretores: ${c.brokerCount}, Comissão: ${c.commissionRate}%, Contratado por: ${c.hiringManager})`
  ).join(", ");

  const prompt = `Analise a seguinte lista de imobiliárias parceiras e forneça um resumo estratégico. 
  Considere o tamanho da rede (corretores), as taxas de comissão negociadas (1% a 8%) e os responsáveis internos pela contratação para identificar padrões de sucesso ou necessidade de revisão de acordos. 
  Forneça sugestões práticas para maximizar o ROI da rede e engajamento dos parceiros.
  Lista: ${companySummary}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.9,
      }
    });
    // Accessing .text property directly
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível gerar insights no momento.";
  }
};
