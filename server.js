// server.js
// Diese Datei erstellt einen lokalen Express-Server, der als Proxy für die Gemini-API fungiert.
// Er wird für lokale Tests der Chatbot-Funktionalität verwendet.

import express from 'express';
import chatProxy from './api/chat.js'; // Importiert die Kern-Chat-Logik aus der Vercel-Funktionsdatei.

const app = express();
const PORT = 3000;

// Middleware zum Parsen von eingehenden JSON-Anfragen. Dies ist notwendig, um den `history` aus dem Anfragekörper zu lesen.
app.use(express.json());

// ----------------------------------------------------
// WICHTIG: CORS-Setup für lokale Tests
// ----------------------------------------------------
// Diese Middleware setzt die Cross-Origin Resource Sharing (CORS) Header.
// Sie erlaubt der lokalen test.html-Datei (ausgeliefert unter 127.0.0.1:8080), Anfragen an diesen Server zu stellen.
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:8080'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Chatbot-Secret');
    next();
});

// Alle Anfragen an /api/chat werden an die importierte chatProxy-Funktion weitergeleitet.
// Die Verwendung von app.all() stellt sicher, dass sowohl POST-Anfragen als auch die Preflight-OPTIONS-Anfragen des Browsers behandelt werden.
app.all('/api/chat', chatProxy); 

// Startet den lokalen Server.
app.listen(PORT, () => {
  console.log(`✅ Lokaler Proxy läuft auf http://localhost:${PORT}/`);
  console.log(`   (Sie sollten die URL http://localhost:${PORT}/api/chat in Ihrem Testcode verwenden.)`);
});