/**
 * @file /api/chat.js
 * Vercel Serverless-Funktion, die als sicherer Proxy zur Google Gemini API dient.
 *
 * Diese Funktion empfängt einen Chat-Verlauf von einem Frontend, fügt einen System-Prompt hinzu,
 * der die Persönlichkeit des Chatbots ("Koko") definiert, und leitet die Anfrage sicher an die Gemini API weiter.
 * Sie verwendet eine CORS-Richtlinie, um den Zugriff auf autorisierte Domains zu beschränken.
 */

import { GoogleGenAI } from '@google/genai';

// Initialisiert den Google Gemini AI Client mit dem API-Schlüssel aus den Vercel-Umgebungsvariablen.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI(GEMINI_API_KEY);

/**
 * System-Prompt für den Gemini Chatbot "Koko".
 * Definiert Persona, Tonalität, Kernaufgaben (mit RAG-Logik) und Regeln.
 * Version 5: Proaktive Empfehlungen, strukturierte Antworten & verbesserte Gesprächsführung.
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

REGEL 1: Das [SHINKOKO FACHWISSEN] hat IMMER Vorrang.
Du erhältst als Teil dieses Prompts (ganz am Ende) einen dynamischen Abschnitt namens "[SHINKOKO FACHWISSEN]".
Dieser Abschnitt enthält die offiziellen Informationen von shinkoko.at (basierend auf bis zu 3 Suchergebnissen), die für die letzte Nutzerfrage relevant sind.
Du MUSST deine Antwort IMMER primär auf den Informationen in diesem Abschnitt basieren. Dieser Kontext ist deine "Single Source of Truth".

REGEL 2: Der "Experten-Fallback" (Nutzung von Allgemeinwissen) – SEHR STRIKTE REGELN!
Wenn (und nur wenn) der [SHINKOKO FACHWISSEN]-Abschnitt nachweislich keine Antwort auf die spezifische Frage liefert (z.B. wenn dort steht: "Zu Ihrer speziellen Frage habe ich auf shinkoko.at leider keine direkte Antwort parat..."):
a) ANTWORTEN: DANN darfst du auf dein allgemeines, vortrainiertes Expertenwissen zurückgreifen, um die Frage des Kunden allgemein zu beantworten (z.B. 'Wie macht man Matcha Latte?' oder 'Wozu dient eine Meditationsglocke?').
b) KEINE PRODUKTE (WICHTIG!): Wenn du in diesem Fallback-Modus bist, ist es dir STRIKT UNTERSAGT, spezifische Produktnamen (z.B. 'Kobako Räuchergefäß', 'Okiagari') zu nennen oder proaktive Produktempfehlungen (Regel 5.2) zu machen. Deine Antwort darf in diesem Modus KEINE Produktwerbung enthalten.
c) ABSCHLUSS: Beende deine Antwort stattdessen mit einer allgemeinen, höflichen Einladung, den Shop zu durchstöbern, ohne spezifische Produkte zu nennen.

4. Verhaltensregeln und Schutzplanken (Guardrails) – SEHR WICHTIG:

4.1. Strikte Themenbindung: Die 'Experten-Fallback'-Regel (Regel 2) gilt niemals für themenfremde Anfragen. Du darfst unter keinen Umständen auf Gespräche über das Wetter, Politik, Sport, persönliche Meinungen oder andere Websites eingehen.
4.2. Keine Widersprüche: Dein Allgemeinwissen (Regel 2) darf niemals den Informationen im [SHINKOKO FACHWISSEN] (Regel 1) widersprechen. Wenn der Kontext etwas definiert, ist diese Definition Gesetz.
4.3. Natürliche Antworten (Kein Kontext-Leaking): Deine Antworten müssen immer natürlich und direkt sein. Du darfst NIEMALS erwähnen, dass du deine Informationen aus einem "Kontext", "Website-Kontext", "Suchergebnis", "Website-Informationen" oder "[SHINKOKO FACHWISSEN]" beziehst. Antworte so, als ob dieses Wissen dein eigenes ist.
4.4. Identität: Du bist "Koko". Du bist keine allgemeine KI. Lehne alle Fragen zu deiner technischen Natur ab.
4.5. Keine externen Empfehlungen: Du darfst niemals Produkte empfehlen, die nicht auf shinkoko.at geführt werden.
4.6. Keine absoluten Mengenangaben (Umgang mit RAG-Limits): Der [SHINKOKO FACHWISSEN]-Block enthält nur eine *Auswahl* an relevanten Informationen (bis zu 3 Treffer), nicht notwendigerweise die *gesamte* Liste aller Produkte oder Artikel auf der Website. Wenn du Produkte auflistest, die im Kontext gefunden wurden, formuliere es offen und vermeide Formulierungen, die implizieren, dies seien alle.
4.7. Strukturierte Antworten: Wenn du Produkte empfiehlst, formatiere deine Antwort übersichtlich. Hebe Produktnamen immer **fett** hervor. Wenn du mehrere Produkte auflistest, verwende eine Aufzählungsliste.
4.8. Immer mit Handlungsaufforderung abschließen: Beende deine Antworten, insbesondere Produktberatungen oder Rezepte, wann immer möglich mit einer freundlichen Handlungsaufforderung, die den Nutzer zum Stöbern oder Kaufen anregt. Beispiele: 'Stöbern Sie gerne hier in unserer Auswahl an Matcha-Tees.', 'Sie finden die **Genmaicha Teekanne** direkt hier in unserem Shop.'

5. Strategie zur Gesprächsführung – PROAKTIV & KUNDENORIENTIERT:

5.1. Klärende Rückfragen: Bei unklaren oder sehr allgemeinen Anfragen (z.B. 'Ich will Tee kaufen'), stelle höfliche Rückfragen, um die Bedürfnisse des Kunden besser zu verstehen. Frage z.B. nach Vorlieben (fruchtig, herb), gewünschter Wirkung (belebend, beruhigend) oder Tageszeit (Morgen, Abend).
5.2. Proaktive Zusatzempfehlungen: Wenn du eine Frage zu einem bestimmten Produkt (z.B. einem Tee) beantwortet hast, schlage proaktiv ein passendes Zubehörprodukt (z.B. eine Teekanne, eine Schale) aus dem [SHINKOKO FACHWISSEN] vor, falls relevanter Kontext verfügbar ist. Formuliere dies als höfliche Anregung, z.B. 'Zu diesem Tee passt übrigens hervorragend unsere ... Teekanne.'
5.3. Strategie für nicht verfügbare Produkte: Wenn ein Nutzer nach einem Produkt fragt, das laut [SHINKOKO FACHWISSEN] nicht existiert, antworte nicht nur, dass es nicht verfügbar ist. Schlage stattdessen, wenn möglich, ein ähnliches, verfügbares Produkt aus dem Kontext als Alternative vor. Beispiel: 'Dieses Produkt führen wir leider nicht, aber vielleicht wäre unser **Produkt X** eine interessante Alternative für Sie.'
5.4. Aktives Zurücklenken: Wenn ein Nutzer versucht, das Thema zu wechseln (themenfremde Fragen), wende die bekannte Strategie des "aktiven Zurücklenkens" an.

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

Beispiel 5 (Verhinderung von Kontext-Leaking, Deutsch):
Nutzer: 'Was ist Okiagari?'
(Interner [SHINKOKO FACHWISSEN]-Block enthält: 'Titel: Okiagari. Inhalt: Okiagari sind traditionelle japanische Stehauf-Glücksbringer...')
Koko (SCHLECHTE Antwort): 'Laut unserem Website-Kontext sind Okiagari traditionelle Stehauf-Glücksbringer.'
Koko (GUTE Antwort): 'Okiagari sind traditionelle japanische Stehauf-Glücksbringer. Sie gelten als Symbol für Glück und Widerstandsfähigkeit.'

Beispiel 6 (Umgang mit begrenztem Kontext, Deutsch):
Nutzer: 'Welche Statuen habt ihr?'
(Interner [SHINKOKO FACHWISSEN]-Block enthält: 'Titel: Daruma Statue', 'Titel: Maneki-neko Statue', 'Titel: Fudo Myoo Statue')
Koko (SCHLECHTE Antwort): 'Wir führen die Daruma Statue, die Maneki-neko Statue und die Fudo Myoo Statue.' (Impliziert, das seien alle 3.)
Koko (GUTE Antwort): 'Wir führen eine wunderbare Auswahl an Statuen. Dazu gehören zum Beispiel die Daruma Statue, die Maneki-neko Katze und Fudo Myoo. Gerne können Sie auch direkt in unserer Kategorie für Statuen auf der Website stöbern.'
`;

/**
 * Liste der erlaubten Domains für Browser-Anfragen (CORS).
 * Dies ist eine Sicherheitsmaßnahme, um sicherzustellen, dass nur autorisierte Frontends auf die API zugreifen können.
 */
const ALLOWED_ORIGINS = [
    'https://shinkoko.at',
    'https://shinkoko.myshopify.com',
    'https://koko-test-shop.myshopify.com'
];

/**
 * API-Schlüssel für die Google Custom Search API (für RAG).
 * Werden aus den Umgebungsvariablen geladen.
 */
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_CX = process.env.GOOGLE_SEARCH_CX;

/**
 * Holt relevante Text-Snippets von shinkoko.at über die Google Custom Search API.
 * Dies dient als Kontext für die Retrieval-Augmented Generation (RAG).
 */
async function getRelevantWebsiteContext(userQuery) {
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
        console.warn("Google Search API ist nicht konfiguriert. RAG wird übersprungen.");
        return "Kein Kontext von der Website verfügbar.";
    }

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', GOOGLE_SEARCH_API_KEY);
    url.searchParams.set('cx', GOOGLE_SEARCH_CX);
    url.searchParams.set('q', userQuery); // Die Anfrage des Benutzers
    url.searchParams.set('num', 3);       // Fordert nur die Top-3-Ergebnisse an

    try {
        const searchResponse = await fetch(url);
        if (!searchResponse.ok) {
            console.error("Google Search API error:", await searchResponse.text());
            return "Fehler beim Abrufen der Website-Informationen.";
        }

        const data = await searchResponse.json();

        if (!data.items || data.items.length === 0) {
            return "Zu Ihrer speziellen Frage habe ich auf shinkoko.at leider keine direkte Antwort parat, aber ich kann Ihnen allgemein dazu Folgendes erklären:";
        }

        // Formatiert die Ergebnisse für den Prompt
        return data.items.map(item => 
            `Titel: ${item.title}\nInhalt: ${item.snippet}`
        ).join('\n---\n');

    } catch (error) {
        console.error("Fehler bei der Google Search API-Anfrage:", error);
        return "Fehler bei der Verbindung zur Website-Suche.";
    }
}

/**
 * Extrahiert relevante Suchbegriffe aus einer natürlichen Benutzeranfrage
 * mithilfe eines schnellen LLM-Aufrufs, um die RAG-Suche zu optimieren.
 * @param {string} userQuestion - Die vollständige, natürliche Anfrage des Benutzers.
 * @param {GoogleGenAI} ai - Die initialisierte GoogleGenAI-Instanz.
 * @returns {Promise<string>} - Eine Zeichenkette mit optimierten Suchbegriffen.
 */
async function extractSearchQuery(userQuestion, ai) {
    // Ein spezieller Prompt, der die KI anweist, nur Keywords zu extrahieren.
    const extractionPrompt = `Du bist ein Assistent zur Keyword-Extraktion für eine Suchmaschine. Analysiere die folgende Benutzeranfrage und extrahiere die KERN-Suchbegriffe (Produktnamen, Konzepte, Entitäten). Entferne alle Füllwörter, Höflichkeitsfloskeln und Fragesätze. Gib NUR die 3-5 wichtigsten Begriffe zurück, getrennt durch Leerzeichen.

Beispiele:
- Frage: "Ich sehe hier eine Meditationsglocke Daitokuji auf euerer Webseite. Wozu ist diese?"
- Antwort: "Meditationsglocke Daitokuji"
- Frage: "Was ist der Unterschied zwischen Sencha und Matcha?"
- Antwort: "Unterschied Sencha Matcha"
- Frage: "Ich suche einen Tee, der mir beim Einschlafen hilft."
- Antwort: "Tee Einschlafen beruhigend"

---
Benutzerfrage: "${userQuestion}"
Extrahierte Suchbegriffe:`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Das schnelle Modell für diese Aufgabe
            // Wichtig: Wir übergeben *nicht* den Chat-Verlauf, nur den Extraktions-Prompt
            contents: [{ role: "user", parts: [{ text: extractionPrompt }] }],
            config: {
                maxOutputTokens: 30, // Ausreichend Platz für Keywords
                temperature: 0.0   // Deterministisch, keine Kreativität
            }
        });

        const keywords = response.text().trim();
        
        console.log(`Originalfrage: "${userQuestion}" | Extrahierte Keywords: "${keywords}"`);
        
        // Ein kleiner Sicherheitscheck: Wenn keine Keywords extrahiert wurden, 
        // oder die Antwort zu lang ist, lieber die Originalfrage nutzen.
        if (!keywords || keywords.length > 100) {
            return userQuestion;
        }

        return keywords;

    } catch (error) {
        console.error("Fehler bei der Keyword-Extraktion:", error);
        // Sicherer Fallback: die ursprüngliche Frage verwenden, wenn die Extraktion fehlschlägt
        return userQuestion;
    }
}

/**
 * Haupt-Einstiegspunkt für die Vercel Serverless-Funktion.
 * Verarbeitet eingehende HTTP-Anfragen.
 * @param {object} req - Das Vercel-Anfrageobjekt.
 * @param {object} res - Das Vercel-Antwortobjekt.
 */
export default async function (req, res) {
    const origin = req.headers.origin;

    // 1. CORS-Prüfung: Überprüft, ob die Anfrage-Domain erlaubt ist.
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // Blockiert Anfragen von nicht autorisierten Domains.
        // Bei OPTIONS Preflight-Anfragen wird eine neutrale Antwort gesendet, um keine Informationen preiszugeben.
        if (req.method !== 'OPTIONS') {
            return res.status(403).json({ error: 'Access from this origin is not permitted.' });
        }
    }

    // Setzt notwendige CORS-Header für Preflight- und eigentliche Anfragen.
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-control-allow-headers', 'Content-Type');

    // Behandelt OPTIONS Preflight-Anfragen.
    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }

    // 2. Sicherheitsprüfung: Erlaubt nur POST-Anfragen.
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST requests are allowed.' });
    }

    // 3. Anfrageverarbeitung.
    const { history } = req.body;

    if (!history || history.length === 0) {
        return res.status(400).json({ error: 'Conversation history is missing.' });
    }

    // Holt die letzte Benutzerfrage für den RAG-Schritt.
    const lastUserQuestion = history[history.length - 1].parts[0].text;

    try {
        // --- 1. Keyword-Extraktion ---
        // Wir übergeben 'ai' (den initialisierten Client) an die Funktion.
        const searchQuery = await extractSearchQuery(lastUserQuestion, ai);

        // --- 2. RAG-Schritt: Kontext holen ---
        const relevantContext = await getRelevantWebsiteContext(searchQuery);

        // --- 3. Prompt-Anreicherung ---
        // Passt den System-Prompt an, um den RAG-Kontext einzuschließen.
        const DYNAMIC_SYSTEM_PROMPT = `
            ${SYSTEM_PROMPT}

            ---
            [SHINKOKO FACHWISSEN]
            Hier sind die offiziellen Informationen von shinkoko.at, die du zur Beantwortung der letzten Nutzerfrage verwenden MUSST. Basiere deine Antwort primär auf diesem Kontext.
            
            KONTEXT:
            ${relevantContext}
            ---        `;

        // --- 4. Gemini-Aufruf ---
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: history,
            config: {
                systemInstruction: DYNAMIC_SYSTEM_PROMPT,
            }
        });

        // Sendet die Antwort der KI an das Frontend zurück.
        return res.status(200).json({ answer: response.text });

        } catch (error) {
        // Fängt alle Fehler von der Gemini API ab.
        console.error('Gemini API Error:', error);
        return res.status(500).json({ answer: "Sorry, there was a technical issue. Please try again later.", error: error.message });
    }
}
