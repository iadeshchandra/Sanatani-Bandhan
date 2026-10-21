/**
 * QUEUED #52 (audit D12): no literal unicode-escape text in UI copy.
 *
 * The audit found Utsav One rendering "samiti\u2019s" — the en/ritual
 * source carried a DOUBLE-escaped sequence (four backslashes + u2019),
 * which a JS string renders as literal backslash + "u2019" text. Copy
 * must carry the real character, never an escape sequence:
 *
 *  (a) src/i18n/lang/** (all user-facing copy fragments): NO backslash-u
 *      escape sequences at all — write the real character.
 *  (b) the rest of src: no run of 2+ backslashes before uXXXX — that
 *      shape always renders as literal escape text in a string.
 *
 * Patterns are built from char codes so this file never contains the
 * literal sequences it hunts for.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.join(__dirname, '..', '..');
const BS = String.fromCharCode(92); // a single backslash, without writing one
const SINGLE_ESCAPE = new RegExp(BS + 'u[0-9a-fA-F]{4}');
const DOUBLE_ESCAPE = new RegExp(BS + '{2,}u[0-9a-fA-F]{4}');

const collect = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      collect(p, out);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      out.push(p);
    }
  }
  return out;
};

const offenders = (files: string[], re: RegExp): string[] => {
  const bad: string[] = [];
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8');
    if (re.test(txt)) bad.push(path.relative(SRC_ROOT, f));
  }
  return bad;
};

describe('no literal unicode escapes in UI copy (QUEUED #52)', () => {
  it('i18n copy fragments contain no backslash-u sequences at all', () => {
    const copyFiles = collect(path.join(SRC_ROOT, 'i18n', 'lang'));
    expect(copyFiles.length).toBeGreaterThan(10); // the scan really ran
    expect(offenders(copyFiles, SINGLE_ESCAPE)).toEqual([]);
  });

  it('no source file renders a double-escaped uXXXX as literal text', () => {
    const all = collect(SRC_ROOT);
    expect(offenders(all, DOUBLE_ESCAPE)).toEqual([]);
  });
});
