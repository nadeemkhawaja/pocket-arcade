/* ==========================================================================
   Scoring: points, deuce and advantage, games, sets, 7-point tiebreak
   ========================================================================== */

const PT_LABEL = ['0', '15', '30', '40'];
const PT_WORDS = ['Love', 'Fifteen', 'Thirty', 'Forty'];
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty'];
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];
const numWord = (n) => NUM_WORDS[n] || String(n);
const gamesWord = (n) => (n === 0 ? 'love' : numWord(n));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

class Score {
  constructor(fmt, firstServer) {
    this.fmt = fmt;
    this.sets = [[0, 0]];
    this.setsWon = [0, 0];
    this.pts = [0, 0];
    this.tb = false;
    this.server = firstServer;
    this.tbFirst = -1;
    this.played = 0;
    this.over = false;
    this.winner = -1;
  }

  clone() {
    const s = Object.create(Score.prototype);
    s.fmt = this.fmt;
    s.sets = this.sets.map((a) => a.slice());
    s.setsWon = this.setsWon.slice();
    s.pts = this.pts.slice();
    s.tb = this.tb; s.server = this.server; s.tbFirst = this.tbFirst;
    s.played = this.played; s.over = this.over; s.winner = this.winner;
    return s;
  }

  get games() { return this.sets[this.sets.length - 1]; }
  get setIndex() { return this.sets.length - 1; }

  /** Team serving the next point. In a tiebreak the serve changes after the
   *  first point and then every two points. */
  servingTeam() {
    if (!this.tb) return this.server;
    const block = Math.floor((this.played + 1) / 2);
    return block % 2 === 0 ? this.tbFirst : 1 - this.tbFirst;
  }

  /** Deuce court on even points, ad court on odd points. */
  side() { return this.played % 2 === 0 ? 'deuce' : 'ad'; }

  award(team) {
    if (this.over) return null;
    const o = 1 - team;
    this.pts[team]++;
    this.played++;
    let gameWon;
    if (this.tb) gameWon = this.pts[team] >= 7 && this.pts[team] - this.pts[o] >= 2;
    else gameWon = this.pts[team] >= 4 && this.pts[team] - this.pts[o] >= 2;
    if (!gameWon) return { type: 'point', team };

    const g = this.games;
    g[team]++;
    const wasTb = this.tb;
    const tbScore = wasTb ? this.pts.slice() : null;
    this.pts = [0, 0];
    this.played = 0;

    let setWon;
    if (wasTb) setWon = true;
    else setWon = g[team] >= this.fmt.games && (!this.fmt.winBy2 || g[team] - g[o] >= 2);

    if (wasTb) { this.server = 1 - this.tbFirst; this.tb = false; }
    else this.server = 1 - this.server;

    if (!setWon) {
      let tbStarted = false;
      if (this.fmt.tb && g[0] === this.fmt.tb && g[1] === this.fmt.tb) {
        this.tb = true; this.tbFirst = this.server; tbStarted = true;
      }
      return { type: 'game', team, tbStarted };
    }
    this.setsWon[team]++;
    const setNo = this.sets.length - 1;
    if (this.setsWon[team] >= this.fmt.sets) {
      this.over = true; this.winner = team;
      return { type: 'match', team, wasTb, tbScore, setNo };
    }
    this.sets.push([0, 0]);
    return { type: 'set', team, wasTb, tbScore, setNo };
  }

  /** Point cell on the scoreboard. */
  ptsDisplay(team) {
    if (this.tb) return String(this.pts[team]);
    const a = this.pts[team], b = this.pts[1 - team];
    if (a >= 3 && b >= 3) return a > b ? 'AD' : '40';
    return PT_LABEL[Math.min(a, 3)];
  }

  /** Big banner after a point, server's score first. */
  banner(names) {
    if (this.tb) {
      const [p0, p1] = this.pts;
      if (p0 === p1) return p0 + ' ALL';
      const lead = p0 > p1 ? 0 : 1;
      return Math.max(p0, p1) + ' - ' + Math.min(p0, p1) + ' ' + names[lead];
    }
    const s = this.servingTeam(), r = 1 - s;
    const a = this.pts[s], b = this.pts[r];
    if (a >= 3 && b >= 3) {
      if (a === b) return 'DEUCE';
      return 'ADVANTAGE ' + names[a > b ? s : r];
    }
    if (a === b && a > 0) return PT_LABEL[a] + ' ALL';
    return PT_LABEL[a] + ' - ' + PT_LABEL[b];
  }

  /** What the chair umpire says after a point. */
  call(names) {
    if (this.tb) {
      const [p0, p1] = this.pts;
      if (p0 === p1) return cap(numWord(p0)) + ' all';
      const lead = p0 > p1 ? 0 : 1;
      return cap(numWord(Math.max(p0, p1))) + ' ' + numWord(Math.min(p0, p1)) + ', ' + names[lead];
    }
    const s = this.servingTeam(), r = 1 - s;
    const a = this.pts[s], b = this.pts[r];
    if (a >= 3 && b >= 3) {
      if (a === b) return 'Deuce';
      return 'Advantage, ' + names[a > b ? s : r];
    }
    if (a === b) return PT_WORDS[a] + ' all';
    return PT_WORDS[a] + ' ' + PT_WORDS[b].toLowerCase();
  }

  /** Umpire call after a game, set or match ends. */
  gameCall(res, names) {
    const who = names[res.team];
    if (res.type === 'match') return 'Game, set and match, ' + who + '.';
    if (res.type === 'set') {
      const g = this.sets[res.setNo];
      const hi = Math.max(g[0], g[1]), lo = Math.min(g[0], g[1]);
      const ord = this.fmt.sets > 1 ? (ORDINALS[res.setNo] || '') + ' ' : '';
      return 'Game and ' + ord + 'set, ' + who + '. ' + cap(gamesWord(hi)) + ' games to ' + gamesWord(lo) + '.';
    }
    const g = this.games;
    let s = 'Game, ' + who + '.';
    if (this.fmt.games > 1) {
      if (g[0] === g[1]) s += ' ' + cap(numWord(g[0])) + (g[0] === 1 ? ' game' : ' games') + ' all.';
      else {
        const lead = g[0] > g[1] ? 0 : 1;
        const hi = Math.max(g[0], g[1]);
        s += ' ' + names[lead] + ' leads, ' + gamesWord(hi) + (hi === 1 ? ' game' : ' games') + ' to ' + gamesWord(Math.min(g[0], g[1])) + '.';
      }
    }
    if (res.tbStarted) s += ' Tiebreak.';
    return s;
  }

  /** Break point, set point or match point for the next rally. */
  situation() {
    if (this.over) return null;
    let best = null;
    const rank = { break: 1, set: 2, match: 3 };
    for (const t of [0, 1]) {
      const c = this.clone();
      const r = c.award(t);
      let kind = null;
      if (r.type === 'match') kind = 'match';
      else if (r.type === 'set') kind = 'set';
      else if (r.type === 'game' && !this.tb && t !== this.servingTeam()) kind = 'break';
      if (kind && (!best || rank[kind] > rank[best.kind])) best = { kind, team: t };
    }
    return best;
  }

  /** Completed set scores plus the live set, for the results screen. */
  setLines() { return this.sets.map((g) => g.slice()); }
}
