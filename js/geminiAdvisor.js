// Gemini AI Game Advisor and Live Commentary Engine
export class GeminiAdvisor {
  constructor() {
    this.apiKey = typeof localStorage !== 'undefined' ? (localStorage.getItem('gemini_api_key') || '') : '';
    this.modelName = 'gemini-1.5-flash';
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    if (typeof localStorage !== 'undefined') {
      if (this.apiKey) {
        localStorage.setItem('gemini_api_key', this.apiKey);
      } else {
        localStorage.removeItem('gemini_api_key');
      }
    }
  }

  getApiKey() {
    return this.apiKey;
  }

  // Get professional tactical advice for a player's situation
  async getAdvice(engine, player) {
    const gameStateSummary = this.summarizeGameState(engine, player);

    if (this.apiKey) {
      try {
        const prompt = `You are a Grandmaster Monopoly Tournament Champion and financial strategist. 
Analyze this player's exact position and give 2-3 punchy, sharp, highly tactical bullet points on what they should do next (e.g. whether to buy, save cash, upgrade houses, or trade). Be witty and concise (under 75 words). Do not use emojis in your response.

Current Game State:
${JSON.stringify(gameStateSummary, null, 2)}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          }),
          signal: AbortSignal.timeout(6000)
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        }
      } catch (err) {
        console.warn('Gemini API fetch error, falling back to heuristic advisor:', err);
      }
    }

    // High-IQ Heuristic Advisor Fallback
    return this.generateHeuristicAdvice(engine, player);
  }

  // Generate live commentary/roast when notable events happen
  async getCommentary(event, player, details = {}) {
    const defaultQuotes = {
      jail: [
        `${player.name} got apprehended! Behind bars until bail or doubles.`,
        `Direct escort to Jail! ${player.name} is cooling off for a few turns.`,
        `From penthouse aspirations to detention. Tough break for ${player.name}!`
      ],
      speeding: [
        `Three consecutive doubles! Speed violation detected—straight to JAIL!`,
        `Greed exceeded velocity limits! ${player.name} gets sent directly to jail.`
      ],
      big_rent: [
        `Severe rent toll! That payment created a massive dent in ${player.name}'s reserves.`,
        `Substantial cash transfer! ${player.name} just funded rival developments.`,
        `Critical rent hit! ${player.name} must manage remaining liquidity carefully.`
      ],
      monopoly_completed: [
        `MONOPOLY SECURED! ${player.name} now controls the entire set. Construction imminent!`,
        `District cornered! ${player.name} locked down the group. Opponents beware!`
      ],
      bankruptcy_near: [
        `Liquidity crisis! ${player.name} is approaching insolvency.`,
        `Asset liquidation required! ${player.name} is on the financial brink.`
      ]
    };

    const quotes = defaultQuotes[event] || [`Tactical development noted for ${player.name}.`];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  summarizeGameState(engine, player) {
    const properties = engine.getPlayerProperties(player.id).map(p => ({
      name: p.name,
      group: p.group,
      houses: engine.board[p.id].houses,
      mortgaged: engine.board[p.id].mortgaged
    }));

    const opponents = engine.getActivePlayers().filter(p => p.id !== player.id).map(p => ({
      name: p.name,
      cash: p.cash,
      propertiesCount: engine.getPlayerProperties(p.id).length
    }));

    return {
      player: {
        name: player.name,
        cash: player.cash,
        inJail: player.inJail,
        properties
      },
      bankHousesLeft: engine.bank.houses,
      bankHotelsLeft: engine.bank.hotels,
      opponents
    };
  }

  generateHeuristicAdvice(engine, player) {
    const owned = engine.getPlayerProperties(player.id);
    const cash = player.cash;

    // Check if player has complete monopolies
    const monopolies = [];
    owned.forEach(tile => {
      if (tile.type === 'property' && engine.hasMonopoly(player.id, tile.group)) {
        if (!monopolies.includes(tile.group)) monopolies.push(tile.group);
      }
    });

    if (monopolies.length > 0) {
      if (cash > 400) {
        return `<strong>Build Aggressively:</strong> You own the complete ${monopolies.join(', ')} group. Upgrading to 3 houses is the proven sweet spot for maximum ROI and game-winning rent collections.`;
      } else {
        return `<strong>Monopoly Secured:</strong> Preserve a cash buffer of at least $150-200 before purchasing houses to avoid surprise insolvency from landing on rival tiles.`;
      }
    }

    if (cash > 600) {
      return `<strong>Acquisition Phase:</strong> You possess strong liquidity ($${cash}). Acquire any unowned properties you land on and propose trades to complete a full set.`;
    }

    if (cash < 200) {
      return `<strong>Defensive Posture:</strong> Your liquid balance is dangerously low ($${cash}). Consider mortgaging isolated single properties to ensure you can absorb upcoming tolls.`;
    }

    return `<strong>Strategic Positioning:</strong> Target Orange and Red districts if available—they exhibit the highest mathematical landing frequencies (~15% higher traffic) due to players leaving Jail.`;
  }
}

export const geminiAdvisor = new GeminiAdvisor();
