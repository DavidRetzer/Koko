# Shinkoko Gemini Chatbot Proxy

Dieses Projekt implementiert einen Proxy-Server für einen Google Gemini Chatbot, der auf der Website von [shinkoko.at](https://shinkoko.at/) eingesetzt wird. Der Chatbot "Koko" ist ein virtueller Tee-Berater, der Kunden bei der Auswahl von Produkten unterstützt.

## Projektübersicht

Das Projekt besteht aus zwei Hauptteilen:

1.  **Vercel Serverless Function (`/api/chat.js`)**: Dies ist der Kern des Backends. Die Funktion empfängt den Chat-Verlauf vom Frontend, fügt einen detaillierten System-Prompt hinzu, der die Persönlichkeit und die Verhaltensregeln des Bots definiert, und leitet die Anfrage sicher an die Google Gemini API weiter. Sie ist für den produktiven Einsatz auf Vercel ausgelegt.

2.  **Lokaler Express-Server (`server.js`) und Test-Seite (`test.html`)**: Für die Entwicklung und das Testen gibt es einen einfachen Express-Server, der die Vercel-Funktion lokal ausführt. Die `test.html` bietet eine simple Chat-Oberfläche, um die Funktionalität des Bots zu überprüfen, ohne ihn auf der Live-Website implementieren zu müssen.

## Dateistruktur

```
.
├───.gitignore
├───package.json         # Definiert die Projekt-Abhängigkeiten (Express, @google/genai)
├───README.md            # Diese Datei
├───server.js            # Lokaler Express-Server für Testzwecke
├───test.html            # HTML-Seite für lokale Tests des Chatbots
├───.git/                  # Git-Verzeichnis
└───api/
│   └───chat.js          # Die Vercel Serverless Function (Kernlogik des Chatbots)
```

## Lokales Testen

Um den Chatbot lokal zu testen, führen Sie die folgenden Schritte aus:

1.  **Abhängigkeiten installieren**:

    Stellen Sie sicher, dass Node.js installiert ist. Installieren Sie dann die notwendigen Pakete, einschließlich `http-server` für das lokale Hosting der Test-Datei.

    ```bash
    npm install
    npm install -g http-server
    ```

2.  **API-Schlüssel einrichten**:

    Erstellen Sie eine `.env`-Datei im Hauptverzeichnis des Projekts und fügen Sie Ihren Google Gemini API-Schlüssel hinzu:

    ```
    GEMINI_API_KEY="IHR_API_SCHLÜSSEL"
    ```

3.  **Lokalen Proxy-Server starten**:

    Starten Sie in einem Terminal den Proxy-Server. Er wird Anfragen an die Gemini-API weiterleiten.

    ```bash
    node server.js
    ```

    Der Server läuft nun auf `http://localhost:3000`.

4.  **Test-Seite bereitstellen**:

    Öffnen Sie ein **zweites Terminal** und starten Sie den `http-server`, um die `test.html`-Datei bereitzustellen.

    ```bash
    http-server -p 8080
    ```

5.  **Test-Seite im Browser öffnen**:

    Öffnen Sie Ihren Browser und rufen Sie die folgende Adresse auf:

    [http://127.0.0.1:8080/test.html](http://127.0.0.1:8080/test.html)

    Sie können nun Nachrichten an den Chatbot senden und seine Antworten testen.

**Hinweis**: Die `test.html` ist nur für lokale Tests vorgesehen und nicht Teil der produktiven Anwendung.