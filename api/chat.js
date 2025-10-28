/**
 * @file /api/chat.js
 * Vercel Serverless Function as a secure proxy to the Google Gemini API.
 *
 * This function receives chat history from a frontend, adds a system prompt defining the
 * chatbot's personality ("Koko"), and securely forwards the request to the Gemini API.
 * It includes security measures like CORS and a secret header validation,
 * making it suitable for production use on Vercel.
 */

import { GoogleGenAI } from '@google/genai';

// Initialize the Google Gemini AI client using the API key from Vercel environment variables.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(GEMINI_API_KEY);

/**
 * System-Prompt für den Gemini Chatbot "Koko".
 * Definiert Persona, Tonalität, Kernaufgaben (mit RAG-Logik) und Regeln.
 */
const SYSTEM_PROMPT = `
1. Persona und Rolle: Du bist "Koko", der virtuelle Tee-Berater für den Online-Shop shinkoko.at. Deine Rolle ist die eines authentischen Experten für japanische Teespezialitäten und -kultur.

2. Tonalität und Stil:
Höflichkeit: Du bist äußerst höflich und respektvoll, angelehnt an die japanische Service-Kultur.
Anrede: Im Deutschen verwendest du konsequent die "Sie"-Anrede. Im Englischen verwendest du das natürliche "you".
Zugänglichkeit: Gleichzeitig bist du modern, freundlich und zugänglich.
Sprache (Zweisprachigkeit): Deine primäre Sprache ist Deutsch. Wenn ein Nutzer dich jedoch auf Englisch anspricht, erkennst du dies sofort und führst das gesamte weitere Gespräch fließend und kompetent auf Englisch.

**3. Kernaufgabe und Wissenshierarchie (Kontext) – [RAG-VERSION]**

**Dein primäres Ziel ist es, Kunden bei der Auswahl von Produkten aus dem Sortiment von shinkoko.at zu beraten und ihre Fragen zu beantworten.**

**Deine Wissenshierarchie ist entscheidend:**

**REGEL 1: Der [WEBSITE-KONTEXT] hat IMMER Vorrang.**
**Du erhältst als Teil dieses Prompts (ganz am Ende) einen dynamischen Abschnitt namens "[AKTUELLER WEBSITE-KONTEXT FÜR DEINE ANTWORT]".**
**Dieser Abschnitt enthält Suchergebnisse direkt von der Website shinkoko.at, die für die letzte Nutzerfrage relevant sind.**
**Du MUSST deine Antwort IMMER primär auf den Informationen in diesem [AKTUELLER WEBSITE-KONTEXT]-Abschnitt basieren.**
**Dieser Kontext ist deine "Single Source of Truth".**

**REGEL 2: Der "Experten-Fallback" (Nutzung von Allgemeinwissen).**
**Wenn (und nur wenn) der [AKTUELLER WEBSITE-KONTEXT] nachweislich keine Antwort auf die spezifische Frage liefert (z.B. wenn dort steht "Ich konnte dazu keine spezifischen Informationen auf shinkoko.at finden." oder der Kontext die Frage offensichtlich nicht beantwortet):**
**DANN darfst du auf dein allgemeines, vortrainiertes Expertenwissen zurückgreifen, um dem Kunden eine hilfreiche Anleitung oder ein Rezept zu geben (z.B. 'Wie mache ich ein Matcha-Latte?').**
**Stelle sicher, dass diese Antwort im Einklang mit deiner Persona (Koko, höflich, Experte) und dem Fokus des Shops (japanischer Tee) steht.**

4. Verhaltensregeln und Schutzplanken (Guardrails) – SEHR WICHTIG:

Strikte Themenbindung: Die 'Experten-Fallback'-Regel (Regel 2) gilt niemals für themenfremde Anfragen. Du darfst unter keinen Umständen auf Gespräche über das Wetter, Politik, Sport, persönliche Meinungen oder andere Websites eingehen. (Siehe Beispiel 1).
Keine Widersprüche: Dein Allgemeinwissen (Regel 2) darf niemals den Informationen im [AKTUELLER WEBSITE-KONTEXT] (Regel 1) oder den Informationen auf shinkoko.at widersprechen. Wenn der Kontext etwas definiert, ist diese Definition Gesetz.
Identität: Du bist "Koko". Du bist keine allgemeine KI. Lehne alle Fragen zu deiner technischen Natur ab. (Siehe Beispiel 3).
Keine externen Empfehlungen: Du darfst niemals Produkte empfehlen, die nicht auf shinkoko.at geführt werden. (Siehe Beispiel 2 und 4).

5. Strategie zur Gesprächsführung (Aktives Zurücklenken): Wenn ein Nutzer versucht, das Thema zu wechseln (themenfremde Fragen) oder nach Produkten fragt, die es nicht gibt, wende die Strategie des "aktiven Zurücklenkens" an.

Beispiel 1 (Themenfremde Frage, Deutsch):
Nutzer: 'Wie wird das Wetter morgen in Wien?'
Koko (Antwort): 'Als virtueller Tee-Berater von Shinkoko liegt meine Expertise ganz in der wunderbaren Welt des Tees. Ich kann Ihnen leider nichts über das Wetter sagen. Darf ich Ihnen stattdessen helfen, den perfekten Sencha für einen gemütlichen Nachmittag zu finden?'
Beispiel 2 (Fremdprodukt, Deutsch):
Nutzer: 'Ich suche eigentlich Kaffee.'
Koko (Antwort): 'Kaffee führen wir in unserem Sortiment nicht, da wir uns ganz auf authentische japanische und bald auch chinesische Teespezialitäten konzentrieren. Wenn Sie jedoch nach einem belebenden Getränk suchen, das eine sanfte, anhaltende Energie spendet, darf ich Ihnen unseren hochwertigen Bio-Matcha empfehlen?'
Beispiel 3 (Frage nach deiner Natur, Deutsch):
Nutzer: 'Bist du eine KI?'
Koko (Antwort): 'Ich bin Koko, Ihr digitaler Berater, und ich freue mich darauf, mit Ihnen die passenden Produkte aus unserem Shinkoko-Sortiment zu entdecken. Haben Sie eine Frage zu einer bestimmten Teesorte?'
Beispiel 4 (Fremdprodukt, Englisch):
Nutzer: 'Do you also sell English Breakfast tea?'
Koko (Antwort): 'We do not carry black teas like English Breakfast, as we specialize entirely in authentic Japanese (and soon Chinese) green tea specialties. However, if you are looking for a classic, comforting tea, may I introduce you to our Genmaicha? It's a wonderful green tea with roasted brown rice.'
`;

/**
 * List of allowed origins for browser requests (CORS).
 * This is a security measure to ensure only authorized frontends can access the API.
 */
const ALLOWED_ORIGINS = [
    'https://shinkoko.at',
    'https://koko-test-shop.myshopify.com'
];

/**
 * Secret header value for request authentication.
 * Loaded from environment variables, this must match the `X-Chatbot-Secret` header
 * sent by the frontend for an additional layer of security.
 */
const SECRET_HEADER_VALUE = process.env.CHATBOT_SECRET;

// NEUE Konstanten aus Vercel Environment Variables
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;

/**
 * Holt relevante Text-Snippets von shinkoko.at über die Google Custom Search API.
 */
async function getRelevantWebsiteContext(userQuery) {
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
        console.warn("Google Search API ist nicht konfiguriert. RAG wird übersprungen.");
        return "Kein Kontext von der Website verfügbar.";
    }

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', GOOGLE_SEARCH_API_KEY);
    url.searchParams.set('cx', GOOGLE_SEARCH_CX);
    url.searchParams.set('q', userQuery); // Die Frage des Benutzers
    url.searchParams.set('num', 3);       // Fordere nur die Top 3 Ergebnisse an

    try {
        const searchResponse = await fetch(url);
        if (!searchResponse.ok) {
            console.error("Google Search API error:", await searchResponse.text());
            return "Fehler beim Abrufen der Website-Informationen.";
        }

        const data = await searchResponse.json();

        if (!data.items || data.items.length === 0) {
            return "Ich konnte dazu keine spezifischen Informationen auf shinkoko.at finden.";
        }

        // Formatiere die Ergebnisse für den Prompt
        return data.items.map(item => 
            `Titel: ${item.title}\nInhalt: ${item.snippet}`
        ).join('\n---\n');

    } catch (error) {
        console.error("Fehler bei der Google Search API-Anfrage:", error);
        return "Fehler bei der Verbindung zur Website-Suche.";
    }
}

/**
 * Main entry point for the Vercel Serverless Function.
 * Handles incoming HTTP requests.
 * @param {object} req - The Vercel request object.
 * @param {object} res - The Vercel response object.
 */
export default async function (req, res) {
    const origin = req.headers.origin;

    // 1. CORS check: Verify the request origin is allowed.
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // Block requests from unauthorized origins.
        // For OPTIONS preflight requests, send a neutral response to avoid leaking info.
        if (req.method !== 'OPTIONS') {
            return res.status(403).json({ error: 'Access from this origin is not permitted.' });
        }
    }

    // Set necessary CORS headers.
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-control-allow-headers', 'Content-Type, X-Chatbot-Secret');

    // Handle OPTIONS preflight requests.
    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }

    // 2. Security checks: HTTP method and secret header.
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests are allowed.' });
    }

    // Validate the secret header if configured.
    if (SECRET_HEADER_VALUE) {
        const providedSecret = req.headers['x-chatbot-secret'];
        if (providedSecret !== SECRET_HEADER_VALUE) {
             return res.status(403).json({ error: 'Invalid security token.' });
        }
    }

// 3. Request processing.
    const { history } = req.body;

    if (!history || history.length === 0) {
        return res.status(400).json({ error: 'Conversation history is missing.' });
    }

    // Holen Sie die letzte Frage des Benutzers für RAG
    const lastUserQuestion = history[history.length - 1].parts;

    try {
        // --- 1. RAG-Schritt: Kontext holen ---
        const relevantContext = await getRelevantWebsiteContext(lastUserQuestion);

        // --- 2. Prompt-Anreicherung ---
        // Passen Sie Ihren System-Prompt an, um den RAG-Kontext zu nutzen
        const DYNAMIC_SYSTEM_PROMPT = `
            ${SYSTEM_PROMPT}

            ---
            [AKTUELLER WEBSITE-KONTEXT FÜR DEINE ANTWORT]
            Hier sind relevante Informationen von shinkoko.at, die du zur Beantwortung der letzten Nutzerfrage verwenden MUSST. Basiere deine Antwort primär auf diesem Kontext. Wenn der Kontext die Frage nicht beantwortet, greife auf REGEL 2 (Experten-Fallback) zurück.
            
            KONTEXT:
            ${relevantContext}
            ---
        `;

        // --- 3. Gemini-Aufruf ---
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: history,
            config: {
                systemInstruction: DYNAMIC_SYSTEM_PROMPT,
            }
        });

        // Send the AI's response back to the frontend.
        return res.status(200).json({ answer: response.text });

        } catch (error) {
        // Catch any errors from the Gemini API.
        console.error('Gemini API Error:', error);
        return res.status(500).json({ answer: "Sorry, there was a technical issue. Please try again later.", error: error.message });
    }
}
