# Koko - Gemini Chatbot für Shopify

Dieses Projekt implementiert "Koko", einen KI-gestützten Chatbot, der als virtueller Tee-Berater für Online-Shops dient. Koko nutzt die Google Gemini API für intelligente Konversationen und eine Google Custom Search Engine für Retrieval-Augmented Generation (RAG), um kontextbezogene Antworten basierend auf den Inhalten der Website zu geben.

Das System ist als sichere und performante Proxy-Architektur konzipiert, bei der ein Frontend-Widget in Shopify über eine Vercel Serverless-Funktion mit der Google Gemini API kommuniziert.

## Features

- **Intelligente Konversationen**: Nutzt die Leistungsfähigkeit von Google Gemini, um natürliche und hilfreiche Dialoge zu führen.
- **Kontextbezogenes Wissen (RAG)**: Integriert eine Google Custom Search, um dem Chatbot Wissen direkt von der eigenen Website zur Verfügung zu stellen. Dadurch kann Koko spezifische Fragen zu Produkten und Inhalten beantworten.
- **Sichere Architektur**: Anfragen werden über eine dedizierte Serverless-Funktion (Proxy) geleitet. Eine CORS-Richtlinie stellt sicher, dass nur der eigene Shop Anfragen an das Backend senden kann.
- **Eigenständiges Widget**: Das Chat-Widget ist in reinem JavaScript, HTML und CSS geschrieben und benötigt keine externen Bibliotheken, was die Ladezeit und Kompatibilität verbessert.
- **Einfache Installation**: Das Widget kann durch Kopieren und Einfügen in jedes Shopify-Theme integriert werden.
- **Persistenter Chat-Verlauf**: Merkt sich den Gesprächsverlauf für die Dauer einer Browser-Sitzung mittels `sessionStorage`.

## Architektur

Das Projekt besteht aus zwei Hauptkomponenten:

1.  **`api/chat.js` (Vercel Serverless-Funktion)**
    - **Zweck**: Dient als sicheres Backend und als Gehirn des Chatbots.
    - **Funktionalität**:
        - Empfängt Chat-Anfragen vom Frontend-Widget.
        - Führt eine CORS-Prüfung durch, um die Anfragequelle zu validieren.
        - Ruft über die Google Custom Search API kontextrelevante Informationen von der Website ab (RAG).
        - Erstellt einen dynamischen System-Prompt, der die Persönlichkeit von "Koko" sowie die abgerufenen Informationen enthält.
        - Leitet die Anfrage sicher an die Google Gemini API weiter und sendet die Antwort zurück an das Widget.
    - **Hosting**: Vercel

2.  **`widget/chatbot-widget.liquid` (Shopify Chat-Widget)**
    - **Zweck**: Stellt die Benutzeroberfläche des Chatbots bereit, die in das Shopify-Theme integriert wird.
    - **Funktionalität**:
        - Bietet eine vollständige Chat-Oberfläche (HTML, CSS, JavaScript).
        - Verwaltet den Chat-Verlauf auf der Client-Seite.
        - Sendet Benutzeranfragen an die Vercel-Proxy-Funktion.
        - Zeigt die Antworten des Bots in Echtzeit an.

## Installationsanleitung

### Schritt 1: Backend-Setup (Vercel)

Das Backend (`api/chat.js`) wird auf Vercel gehostet.

1.  **Google Programmable Search Engine einrichten**:
    - Erstellen Sie eine neue [Google Programmable Search Engine](https://programmablesearchengine.google.com/).
    - Konfigurieren Sie die Suchmaschine so, dass sie **nur Ihre eigene Website durchsucht** (z.B. `shinkoko.at/*`).
    - Aktivieren Sie die "Search the entire web"-Option **nicht**.
    - Notieren Sie sich die **Search engine ID (CX)**.
    - Erstellen Sie in der Google Cloud Console einen **API-Schlüssel** mit Zugriff auf die "Custom Search API".

2.  **Vercel-Projekt einrichten**:
    - Verbinden Sie Ihr Git-Repository mit einem neuen Vercel-Projekt. Vercel erkennt das Projekt als Node.js-Anwendung und konfiguriert die Serverless-Funktion automatisch.

3.  **Umgebungsvariablen in Vercel setzen**:
    - Gehen Sie in Ihrem Vercel-Projekt zu `Settings > Environment Variables`.
    - Fügen Sie die folgenden drei Schlüssel hinzu:
        - `GEMINI_API_KEY`: Ihr Google Gemini API-Schlüssel.
        - `GOOGLE_SEARCH_API_KEY`: Der API-Schlüssel für die Google Custom Search API.
        - `GOOGLE_SEARCH_CX`: Die Search Engine ID (CX) Ihrer konfigurierten Suchmaschine.

### Schritt 2: Frontend-Setup (Shopify)

1.  **Proxy-URL im Widget konfigurieren**:
    - Öffnen Sie die Datei `widget/chatbot-widget.liquid`.
    - Suchen Sie den `<script>`-Abschnitt und passen Sie die folgende Konstante an:
        - `PROXY_SERVER_URL`: Die von Vercel bereitgestellte URL für Ihre Funktion (z.B. `https://ihr-projekt.vercel.app/api/chat`).

2.  **Code in Shopify einfügen**:
    - Kopieren Sie den gesamten Inhalt von `widget/chatbot-widget.liquid`.
    - Gehen Sie in Ihrem Shopify-Adminbereich zu `Onlineshop > Themes`.
    - Klicken Sie bei Ihrem aktuellen Theme auf `Aktionen > Code bearbeiten`.
    - Öffnen Sie die Layout-Datei `theme.liquid`.
    - Fügen Sie den kopierten Code direkt vor dem schließenden `</body>`-Tag ein.
    - Speichern Sie die Änderungen.

Das Chat-Widget sollte nun auf allen Seiten Ihres Shops erscheinen.

## Konfiguration und Anpassung

### CORS-Policy

Die Liste der erlaubten Domains für Anfragen an das Backend wird in `api/chat.js` in der Konstante `ALLOWED_ORIGINS` gepflegt. Stellen Sie sicher, dass Ihre Shopify-Domain (`https://ihr-shop.myshopify.com`) und Ihre Hauptdomain (`https://ihr-shop.de`) hier eingetragen sind.

### Persönlichkeit des Chatbots

Die gesamte Persönlichkeit, die Verhaltensregeln und das Fachwissen von Koko werden im `SYSTEM_PROMPT` in der Datei `api/chat.js` definiert. Hier können Sie die Tonalität, die Anweisungen und die "Guardrails" des Chatbots nach Ihren Wünschen anpassen.
