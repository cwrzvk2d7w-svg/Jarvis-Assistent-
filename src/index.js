
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

      if (!env.GEMINI_API_KEY) {
        return Response.json(
          { error: "Gemini-Schlüssel fehlt in Cloudflare." },
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
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": env.GEMINI_API_KEY
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{
                  text: "Du bist JARVIS, ein freundlicher und hilfreicher persönlicher Assistent. Antworte auf Deutsch, klar und verständlich."
                }]
              },
              contents: [{
                role: "user",
                parts: [{ text: frage }]
              }],
              generationConfig: {
                maxOutputTokens: 300
              }
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
  console.error("Gemini-Fehler:", data.error?.message);

  return Response.json(
    {
      error: "Gemini API Fehler",
      status: response.status,
      details: data.error?.message || "Unbekannter Fehler"
    },
    { status: 502 }
  );
}

        const answer = (data.candidates?.[0]?.content?.parts || [])
          .map(part => part.text || "")
          .join("\n")
          .trim();

        return Response.json({
          answer: answer || "Keine Antwort erhalten."
        });

      } catch (error) {
        console.error("JARVIS-Fehler:", error.message);
        return Response.json(
          { error: "Verbindung zu Gemini fehlgeschlagen." },
          { status: 502 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
