/**
 * @file /server.js
 *
 * Diese Datei implementiert einen einfachen lokalen Express-Server, der ausschließlich für Entwicklungs- und Testzwecke dient.
 * Der Server fungiert als lokaler Proxy, der die Vercel Serverless Function (`/api/chat.js`) ausführt.
 * Dies ermöglicht es, die Chatbot-Logik auf einem lokalen Rechner zu testen, bevor sie auf Vercel bereitgestellt wird.
 *
 * Der Server lauscht auf Port 3000 und leitet alle Anfragen an den Endpunkt `/api/chat` an die importierte Chat-Logik weiter.
 * Er konfiguriert außerdem die notwendigen CORS-Header, um Anfragen von der lokalen Test-HTML-Datei (`test.html`),
 * die über einen separaten HTTP-Server (z.B. auf Port 8080) bereitgestellt wird, zu akzeptieren.
 */

import express from 'express';
import chatProxy from './api/chat.js'; // Importiert die Kern-Chat-Logik, die auch auf Vercel läuft.

const app = express();
const PORT = 3000;

// Middleware, um eingehende Anfragen mit JSON-Payloads zu parsen.
// Dies ist erforderlich, um den `history`-Array aus dem Body der POST-Anfrage zu extrahieren.
app.use(express.json());

/**
 * Middleware für das Cross-Origin Resource Sharing (CORS) Setup.
 * Diese Konfiguration ist entscheidend für die lokale Entwicklung, da das Frontend (`test.html`)
 * und der Backend-Server auf unterschiedlichen Ports laufen (z.B. 8080 und 3000).
 * Der Browser würde die Anfrage aus Sicherheitsgründen blockieren, wenn der Server diese Header nicht senden würde.
 */
app.use((req, res, next) => {
    // Erlaubt Anfragen vom Ursprung der lokalen Test-Datei.
    res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:8080');
    // Definiert die erlaubten HTTP-Methoden. 'OPTIONS' ist für Preflight-Anfragen des Browsers erforderlich.
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    // Definiert die erlaubten Header in der Anfrage, einschließlich des benutzerdefinierten Sicherheits-Headers.
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Chatbot-Secret');
    // Gibt die Kontrolle an die nächste Middleware oder Route weiter.
    next();
});

// Leitet alle Anfragen (POST und OPTIONS) an den Endpunkt `/api/chat` an die importierte `chatProxy`-Funktion weiter.
// `app.all()` wird verwendet, um sicherzustellen, dass sowohl die eigentlichen POST-Anfragen als auch die
// Preflight-OPTIONS-Anfragen des Browsers von derselben Logik behandelt werden.
app.all('/api/chat', chatProxy);

// Startet den Express-Server und lässt ihn auf dem definierten Port lauschen.
app.listen(PORT, () => {
  console.log(`✅ Lokaler Proxy-Server für den Chatbot läuft auf http://localhost:${PORT}/`);
  console.log(`   Der Endpunkt für Anfragen ist http://localhost:${PORT}/api/chat`);
});
