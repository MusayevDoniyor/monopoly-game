export const DYNAMIC_CHANCE_CARDS = [
  {
    id: 'ch_start',
    title: 'SPEED WARP',
    category: 'TRAVEL',
    badge: '+$200 (PASS GO)',
    text: 'Advance directly to START. Immediately collect your $200 salary from the treasury.',
    action: { type: 'MOVE_TO', target: 0, collectGo: true }
  },
  {
    id: 'ch_monaco',
    title: 'HIGH ROLLER',
    category: 'TRAVEL',
    badge: 'WARP TO MONACO',
    text: 'Take a luxury VIP helicopter flight straight to Monaco / Boardwalk. If unowned, you may purchase it!',
    action: { type: 'MOVE_TO', target: 35, collectGo: false }
  },
  {
    id: 'ch_tokyo',
    title: 'BUSINESS EXPEDITION',
    category: 'TRAVEL',
    badge: 'ADVANCE TO TOKYO',
    text: 'Corporate summit in Tokyo / Illinois Ave. If you pass START along the way, collect $200.',
    action: { type: 'MOVE_TO', target: 22, collectGo: true }
  },
  {
    id: 'ch_airport',
    title: 'AIRPORT EXPRESS',
    category: 'TRAVEL',
    badge: 'NEAREST AIRPORT',
    text: 'Advance to the nearest Transit Station or International Airport. If owned, pay owner double standard rent.',
    action: { type: 'MOVE_NEAREST_RAILROAD' }
  },
  {
    id: 'ch_jail_free',
    title: 'VIP GOLDEN TICKET',
    category: 'LEGAL',
    badge: 'FREE JAIL ESCAPE',
    text: 'Diplomatic Pass: Get Out of Jail Free! This prestigious credential remains in your portfolio until used.',
    action: { type: 'GET_OUT_OF_JAIL' }
  },
  {
    id: 'ch_go_jail',
    title: 'ARREST WARRANT',
    category: 'PENALTY',
    badge: 'GO TO JAIL',
    text: 'Federal indictment issued! Go directly to Jail. Do not pass START, do not collect $200.',
    action: { type: 'GO_TO_JAIL' }
  },
  {
    id: 'ch_back3',
    title: 'GRIDLOCK DELAY',
    category: 'TRAVEL',
    badge: 'GO BACK 3 SPACES',
    text: 'Severe metropolitan traffic congestion. Reverse your token 3 spaces back.',
    action: { type: 'MOVE_RELATIVE', steps: -3 }
  },
  {
    id: 'ch_crypto',
    title: 'VENTURE DIVIDEND',
    category: 'WINDFALL',
    badge: '+$250 CASH',
    text: 'High-growth technology portfolio appreciation. Collect +$250 dividend payout from the bank.',
    action: { type: 'CASH', amount: 250 }
  },
  {
    id: 'ch_dividend',
    title: 'CORPORATE REWARD',
    category: 'WINDFALL',
    badge: '+$100 CASH',
    text: 'Quarterly institutional profits distributed. Treasury credits your account +$100.',
    action: { type: 'CASH', amount: 100 }
  },
  {
    id: 'ch_speeding_fine',
    title: 'HIGHWAY CITATION',
    category: 'PENALTY',
    badge: '-$75 PENALTY',
    text: 'Radar camera caught your sports car exceeding speed regulations. Pay -$75 fine.',
    action: { type: 'CASH', amount: -75 }
  },
  {
    id: 'ch_eco_fine',
    title: 'CARBON AUDIT',
    category: 'PENALTY',
    badge: '-$50 PENALTY',
    text: 'Environmental agency inspection penalty for excessive enterprise emissions. Pay -$50.',
    action: { type: 'CASH', amount: -50 }
  },
  {
    id: 'ch_repairs',
    title: 'ESTATE RENOVATION',
    category: 'PENALTY',
    badge: '$25/HOUSE • $100/HOTEL',
    text: 'Mandatory structural overhaul across all your properties. Pay $25 per house and $100 per hotel.',
    action: { type: 'REPAIRS', perHouse: 25, perHotel: 100 }
  },
  {
    id: 'ch_party',
    title: 'ROOFTOP SUMMIT',
    category: 'EVENT',
    badge: '-$20 TO EACH PLAYER',
    text: 'You hosted an extravagant penthouse gala for city elites. Gift $20 to each rival tycoon.',
    action: { type: 'PAY_PLAYERS', amount: 20 }
  },
  {
    id: 'ch_grant',
    title: 'INNOVATION TROPHY',
    category: 'WINDFALL',
    badge: '+$150 CASH',
    text: 'Global Economic Forum honors your leadership with the annual Innovation Prize. Collect +$150.',
    action: { type: 'CASH', amount: 150 }
  },
  {
    id: 'ch_tax_rebate',
    title: 'TREASURY REBATE',
    category: 'WINDFALL',
    badge: '+$120 CASH',
    text: 'Annual fiscal audit discrepancy settled in your favor. Government issues +$120 tax refund.',
    action: { type: 'CASH', amount: 120 }
  },
  {
    id: 'ch_luxury_dinner',
    title: 'MICHELIN DINNER',
    category: 'PENALTY',
    badge: '-$60 EXPENSE',
    text: 'Private tasting menu banquet at a world-renowned 3-star culinary establishment. Pay -$60.',
    action: { type: 'CASH', amount: -60 }
  }
];

export const DYNAMIC_CHEST_CARDS = [
  {
    id: 'cc_start',
    title: 'JOURNEY COMPLETED',
    category: 'TRAVEL',
    badge: '+$200 (START)',
    text: 'Global business circuit finalized! Advance directly to START and collect your $200 stipend.',
    action: { type: 'MOVE_TO', target: 0, collectGo: true }
  },
  {
    id: 'cc_lottery',
    title: 'SWEEPSTAKES JACKPOT',
    category: 'WINDFALL',
    badge: '+$300 GRAND PRIZE',
    text: 'MEGA LOTTERY WINNER! You hit the grand national jackpot. Collect +$300 from the bank vault!',
    action: { type: 'CASH', amount: 300 }
  },
  {
    id: 'cc_birthday',
    title: 'FOUNDER BIRTHDAY',
    category: 'WINDFALL',
    badge: '+$20 FROM EACH PLAYER',
    text: 'Annual Founder Anniversary celebration! Every rival tycoon must present you with a $20 gift.',
    action: { type: 'COLLECT_FROM_PLAYERS', amount: 20 }
  },
  {
    id: 'cc_jail_free',
    title: 'DIPLOMATIC IMMUNITY',
    category: 'LEGAL',
    badge: 'FREE JAIL ESCAPE',
    text: 'Consular Special Exemption Pass: Escape Jail immediately at no charge. Retain until required.',
    action: { type: 'GET_OUT_OF_JAIL' }
  },
  {
    id: 'cc_go_jail',
    title: 'JUDICIAL WARRANT',
    category: 'PENALTY',
    badge: 'GO TO JAIL',
    text: 'Magistrate Court verdict rendered! Go directly to Jail. Do not pass START, do not collect $200.',
    action: { type: 'GO_TO_JAIL' }
  },
  {
    id: 'cc_inheritance',
    title: 'ESTATE BEQUEST',
    category: 'WINDFALL',
    badge: '+$200 CASH',
    text: 'You inherit a wealthy foreign benefactor prime estate bond portfolio. Collect +$200.',
    action: { type: 'CASH', amount: 200 }
  },
  {
    id: 'cc_dentist',
    title: 'SPECIALIST CLINIC',
    category: 'PENALTY',
    badge: '-$100 EXPENSE',
    text: 'Advanced private medical and health consultation fees. Settle clinic invoice of -$100.',
    action: { type: 'CASH', amount: -100 }
  },
  {
    id: 'cc_consulting',
    title: 'STRATEGIC RETAINER',
    category: 'WINDFALL',
    badge: '+$150 CASH',
    text: 'Multinational conglomerate engages your strategic expertise for corporate restructuring. Collect +$150.',
    action: { type: 'CASH', amount: 150 }
  },
  {
    id: 'cc_street_repair',
    title: 'CIVIC ASSESSMENT',
    category: 'PENALTY',
    badge: '$40/HOUSE • $115/HOTEL',
    text: 'Municipal council levies district infrastructure refurbishment charges: $40 per house, $115 per hotel.',
    action: { type: 'REPAIRS', perHouse: 40, perHotel: 115 }
  },
  {
    id: 'cc_charity',
    title: 'FOUNDATION DONATION',
    category: 'EVENT',
    badge: '-$50 DONATION',
    text: 'Contribute philanthropic sponsorship to the International Children Healthcare Foundation. Pay -$50.',
    action: { type: 'CASH', amount: -50 }
  },
  {
    id: 'cc_school_fees',
    title: 'EXECUTIVE ACADEMY',
    category: 'PENALTY',
    badge: '-$80 TUITION',
    text: 'Advanced business school executive management tuition installment. Settle invoice of -$80.',
    action: { type: 'CASH', amount: -80 }
  },
  {
    id: 'cc_grand_opening',
    title: 'PREMIERE CEREMONY',
    category: 'WINDFALL',
    badge: '+$50 FROM EACH PLAYER',
    text: 'Ceremonial ribbon cutting at your new commercial pavilion. Collect $50 from each opponent for entry.',
    action: { type: 'COLLECT_FROM_PLAYERS', amount: 50 }
  },
  {
    id: 'cc_stock_gain',
    title: 'PORTFOLIO GAIN',
    category: 'WINDFALL',
    badge: '+$100 CASH',
    text: 'Capital market securities trade concluded with strong positive alpha. Net profit of +$100 credited.',
    action: { type: 'CASH', amount: 100 }
  },
  {
    id: 'cc_insurance',
    title: 'INSURANCE MATURITY',
    category: 'WINDFALL',
    badge: '+$150 CASH',
    text: 'Commercial real estate policy matured with accumulated dividend distribution. Collect +$150.',
    action: { type: 'CASH', amount: 150 }
  },
  {
    id: 'cc_speeding_camera',
    title: 'AUTOMATED FINE',
    category: 'PENALTY',
    badge: '-$50 PENALTY',
    text: 'Expressway traffic monitoring system recorded municipal toll lane violation. Pay -$50 fine.',
    action: { type: 'CASH', amount: -50 }
  }
];

export const CHANCE_CARDS = DYNAMIC_CHANCE_CARDS;
export const COMMUNITY_CHEST_CARDS = DYNAMIC_CHEST_CARDS;
