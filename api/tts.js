export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "No text provided" });

  const VOICE_ID = "nKBk408eGyaoUdu1r3xr";
  const API_KEY  = "sk_ba165abb7b23965214694b60e3213901d50549c444139db9";

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.90,
            style: 0.65,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    res.send(Buffer.from(audioBuffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
