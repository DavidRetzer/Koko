/**
 * @file /api/chat.js
 *
 * Dies ist eine Vercel Serverless Function, die als sicherer Proxy für die Google Gemini API dient.
 * Sie empfängt den Chat-Verlauf von einem Frontend (z.B. einem Shopify-Shop oder einer lokalen Testseite),
 * fügt einen detaillierten System-Prompt hinzu, der die Persönlichkeit und die Verhaltensregeln des Chatbots "Koko" definiert,
 * und leitet die Anfrage sicher an die Gemini API weiter.
 *
 * Die Funktion ist für den produktiven Einsatz auf Vercel konzipiert und enthält Sicherheitsmechanismen wie
 * eine CORS-Prüfung (Cross-Origin Resource Sharing) und die Validierung eines geheimen Headers.
 */

import { GoogleGenAI } from '@google/genai';

// Initialisiert den Google Gemini AI Client.
// Der API-Schlüssel wird sicher aus den Umgebungsvariablen von Vercel geladen.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(GEMINI_API_KEY);

/**
 * System-Prompt für den Gemini Chatbot "Koko".
 * Dieser Prompt definiert die Persona, die Tonalität, die Kernaufgaben und die Verhaltensregeln des Bots.
 * Er ist das Herzstück der Bot-Logik und stellt sicher, dass der Bot konsistent und im Sinne der Marke agiert.
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
 * Eine Liste der erlaubten Ursprünge (Origins) für Browser-Anfragen.
 * Dies ist eine wichtige Sicherheitsmaßnahme (CORS), um sicherzustellen, dass nur autorisierte
 * Frontends (die produktive Shopify-Seite und die lokale Testumgebung) auf die API zugreifen können.
 */
const ALLOWED_ORIGINS = [
    'https://shinkoko.at',   // Die produktive Shopify-Domain
    'http://127.0.0.1:8080'  // Die URL für lokale Tests mit `test.html`
];

/**
 * Der Wert des geheimen Headers, der zur Authentifizierung von Anfragen verwendet wird.
 * Dieser Wert wird aus den Umgebungsvariablen geladen und muss mit dem Header `X-Chatbot-Secret`
 * übereinstimmen, der vom Frontend gesendet wird. Dies bietet eine zusätzliche Sicherheitsebene.
 */
const SECRET_HEADER_VALUE = process.env.CHATBOT_SECRET;

/**
 * Der Haupteinstiegspunkt der Vercel Serverless Function.
 * Diese Funktion verarbeitet eingehende HTTP-Anfragen.
 * @param {object} req - Das Anfrageobjekt von Vercel (ähnlich Node.js http.IncomingMessage).
 * @param {object} res - Das Antwortobjekt von Vercel (ähnlich Node.js http.ServerResponse).
 */
export default async function (req, res) {
    const origin = req.headers.origin;

    // --- 1. Sicherheitsprüfung: CORS (Cross-Origin Resource Sharing) ---
    // Überprüft, ob die Anfrage von einem erlaubten Ursprung kommt.
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // Blockiert Anfragen von nicht autorisierten Ursprüngen.
        // Bei einer OPTIONS-Preflight-Anfrage wird eine neutrale Antwort gesendet,
        // um keine Informationen preiszugeben. Bei POST-Anfragen wird der Zugriff verweigert.
        if (req.method !== 'OPTIONS') {
            return res.status(403).json({ error: 'Access from this origin is not permitted.' });
        }
    }

    // Setzt die notwendigen CORS-Header, um die erlaubten Methoden und Header zu deklarieren.
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-control-allow-headers', 'Content-Type, X-Chatbot-Secret');

    // Behandelt Preflight-Anfragen (OPTIONS), die der Browser vor der eigentlichen POST-Anfrage sendet.
    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }

    // --- 2. Sicherheitsprüfung: HTTP-Methode und geheimer Header ---
    // Stellt sicher, dass nur POST-Anfragen verarbeitet werden.
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests are allowed.' });
    }

    // Wenn ein geheimer Header in der Umgebung konfiguriert ist, wird er hier validiert.
    if (SECRET_HEADER_VALUE) {
        const providedSecret = req.headers['x-chatbot-secret'];
        if (providedSecret !== SECRET_HEADER_VALUE) {
             return res.status(403).json({ error: 'Invalid security token.' });
        }
    }

    // --- 3. Verarbeitung der Anfrage ---
    const { history } = req.body;

    // Validiert, dass ein Konversationsverlauf in der Anfrage vorhanden ist.
    if (!history || history.length === 0) {
        return res.status(400).json({ error: 'Conversation history is missing.' });
    }

    try {
        // Sendet die Anfrage an die Google Gemini API.
        // Der `history` (Konversationsverlauf) und der `SYSTEM_PROMPT` werden übergeben.
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Das verwendete Gemini-Modell.
            contents: history,
            config: {
                systemInstruction: SYSTEM_PROMPT,
            }
        });

        // Sendet die Antwort der KI als JSON zurück an das Frontend.
        return res.status(200).json({ answer: response.text });

    } catch (error) {
        // Fängt Fehler ab, die bei der Kommunikation mit der Gemini API auftreten.
        console.error('Gemini API Error:', error);
        return res.status(500).json({ answer: "Sorry, there was a technical issue. Please try again later.", error: error.message });
    }
}
