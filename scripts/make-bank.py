"""Convert the personal-use booklet into the bundled JSON question bank with Poppler."""
import argparse
import json
import re
import subprocess
from pathlib import Path

from booklet_art import add_art
from math_solutions import MATH_STEPS

LETTERS = "אבגד"
CONTROLS = re.compile(r"[\u200b-\u200f\u202a-\u202e]")
MARK = re.compile(r"\.(?:[\u0591-\u05c7]*\s*)?\u200b(\d+)\u202c")
OPTION = re.compile(r"(?:\u202b|(?<=\u202c))([אבגד])\u202a[^.\u202b\n]*?\.")
TESTS = [
    [(3,4,5,'דבאדגדאג'), (6,7,8,'גדאאבגג'), (0,9,10,'גבבגא'), (0,11,11,'בדגאאאג')],
    [(0,12,13,'גאדאגגגאגבא'), (14,14,16,'דאגבדדאב'), (17,18,19,'דדבגבבאא')],
    [(20,20,21,'גגגדב'), (0,22,22,'גאגדב'), (23,23,25,'גבאבבדגא'), (26,26,28,'בבדאגבא')],
    [(29,30,31,'גאדבדגדג'), (32,32,34,'אדדגאבב'), (0,35,36,'גאבאג'), (0,36,36,'דאגא'), (0,37,37,'בדבבבג')],
    [(38,39,40,'גבדדאדג'), (41,42,43,'בבדדאבגג'), (44,44,45,'דבאאג'), (0,46,47,'דגדבדגדאבד')],
]




def clean(text):
    # Attach standalone combining marks in the text alternatives.
    text = CONTROLS.sub('', text)
    text = re.sub(r" +(?=[\u0591-\u05c7])", "", text)
    return "\n".join(" ".join(line.split()) for line in text.splitlines() if line.strip())


def body(page):
    lines = page.strip().splitlines()
    return '\n'.join(line.strip() for line in lines[1:] if line.strip()
                     and not line.strip().startswith(('\u202bעמוד ', '\u202bכל הזכויות')))


def questions_on_page(page):
    previous_end = 0
    matches = list(OPTION.finditer(page))
    for index in range(len(matches) - 3):
        options = matches[index:index + 4]
        if options[0].start() < previous_end or set(m[1] for m in options) != set(LETTERS):
            continue
        first = options[0].start()
        prefix = page[previous_end:first]
        markers = list(MARK.finditer(prefix))
        if not markers:
            continue
        marker = markers[-1]
        line_start = prefix.rfind('\n', 0, marker.start()) + 1
        line_end = page.find('\n', options[-1].end())
        if line_end < 0:
            line_end = len(page)
        prompt = prefix[line_start:marker.start()] + prefix[marker.end():]
        choices = {}
        for i, match in enumerate(options):
            end = options[i + 1].start() if i + 1 < len(options) else line_end
            if '\n' in page[match.end():end] and i + 1 < len(options):
                end = page.index('\n', match.end())
            # When Poppler groups a numeric option in an LTR run, its value
            # precedes the period in extracted text.
            numeric = match[0].split('\u202a', 1)[1][:-1]
            choices[match[1]] = clean(numeric + page[match.end():end])
        yield int(marker[1]), clean(prompt), [choices[c] for c in LETTERS], previous_end + line_start
        previous_end = line_end


def build(pdf):
    raw = subprocess.check_output(['pdftotext', '-layout', str(pdf), '-'], text=True)
    pages = [None] + [body(page) for page in raw.split('\f')]
    if len(pages) != 71:
        raise ValueError('Expected the 69-page Stage A booklet.')
    parsed = {n: list(questions_on_page(pages[n])) for n in range(3, 48)}
    solutions = []
    for page in pages[51:70]:
        lines = page.splitlines()
        for index, line in enumerate(lines):
            marker = MARK.search(line)
            if not marker:
                continue
            answer = re.search(r"\s+([אבגד])\.", clean(line))
            if not answer:
                continue
            explanation = []
            for detail in lines[index + 1:]:
                if MARK.search(detail) or not explanation and not re.search(r"הֶ ?סְ", detail):
                    break
                explanation.append(detail)
            solutions.append((int(marker[1]), answer[1], clean("\n".join(explanation))))

    tests = []
    passages = {}
    solution_index = 0
    for test_number, sections in enumerate(TESTS, 1):
        questions = []
        consumed = set()
        for section, (passage, start, end, key) in enumerate(sections, 1):
            if passage:
                cutoff = parsed[passage][0][3] if parsed[passage] else len(pages[passage])
                passages[str(passage)] = clean(pages[passage][:cutoff])
            found = []
            for page_number in range(start, end + 1):
                for number, prompt, choices, offset in parsed[page_number]:
                    if (page_number, offset) in consumed:
                        continue
                    if number != len(found) + 1 or number > len(key):
                        break
                    if not prompt or any(not choice for choice in choices):
                        raise ValueError(f'Incomplete question on page {page_number}, question {number}')
                    consumed.add((page_number, offset))
                    if (test_number, section) == (4, 5) or (test_number, section) == (5, 4) and number <= 5:
                        solution_number, answer = number, key[number - 1]
                        explanation = ""
                    else:
                        solution_number, answer, explanation = solutions[solution_index]
                        solution_index += 1
                    if solution_number != number:
                        raise ValueError(f'Answer mismatch at test {test_number}, section {section}, question {number}: {(solution_number, answer)}')
                    if (test_number, section, number) == (5, 1, 4):
                        _, answer, explanation = solutions[solution_index]
                    elif (test_number, section, number) == (5, 1, 5):
                        _, answer, explanation = solutions[solution_index - 2]
                    steps = MATH_STEPS.get((test_number, section))
                    if steps:
                        explanation = steps[number - 1]
                    if answer != key[number - 1]:
                        print(f'Answer table differs from worked solution at test {test_number}, section {section}, question {number}: {key[number - 1]} vs {answer}')
                    if (test_number, section, number) == (2, 1, 2):
                        prompt = '11 ✕ 4 = 100 - __'
                    found.append(dict(id=f'{test_number}-{section}-{number}', prompt=prompt, choices=choices,
                                      correct=LETTERS.index(answer), explanation=explanation, page=page_number,
                                      passage=str(passage) if passage else None,
                                      instruction=('מהו המספר הבא בסדרה?' if (test_number, section) in {(1, 4), (4, 4)}
                                                   else 'השלימו את המספר החסר.' if (test_number, section) == (2, 1) and number <= 5
                                                   else 'פתרו את התרגיל.' if (test_number, section) == (4, 5)
                                                        or (test_number, section) == (5, 4) and number <= 5 else None)))
            if len(found) != len(key):
                raise ValueError(f'Test {test_number}, section {section}: expected {len(key)} questions, found {len(found)}.')
            questions.extend(found)
        tests.append(dict(id=str(test_number), questions=questions))
    if solution_index != len(solutions):
        raise ValueError(f'Unexpected extra solutions after question {solution_index}.')
    return dict(version=1, tests=tests, passages=passages)


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('pdf', type=Path)
    cli.add_argument('output', type=Path, nargs='?', default=Path('src/question-bank.json'))
    args = cli.parse_args()
    bank = build(args.pdf)
    add_art(args.pdf, bank)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(bank, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {sum(len(test['questions']) for test in bank['tests'])} questions to {args.output}")
