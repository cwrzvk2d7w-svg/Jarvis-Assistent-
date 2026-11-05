
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Der Gemini-Schlüssel ist nicht eingerichtet."
      });
    }

    const frage = req.body?.message;

    if (typeof frage !== "string" || !frage.trim()) {
      return res.status(400).json({ error: "Bitte gib eine Frage ein." });
    }

    if (frage.length > 2000) {
      return res.status(400).json({
        error: "Deine Nachricht ist zu lang."
      });
    }

    const antwort = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Du bist JARVIS, ein freundlicher, hilfreicher persönlicher Assistent. Antworte auf Deutsch, klar und verständlich."
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

    const daten = await antwort.json();

    if (!antwort.ok) {
      console.error("Gemini API-Fehler:", daten.error?.message);
      return res.status(502).json({
        error: "Gemini konnte gerade nicht antworten."
      });
    }

    const text = (daten.candidates?.[0]?.content?.parts || [])
      .map(teil => teil.text || "")
      .join("\n")
      .trim();

    return res.status(200).json({
      answer: text || "Ich konnte leider keine Antwort erzeugen."
    });

  } catch (fehler) {
    console.error("JARVIS-Fehler:", fehler.message);
    return res.status(500).json({
      error: "Es gab einen Serverfehler."
    });
  }
}
