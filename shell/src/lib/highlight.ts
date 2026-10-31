// Which characters of a name to mark for what was typed: each word, where it
// first occurs (a word start preferred). Matches the engine finds another
// way (pinyin, wildcards) are simply not marked.

export type Piece = { text: string; hit: boolean };

export function highlight(name: string, query: string): Piece[] {
  const lower = name.toLowerCase();
  const marks = new Array<boolean>(name.length).fill(false);
  for (const word of query.toLowerCase().split(/\s+/).filter(Boolean)) {
    let at = -1;
    for (let i = lower.indexOf(word); i >= 0; i = lower.indexOf(word, i + 1)) {
      if (i === 0 || /[\s\-_.()[\]\\/]/.test(lower[i - 1]!)) {
        at = i;
        break;
      }
      if (at < 0) at = i;
    }
    if (at >= 0) for (let i = at; i < at + word.length; i++) marks[i] = true;
  }
  const pieces: Piece[] = [];
  for (let i = 0; i < name.length; i++) {
    const last = pieces[pieces.length - 1];
    if (last && last.hit === marks[i]) last.text += name[i];
    else pieces.push({ text: name[i]!, hit: marks[i]! });
  }
  return pieces;
}
