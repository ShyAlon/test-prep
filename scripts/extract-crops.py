"""OCR booklet crops into the same text fields used by generated questions.

Requires Tesseract with a Hebrew language model. Applies reviewed booklet
corrections after OCR; the app only loads the resulting text bank. Retains the original
source bank unchanged when a separate output path is supplied.
"""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess
import tempfile
import hashlib


def extract_bank(bank, tessdata):
    jobs = []
    for test in bank['tests']:
        for q in test['questions']:
            for field in ('prompt', 'explanation'):
                if q.get(field + 'Art'):
                    jobs.append((q, field, None, q[field + 'Art']))
            for i, art in enumerate(q.get('choiceArt', [])):
                jobs.append((q, 'choices', i, art))
    for key, art in bank.get('referenceArt', {}).items():
        jobs.append((bank['passages'], key, None, art))

    def recognize(job):
        owner, field, index, art = job
        cache = Path('/tmp/gifted-ocr-cache')
        cache.mkdir(exist_ok=True)
        cached = cache / (hashlib.sha256(('heb-with-niqqud-v3' + art['src']).encode()).hexdigest() + '.txt')
        if cached.exists():
            return owner, field, index, cached.read_text()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'crop.png'
            path.write_bytes(base64.b64decode(art['src'].split(',', 1)[1]))
            command = ['tesseract', str(path), str(Path(directory) / 'result'), '-l', 'heb', '--psm', '6']
            if tessdata:
                command += ['--tessdata-dir', tessdata]
            subprocess.run(command, check=True, capture_output=True, text=True)
            # Keep Unicode vowel points; reviewed text corrections below repair
            # OCR placement errors rather than discarding the marks.
            text = (Path(directory) / 'result.txt').read_text()
            text = text.replace('\u200f', '').replace('\u200e', '').strip()
            if not text:
                command[command.index('--psm') + 1] = '7'
                subprocess.run(command, check=True, capture_output=True, text=True)
                text = (Path(directory) / 'result.txt').read_text().strip()
            if not text:
                print(f'Fallback to PDF text: {owner.get("id", "reference")} {field} {index}')
                text = owner[field] if index is None else owner[field][index]
            cached.write_text(text)
            return owner, field, index, text

    with ThreadPoolExecutor(max_workers=6) as pool:
        for owner, field, index, text in pool.map(recognize, jobs):
            if index is None:
                owner[field] = text
            else:
                owner[field][index] = text
    for test in bank['tests']:
        for q in test['questions']:
            for field in ('promptArt', 'choiceArt', 'explanationArt'):
                q.pop(field, None)
            q['origin'] = 'booklet'
    bank.pop('referenceArt', None)
    bank['version'] = 2
    corrections = json.loads(Path(__file__).with_name('booklet-corrections.json').read_text())
    for test in bank['tests']:
        for question in test['questions']:
            question.update(corrections['questions'].get(question['id'], {}))
    bank['passages'].update(corrections['passages'])
    return bank


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('bank', type=Path)
    cli.add_argument('--tessdata')
    cli.add_argument('--output', type=Path, default=Path('src/question-bank.json'))
    args = cli.parse_args()
    bank = json.loads(args.bank.read_text())
    args.output.write_text(json.dumps(extract_bank(bank, args.tessdata), ensure_ascii=False, indent=2) + '\n')
