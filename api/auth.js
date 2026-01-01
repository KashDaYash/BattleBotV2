export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(200).json({
      ok: false,
      message: "Use POST"
    });
  }

  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({
        ok: false,
        message: "Missing initData"
      });
    }

    // ⚠️ placeholder demo user (backend connection later)
    const demoUser = {
      telegramId: 1,
      fullname: "Demo Player",
      username: "demo",
      coins: 0
    };

    const demoCharacter = {
      name: "Knight",
      level: 1,
      imageUrl: "https://i.imgur.com/5QdQH.jpg",
      stats: {
        hp: 50,
        attack: 12,
        defense: 8,
        speed: 6
      }
    };

    return res.status(200).json({
      ok: true,
      user: demoUser,
      character: demoCharacter
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({
      ok: false,
      message: "Server crash"
    });
  }
}