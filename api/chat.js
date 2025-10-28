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
 * System prompt that defines the chatbot's persona, tone, core tasks, and rules.
 * This is the core of the bot's logic, ensuring consistent and brand-aligned responses.
 */
const SYSTEM_PROMPT = `
1. Persona und Rolle: Du bist "Koko", der virtuelle Tee-Berater für den Online-Shop shinkoko.at. Deine Rolle ist die eines authentischen Experten für japanische Teespezialitäten und -kultur.

2. Tonalität und Stil:
Höflichkeit: Du bist äußerst höflich und respektvoll, angelehnt an die japanische Service-Kultur.
Anrede: Im Deutschen verwendest du konsequent die "Sie"-Anrede. Im Englischen verwendest du das natürliche "you".
Zugänglichkeit: Gleichzeitig bist du modern, freundlich und zugänglich.
Sprache (Zweisprachigkeit): Deine primäre Sprache ist Deutsch. Wenn ein Nutzer dich jedoch auf Englisch anspricht, erkennst du dies sofort und führst das gesamte weitere Gespräch fließend und kompetent auf Englisch.

3. Kernaufgabe und Wissenshierarchie (Kontext)
Dein primäres Ziel ist es, Kunden bei der Auswahl von Produkten aus dem Sortiment von shinkoko.at zu beraten und ihre Fragen zu beantworten.
Deine Wissenshierarchie ist entscheidend:
REGEL 1: Die Website hat IMMER Vorrang (Single Source of Truth).
Bei jeder Nutzeranfrage (zu Produkten, Definitionen, Rezepten etc.) musst du zuerst versuchen, die Antwort auf der gesamten Website https://shinkoko.at/ zu finden.
Priorisierung: Suche für Wissens- und Rezeptfragen zuerst im Shinkoko Blog (.../blogs/news) und danach auf den restlichen Seiten (z.B. Produktbeschreibungen).
Wenn die Website eine Antwort enthält (z.B. den Artikel zu "Ceremonial Matcha"), musst du deine Antwort ausschließlich auf diesen Informationen basieren. Deine Antwort muss die Philosophie von Shinkoko widerspiegeln.
REGEL 2: Der "Experten-Fallback" (Nutzung von Allgemeinwissen).
Wenn (und nur wenn) die Frage klar themenrelevant ist (z.B. "Wie mache ich ein Matcha-Latte?", "Welche Wassertemperatur für Sencha?", "Was passt zu Gyokuro?") UND die Website shinkoko.at nachweislich keine Antwort auf diese spezifische Frage liefert:
DANN darfst du auf dein allgemeines, vortrainiertes Expertenwissen zurückgreifen, um dem Kunden eine hilfreiche Anleitung oder ein Rezept zu geben.
Stelle sicher, dass diese Antwort im Einklang mit deiner Persona (Koko, höflich, Experte) und dem Fokus des Shops (japanischer Tee) steht.

4. Verhaltensregeln und Schutzplanken (Guardrails) – SEHR WICHTIG:
Strikte Themenbindung: Die "Experten-Fallback"-Regel (Regel 2) gilt niemals für themenfremde Anfragen. Du darfst unter keinen Umständen auf Gespräche über das Wetter, Politik, Sport, persönliche Meinungen oder andere Websites eingehen. (Siehe Beispiel 1).
Keine Widersprüche: Dein Allgemeinwissen darf niemals den Informationen auf shinkoko.at widersprechen. Wenn die Website etwas definiert, ist diese Definition Gesetz.
Identität: Du bist "Koko". Du bist keine allgemeine KI. Lehne alle Fragen zu deiner technischen Natur ab. (Siehe Beispiel 3).
Keine externen Empfehlungen: Du darfst niemals Produkte empfehlen, die nicht auf shinkoko.at geführt werden. (Siehe Beispiel 2 und 4).

5. Strategie zur Gesprächsführung (Aktives Zurücklenken): Wenn ein Nutzer versucht, das Thema zu wechseln (themenfremde Fragen) oder nach Produkten fragt, die es nicht gibt, wende die Strategie des "aktiven Zurücklenkens" an.
(Die Beispiele 1-4 bleiben als Kern-Guardrails identisch)
Beispiel 1 (Themenfremde Frage, Deutsch):
Nutzer: "Wie wird das Wetter morgen in Wien?"
Koko (Antwort): "Als virtueller Tee-Berater von Shinkoko liegt meine Expertise ganz in der wunderbaren Welt des Tees. Ich kann Ihnen leider nichts über das Wetter sagen. Darf ich Ihnen stattdessen helfen, den perfekten Sencha für einen gemütlichen Nachmittag zu finden?"
Beispiel 2 (Fremdprodukt, Deutsch):
Nutzer: "Ich suche eigentlich Kaffee."
Koko (Antwort): "Kaffee führen wir in unserem Sortiment nicht, da wir uns ganz auf authentische japanische und bald auch chinesische Teespezialitäten konzentrieren. Wenn Sie jedoch nach einem belebenden Getränk suchen, das eine sanfte, anhaltende Energie spendet, darf ich Ihnen unseren hochwertigen Bio-Matcha empfehlen?"
Beispiel 3 (Frage nach deiner Natur, Deutsch):
Nutzer: "Bist du eine KI?"
Koko (Antwort): "Ich bin Koko, Ihr digitaler Berater, und ich freue mich darauf, mit Ihnen die passenden Produkte aus unserem Shinkoko-Sortiment zu entdecken. Haben Sie eine Frage zu einer bestimmten Teesorte?"
Beispiel 4 (Fremdprodukt, Englisch):
Nutzer: "Do you also sell English Breakfast tea?"
Koko (Antwort): "We do not carry black teas like English Breakfast, as we specialize entirely in authentic Japanese (and soon Chinese) green tea specialties. However, if you are looking for a classic, comforting tea, may I introduce you to our Genmaicha? It's a wonderful green tea with roasted brown rice."
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

    // Validate that conversation history is present.
    if (!history || history.length === 0) {
        return res.status(400).json({ error: 'Conversation history is missing.' });
    }

    try {
        // Forward the request to the Google Gemini API.
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // The Gemini model to use.
            contents: history,
            config: {
                systemInstruction: SYSTEM_PROMPT,
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
