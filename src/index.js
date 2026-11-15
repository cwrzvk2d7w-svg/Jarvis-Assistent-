
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return Response.json(
          { error: "Nur POST erlaubt." },
          { status: 405 }
        );
      }

      if (!env.AI) {
        return Response.json(
          { error: "Cloudflare Workers AI ist nicht verbunden." },
          { status: 500 }
        );
      }

      let body;

      try {
        body = await request.json();
      } catch {
        return Response.json(
          { error: "Ungültige Anfrage." },
          { status: 400 }
        );
      }

      const frage = body?.message;

      if (typeof frage !== "string" || !frage.trim()) {
        return Response.json(
          { error: "Bitte gib eine Frage ein." },
          { status: 400 }
        );
      }

      if (frage.length > 2000) {
        return Response.json(
          { error: "Deine Nachricht ist zu lang." },
          { status: 400 }
        );
      }

      // 1. LLAMA erstellt einen eigenen Vorschlag
      let llamaAntwort;

      try {
        const llamaResult = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct-fast",
          {
            messages: [
              {
                role: "system",
                content:
                  "Du bist Llama im JARVIS-KI-Team. Erarbeite eigenständig einen hilfreichen Lösungsvorschlag auf Deutsch. Antworte klar, sachlich und präzise. Weise auf Unsicherheiten hin."
              },
              {
                role: "user",
                content: frage
              }
            ],
            max_tokens: 250
          }
        );

        llamaAntwort = llamaResult?.response?.trim();

        if (!llamaAntwort) {
          throw new Error("Keine Llama-Antwort");
        }

      } catch (error) {
        console.error("Llama-Fehler:", error?.message || error);

        return Response.json(
          { error: "Llama konnte gerade keine Antwort liefern." },
          { status: 502 }
        );
      }

      // 2. Ohne OpenAI-Schlüssel bleibt Llama aktiv
      if (!env.OPENAI_API_KEY) {
        return Response.json({
          answer: llamaAntwort,
          team: false
        });
      }

      // 3. CHATGPT prüft und verbessert Llamas Vorschlag
      try {
        const openaiResponse = await fetch(
          "https://api.openai.com/v1/responses",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "gpt-6-luna",
              instructions:
                "Du bist ChatGPT im JARVIS-KI-Team. Prüfe Llamas Vorschlag kritisch auf Richtigkeit und Vollständigkeit. Korrigiere Fehler und ergänze fehlende Aspekte. Erstelle eine gemeinsame, verständliche Antwort auf Deutsch. Erfinde keine Fakten und benenne Unsicherheiten offen.",
              input:
                "Nutzeranfrage:\n" + frage +
                "\n\nVorschlag von Llama:\n" + llamaAntwort,
              max_output_tokens: 500
            })
          }
        );

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();

          console.error(
            "OpenAI-Fehler:",
            openaiResponse.status,
            errorText
          );

          return Response.json({
            answer:
              llamaAntwort +
              "\n\n(Hinweis: ChatGPT war nicht erreichbar. Dies ist die Antwort von Llama.)",
            team: false
          });
        }

        const openaiData = await openaiResponse.json();

        const answer = (openaiData.output || [])
          .filter(item => item.type === "message")
          .flatMap(item => item.content || [])
          .filter(part => part.type === "output_text")
          .map(part => part.text)
          .join("\n")
          .trim();

        if (!answer) {
          return Response.json({
            answer: llamaAntwort,
            team: false
          });
        }

        // 4. Gemeinsame Antwort an JARVIS
        return Response.json({
          answer,
          team: true
        });

      } catch (error) {
        console.error(
          "OpenAI-Verbindungsfehler:",
          error?.message || error
        );

        return Response.json({
          answer:
            llamaAntwort +
            "\n\n(Hinweis: ChatGPT war nicht erreichbar. Dies ist die Antwort von Llama.)",
          team: false
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
