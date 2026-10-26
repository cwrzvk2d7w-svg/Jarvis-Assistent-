export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt." });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Der OpenAI-Schlüssel ist auf dem Server noch nicht eingerichtet."
      });
    }

    const frage = req.body?.message;

    if (typeof frage !== "string" || !frage.trim()) {
      return res.status(400).json({ error: "Bitte gib eine Frage ein." });
    }

    if (frage.length > 2000) {
      return res.status(400).json({
        error: "Deine Nachricht ist zu lang. Bitte kürze sie auf 2000 Zeichen."
      });
    }

    const openaiAntwort = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions: "Du bist JARVIS, ein freundlicher, hilfreicher persönlicher Assistent. Antworte auf Deutsch, klar und verständlich.",
        input: frage,
        max_output_tokens: 300
      })
    });

    const daten = await openaiAntwort.json();

    if (!openaiAntwort.ok) {
      console.error("OpenAI API-Fehler:", daten.error?.message || "Unbekannter Fehler");
      return res.status(502).json({
        error: "Die KI konnte gerade nicht antworten. Bitte versuche es später erneut."
      });
    }

    const text = (daten.output || [])
      .flatMap(element => element.content || [])
      .filter(element => element.type === "output_text")
      .map(element => element.text)
      .join("\n");

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