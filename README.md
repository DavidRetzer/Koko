# Koko - KI-Chatbot für shinkoko.at

Dieses Projekt implementiert "Koko", einen KI-gestützten Chatbot, der als virtueller Tee-Berater für den Online-Shop [shinkoko.at](https://shinkoko.at/) dient. Koko unterstützt Kunden bei der Produktauswahl und beantwortet Fragen rund um japanischen Tee.

Das System ist als sicherer Proxy konzipiert, der Anfragen von einem Frontend-Widget auf der Shopify-Seite über eine Vercel Serverless Function an die Google Gemini API weiterleitet.

## Architektur

Das Projekt besteht aus zwei Hauptkomponenten:

1.  **`api/chat.js` (Vercel Serverless Function)**
    *   **Zweck**: Dient als sicheres Backend für den produktiven Einsatz.
    *   **Funktionalität**:
        *   Empfängt Chat-Anfragen vom Frontend.
        *   Führt Sicherheitsprüfungen durch (CORS-Policy, geheimer Header).
        *   Fügt einen System-Prompt hinzu, der die Persönlichkeit und das Verhalten des Chatbots "Koko" definiert.
        *   Leitet Anfragen sicher an die Google Gemini API weiter und sendet die Antwort zurück.
    *   **Hosting**: Vercel

2.  **`widget/chatbot-widget.liquid` (Shopify Chat-Widget)**
    *   **Zweck**: Stellt die Benutzeroberfläche des Chatbots bereit, die in das Shopify-Theme integriert wird.
    *   **Funktionalität**:
        *   Bietet eine vollständige Chat-Oberfläche (HTML, CSS, JavaScript).
        *   Verwaltet den Chat-Verlauf auf der Client-Seite.
        *   Sendet Benutzeranfragen an die Vercel-Proxy-Funktion.
        *   Zeigt die Antworten des Bots in Echtzeit an.

## Dateistruktur

```
.
├───.gitignore
├───package.json
├───README.md
└───api/
    └───chat.js
└───widget/
    └───chatbot-widget.liquid
```

## Deployment und Integration

### 1. Vercel-Deployment

Die `api/chat.js`-Funktion wird auf Vercel gehostet.

1.  **Vercel-Projekt einrichten**: Verbinden Sie Ihr Git-Repository mit einem neuen Vercel-Projekt. Vercel erkennt das Projekt als Node.js-Anwendung und konfiguriert die Serverless Function automatisch.

2.  **Umgebungsvariablen in Vercel setzen**: Gehen Sie in Ihrem Vercel-Projekt zu `Settings > Environment Variables` und fügen Sie die folgenden Schlüssel hinzu:
    *   `GEMINI_API_KEY`: Ihr Google Gemini API-Schlüssel.
    *   `CHATBOT_SECRET`: Ein sicherer, zufälliger String für die Authentifizierung des Widgets.

### 2. Shopify-Integration

1.  **Proxy-URL und Secret im Widget konfigurieren**: Öffnen Sie die Datei `widget/chatbot-widget.liquid`. Suchen Sie den `<script>`-Abschnitt und passen Sie die folgenden beiden Konstanten an:
    *   `PROXY_SERVER_URL`: Die von Vercel bereitgestellte URL für Ihre Funktion (z.B. `https://ihr-projekt.vercel.app/api/chat`).
    *   `CHATBOT_SECRET`: Derselbe geheime String, den Sie in den Vercel-Umgebungsvariablen festgelegt haben.

2.  **Code in Shopify einfügen**:
    *   Kopieren Sie den gesamten Inhalt von `widget/chatbot-widget.liquid`.
    *   Gehen Sie in Ihrem Shopify-Adminbereich zu `Onlineshop > Themes`.
    *   Klicken Sie bei Ihrem aktuellen Theme auf `Aktionen > Code bearbeiten`.
    *   Öffnen Sie die Layout-Datei `theme.liquid`.
    *   Fügen Sie den kopierten Code direkt vor dem schließenden `</body>`-Tag ein.
    *   Speichern Sie die Änderungen.

Das Chat-Widget sollte nun auf allen Seiten Ihres Shops erscheinen.