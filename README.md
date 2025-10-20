# Shinkoko Gemini Chatbot Proxy

Dieses Projekt implementiert einen KI-gestützten Chatbot namens "Koko" für den Online-Shop [shinkoko.at](https://shinkoko.at/). Koko agiert als virtueller Tee-Berater, der Kunden bei der Produktauswahl unterstützt und Fragen rund um japanischen Tee beantwortet.

Das System ist als sicherer Proxy konzipiert, der Anfragen von einem Frontend-Widget (z.B. auf einer Shopify-Seite) über eine Vercel Serverless Function an die Google Gemini API weiterleitet.

## Architektur und Komponenten

Das Projekt ist in drei Hauptkomponenten unterteilt:

1.  **`api/chat.js` (Vercel Serverless Function)**
    -   **Zweck**: Dies ist das Herzstück des Backends und für den produktiven Einsatz konzipiert.
    -   **Funktionalität**:
        -   Empfängt Chat-Anfragen von autorisierten Frontends.
        -   Implementiert Sicherheitsprüfungen (CORS-Policy, geheimer Header).
        -   Fügt den `SYSTEM_PROMPT` hinzu, der die Persönlichkeit, das Wissen und die Verhaltensregeln des Chatbots "Koko" definiert.
        -   Leitet die Anfrage sicher an die Google Gemini API weiter und sendet die Antwort zurück.
    -   **Hosting**: Vercel

2.  **`theme.liquid` (Shopify Chat-Widget)**
    -   **Zweck**: Dies ist das Frontend-Widget, das direkt in das Shopify-Theme von shinkoko.at integriert wird.
    -   **Funktionalität**:
        -   Stellt eine komplette Chat-Benutzeroberfläche bereit (HTML, CSS, JavaScript).
        -   Verwaltet den Chat-Verlauf auf der Client-Seite.
        -   Sendet Benutzeranfragen an die Vercel-Proxy-Funktion (`api/chat.js`).
        -   Zeigt die Antworten des Bots in Echtzeit an.

3.  **Lokale Testumgebung (`server.js` & `test.html`)**
    -   **Zweck**: Ermöglicht die vollständige lokale Entwicklung und das Testen des Chatbots ohne Deployment.
    -   **Komponenten**:
        -   `server.js`: Ein lokaler Express.js-Server, der die Vercel-Funktion simuliert und als Proxy zur Gemini API dient.
        -   `test.html`: Eine einfache HTML-Seite mit einer Chat-Oberfläche, die mit dem lokalen Server (`server.js`) kommuniziert.

## Dateistruktur

```
.
├───.gitignore           # Ignoriert node_modules und .env-Dateien
├───package.json         # Definiert Projekt-Abhängigkeiten (Express, @google/genai)
├───README.md            # Diese Dokumentation
├───server.js            # Lokaler Express-Server für Testzwecke
├───test.html            # HTML-Seite für lokale Tests des Chatbots
├───theme.liquid         # Code für das Shopify Frontend-Widget
└───api/
    └───chat.js          # Vercel Serverless Function (Produktions-Backend)
```

## Setup für die lokale Entwicklung

Führen Sie die folgenden Schritte aus, um den Chatbot auf Ihrem lokalen Rechner zu testen.

### 1. Voraussetzungen

-   [Node.js](https://nodejs.org/) (LTS-Version empfohlen)
-   Ein Google Gemini API-Schlüssel

### 2. Installation

Klonen Sie das Repository und installieren Sie die notwendigen npm-Pakete:

```bash
git clone <repository-url>
cd <projekt-ordner>
npm install
```

### 3. Umgebungsvariablen einrichten

Erstellen Sie eine Datei namens `.env` im Hauptverzeichnis des Projekts. Diese Datei wird von `server.js` für die lokale Entwicklung verwendet.

```
# .env

# Ihr Google Gemini API-Schlüssel
GEMINI_API_KEY="IHR_GEMINI_API_SCHLÜSSEL"

# Ein sicherer, zufälliger String, um den lokalen Proxy zu schützen
CHATBOT_SECRET="q69LXYabMcOezRxBGJs0Qj00zVlP0PCzwMM337r+tAuHbvDAVnluaq1dQdE5VvAXNA98fmNymh8G+VCRGvzVJmoTTmhVUtPQt6P10lJFpNMGVLoM1fggYcKaqO/"
```

**Hinweis**: Der `CHATBOT_SECRET` in der `.env`-Datei muss mit dem in `test.html` übereinstimmen.

### 4. Lokale Server starten

Sie benötigen zwei separate Terminals, um die lokale Testumgebung auszuführen.

**Terminal 1: Starten des Proxy-Servers**

Dieser Server (`server.js`) läuft auf Port 3000 und leitet Anfragen an die Gemini API weiter.

```bash
node server.js
```

**Terminal 2: Bereitstellen der Test-Seite**

Verwenden Sie einen einfachen HTTP-Server, um `test.html` bereitzustellen. Wenn Sie `http-server` nicht global installiert haben, können Sie `npx` verwenden.

```bash
npx http-server -p 8080
```

### 5. Im Browser testen

Öffnen Sie Ihren Browser und navigieren Sie zu:

[http://127.0.0.1:8080/test.html](http://127.0.0.1:8080/test.html)

Sie sollten nun die lokale Test-Chat-Oberfläche sehen und können mit dem Bot interagieren.

## Deployment auf Vercel

Für den produktiven Einsatz wird die `api/chat.js`-Funktion auf Vercel gehostet.

1.  **Vercel-Projekt einrichten**: Verbinden Sie Ihr Git-Repository mit einem neuen Vercel-Projekt. Vercel erkennt das Projekt als Node.js-Anwendung und konfiguriert die Serverless Function automatisch.

2.  **Umgebungsvariablen in Vercel setzen**: Gehen Sie in Ihrem Vercel-Projekt zu `Settings > Environment Variables` und fügen Sie dieselben Schlüssel wie in Ihrer `.env`-Datei hinzu:
    -   `GEMINI_API_KEY`: Ihr Google Gemini API-Schlüssel.
    -   `CHATBOT_SECRET`: Ein sicherer, zufälliger String für die Authentifizierung. **WICHTIG**: Dieser Wert muss mit dem `CHATBOT_SECRET` im `theme.liquid`-Skript übereinstimmen.

3.  **Proxy-URL aktualisieren**: Nach dem Deployment stellt Vercel eine URL für Ihre Funktion bereit (z.B. `https://ihr-projekt.vercel.app/api/chat`). Aktualisieren Sie die `PROXY_SERVER_URL`-Konstante im `theme.liquid`-Skript mit dieser URL.

## Integration in Shopify

1.  **Code kopieren**: Kopieren Sie den gesamten Inhalt von `theme.liquid` (HTML, CSS und JavaScript).
2.  **In Shopify einfügen**: Gehen Sie in Ihrem Shopify-Adminbereich zu `Online Store > Themes`. Klicken Sie bei Ihrem aktuellen Theme auf `Actions > Edit code`. Öffnen Sie die Layout-Datei `theme.liquid` und fügen Sie den kopierten Code direkt vor dem schließenden `</body>`-Tag ein.
3.  **Speichern**: Speichern Sie die Änderungen. Das Chat-Widget sollte nun auf allen Seiten Ihres Shops erscheinen.
