"""Render exact Hebrew and math typography for the local question bank."""
import base64
import math
import re
import struct
import subprocess
import xml.etree.ElementTree as ET
import zlib

SCALE = 2
LETTERS = "אבגד"
OPTION_MARK = re.compile(r"^\.([אבגד])$")


def coordinate(element, key):
    return float(element.get(key))


def union(elements):
    return (
        min(coordinate(element, "xMin") for element in elements),
        min(coordinate(element, "yMin") for element in elements),
        max(coordinate(element, "xMax") for element in elements),
        max(coordinate(element, "yMax") for element in elements),
    )


def png_chunk(name, data):
    return struct.pack(">I", len(data)) + name + data + struct.pack(">I", zlib.crc32(name + data))


class RasterPage:
    def __init__(self, pdf, page):
        ppm = subprocess.check_output([
            'pdftoppm', '-f', str(page), '-l', str(page), '-r', str(72 * SCALE), '-gray', '-singlefile', str(pdf),
        ])
        _, dimensions, _, self.pixels = ppm.split(b'\n', 3)
        self.width, self.height = map(int, dimensions.split())

    def crop(self, rectangle, padding=2):
        left, top, right, bottom = rectangle
        x1 = max(0, math.floor((left - padding) * SCALE))
        y1 = max(0, math.floor((top - padding) * SCALE))
        x2 = min(self.width, math.ceil((right + padding) * SCALE))
        y2 = min(self.height, math.ceil((bottom + padding) * SCALE))
        rows = bytearray()
        for y in range(y1, y2):
            start = y * self.width
            row = self.pixels[start + x1:start + x2]
            # Pack four grayscale levels into two bits per pixel.
            rows.append(0)
            for x in range(0, len(row), 4):
                quartet = row[x:x + 4].ljust(4, b'\xff')
                rows.append(sum((pixel >> 6) << (6 - i * 2) for i, pixel in enumerate(quartet)))
        png = b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', struct.pack(">IIBBBBB", x2 - x1, y2 - y1, 2, 0, 0, 0, 0))
        png += png_chunk(b'IDAT', zlib.compress(rows, 9)) + png_chunk(b'IEND', b'')
        return {'src': 'data:image/png;base64,' + base64.b64encode(png).decode('ascii'),
                'width': round((x2 - x1) * .75), 'height': round((y2 - y1) * .75)}


def add_art(pdf, bank):
    bbox = subprocess.check_output(['pdftotext', '-bbox-layout', str(pdf), '-'])
    layout = ET.fromstring(bbox).findall('.//{*}page')
    by_page = {}
    explanations = {}
    for test in bank['tests']:
        for question in test['questions']:
            by_page.setdefault(question['page'], []).append(question)
            source = question.pop('explanationSource')
            if source:
                page, index, count = source
                explanations.setdefault(page, []).append((question, index, count))

    references = {}
    for page in sorted(set(by_page) | set(map(int, bank['passages']))):
        lines = layout[page - 1].findall('.//{*}line')
        lines.sort(key=lambda line: coordinate(line, 'yMin'))
        anchors = [
            word for line in lines for word in line.findall('{*}word')
            if '\u200b' in word.text
        ]
        page_questions = by_page.get(page, [])
        if len(anchors) != len(page_questions):
            raise ValueError(f'Could not match the printed questions on page {page}.')
        raster = RasterPage(pdf, page)
        if str(page) in bank['passages']:
            limit = coordinate(anchors[0], 'yMin') - 7 if anchors else 754
            body = [line for line in lines if 75 <= coordinate(line, 'yMin') < limit]
            bottom = min(limit, max(coordinate(line, 'yMax') for line in body) + 5)
            references[str(page)] = raster.crop((57, 76, 524, bottom), padding=0)

        for index, (anchor, question) in enumerate(zip(anchors, page_questions)):
            top = coordinate(anchor, 'yMin')
            bottom = coordinate(anchors[index + 1], 'yMin') if index + 1 < len(anchors) else 755
            rows = [line for line in lines if top - 2 <= coordinate(line, 'yMin') < bottom - 2]
            options = {}
            for line in rows:
                # Poppler groups some tightly spaced answer columns into one line.
                group = []
                for word in line.findall('{*}word'):
                    match = OPTION_MARK.fullmatch(word.text)
                    if match and group:
                        options[match[1]] = (union(group), coordinate(line, 'yMin'))
                        group = []
                    else:
                        group.append(word)
            if set(options) != set(LETTERS):
                raise ValueError(f'Could not match four printed options for {question["id"]}: {set(options)}')
            option_top = min(y for _, y in options.values())
            words = [
                word for line in rows if coordinate(line, 'yMin') < option_top - 2
                for word in line.findall('{*}word')
                if coordinate(word, 'xMax') < coordinate(anchor, 'xMin') + 1
            ]
            if not words:
                raise ValueError(f'No printed prompt for {question["id"]}, {top=}, {option_top=}.')
            question['promptArt'] = raster.crop(union(words))
            question['choiceArt'] = [raster.crop(options[letter][0]) for letter in LETTERS]
    bank['referenceArt'] = references


    for page, entries in explanations.items():
        lines = sorted(layout[page - 1].findall('.//{*}line'), key=lambda line: coordinate(line, 'yMin'))
        anchors = [coordinate(line, 'yMin') for line in lines
                   if any('\u200b' in word.text for word in line.findall('{*}word'))]
        raster = RasterPage(pdf, page)
        for question, index, count in entries:
            start = anchors[index]
            end = anchors[index + 1] if index + 1 < len(anchors) else 755
            rows = []
            for line in lines:
                y = coordinate(line, 'yMin')
                if not start + 4 < y < end - 4:
                    continue
                if not rows or y - coordinate(rows[-1][0], 'yMin') > 4:
                    rows.append([])
                rows[-1].append(line)
            if not 0 < count <= len(rows):
                raise ValueError(f'Could not match the printed explanation for {question["id"]}: {count=}, rows={len(rows)}')
            question['explanationArt'] = raster.crop(union([line for row in rows[:count] for line in row]))
