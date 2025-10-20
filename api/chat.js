// api/chat.js

import { GoogleGenAI } from '@google/genai';

// Der API-Schlüssel wird als Umgebungsvariable (GEMINI_API_KEY) von Vercel geladen
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const ai = new GoogleGenAI(GEMINI_API_KEY);

// -------------------------------------------------------------
// ERSETZEN SIE DIES MIT IHREM VORBEREITETEN SYSTEM-PROMPT
// -------------------------------------------------------------
const SYSTEM_PROMPT = `
Du bist Shinkoko-Bot, ein hilfsbereiter, freundlicher und professioneller Support-Assistent für den Online-Shop shinkoko.at. 
... (Ihr vollständiger Prompt) ...
`;

// Haupteinstiegspunkt der Vercel Function
export default async function (req, res) {
    // 1. CORS-Header (WICHTIG für Shopify)
    // ⚠️ Ersetzen Sie 'https://shinkoko.at' durch die genaue Domain Ihres Shops.
//    res.setHeader('Access-Control-Allow-Origin', 'https://shinkoko.at'); 
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000'); // Für lokale Tests
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Behandle Preflight-Anfragen (OPTIONS)
    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Nur POST-Anfragen erlaubt.' });
    }

    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Nachricht fehlt im Request-Body.' });
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                { role: "user", parts: [{ text: message }] }
            ],
            config: {
                systemInstruction: SYSTEM_PROMPT,
            }
        });
        
        // Sende die KI-Antwort zurück
        return res.status(200).json({ answer: response.text });

    } catch (error) {
        console.error('Gemini API Fehler:', error);
        return res.status(500).json({ answer: "Entschuldigung, es gab ein technisches Problem. Bitte versuchen Sie es später erneut.", error: error.message });
    }
}