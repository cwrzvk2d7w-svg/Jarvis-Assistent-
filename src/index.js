
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // JARVIS KI-Schnittstelle
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

      try {
        const result = await env.AI.run(
          "@cf/meta/llama-3.1-8b-instruct",
          {
            messages: [
              {
                role: "system",
                content:
                  "Du bist JARVIS, ein freundlicher und hilfreicher persönlicher KI-Assistent. Antworte auf Deutsch, klar, verständlich und präzise."
              },
              {
                role: "user",
                content: frage
              }
            ],
            max_tokens: 300
          }
        );

        const answer = result?.response?.trim();

        if (!answer) {
          return Response.json(
            { error: "Llama hat keine Antwort geliefert." },
            { status: 502 }
          );
        }

        return Response.json({ answer });

      } catch (error) {
        console.error("Llama-Fehler:", error.message);

        return Response.json(
          { error: "Verbindung zu Llama fehlgeschlagen." },
          { status: 502 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
