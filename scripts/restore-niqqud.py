"""Restore Unicode niqqud offline, without changing letters or question data.

Requires dicta-onnx==1.0.9 and local Dicta ONNX model/tokenizer files.
Outputs are reconstructed readings, not an exact transcription of damaged PDF
vowel positions. Review names/ambiguous words before committing the text.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import unicodedata

MARKS = re.compile(r'[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7]')
WORD = re.compile(r'[א-ת][א-ת\u0591-\u05c7]*')
# Readings checked against the booklet; OCR and statistical models often
# misread proper nouns. Keys preserve the existing consonants exactly.
READINGS = {
    'לנסע': 'לִנְסֹעַ', 'לאכל': 'לֶאֱכֹל', 'לשמר': 'לִשְׁמֹר', 'לשמע': 'לִשְׁמֹעַ',
    'לקרא': 'לִקְרֹא', 'לקראן': 'לִקְרֹאן', 'לכתב': 'לִכְתֹּב', 'לחסך': 'לַחֲסֹךְ',
    'לחקר': 'לַחֲקֹר', 'ולחקר': 'וְלַחֲקֹר', 'שלוב': 'שִׁלּוּב',
    'תלמידה': 'תַּלְמִידָה', 'צב': 'צָב', 'באוקינוס': 'בָּאוֹקְיָנוּס',
    'נחשב': 'נְחַשֵּׁב', 'מחשבים': 'מְחַשְּׁבִים',
    'מחברת': 'מַחְבֶּרֶת', 'במחברת': 'בְּמַחְבֶּרֶת',
    'המשוש': 'הַמִּשּׁוּשׁ', 'משוש': 'מִשּׁוּשׁ', 'הראיה': 'הָרְאִיָּה',
    'עדף': 'עֹדֶף', 'המשוה': 'הַמַּשְׁוֶה', 'המשווה': 'הַמַּשְׁוֶוה',
    'מאבנים': 'מְאֻבָּנִים', 'המאבנים': 'הַמְּאֻבָּנִים', 'מאבן': 'מְאֻבָּן',
    'מקבל': 'מְקֻבָּל', 'מוערך': 'מוּעֲרָךְ', 'מוערכת': 'מוּעֲרֶכֶת',
    'שיבה': 'שֵׂיבָה', 'סלט': 'סָלָט', 'השער': 'הַשֵּׂעָר', 'שער': 'שֵׂעָר',
    'יקמלו': 'יִקְמְלוּ',
    'איי': 'אִיֵּי', 'לאיי': 'לְאִיֵּי', 'באיי': 'בְּאִיֵּי',
    'גלפגוס': 'גָּלָפָּגוֹס', 'הגלפגוס': 'הַגָּלָפָּגוֹס',
    'היפטיה': 'הִיפַּטְיָה', 'תיאון': 'תֵּיאוֹן',
    'אלכסנדריה': 'אַלֶכְּסַנְדְּרִיָּה', 'באלכסנדריה': 'בְּאַלֶכְּסַנְדְּרִיָּה',
    'הלן': 'הֶלֶן', 'להלן': 'לְהֶלֶן', 'קלר': 'קֶלֶר', 'סאליבן': 'סָאלִיבָן',
    'ונציה': 'וֶנֶצְיָה', 'בוונציה': 'בְּוֶנֶצְיָה', 'לונציה': 'לְוֶנֶצְיָה', 'לוונציה': 'לְוֶנֶצְיָה',
    'מרי': 'מֵרִי', 'אנינג': 'אֵנִינְג',
    'איכתיוזאור': 'אִיכְתִּיוֹזָאוּר', 'האיכתיוזאור': 'הָאִיכְתִּיוֹזָאוּר',
    'פלסיוזאור': 'פְּלֵסְיוֹזָאוּר', 'פלסיוזאורוס': 'פְּלֵסְיוֹזָאוּרוּס',
    'הפלסיוזאורוס': 'הַפְּלֵסְיוֹזָאוּרוּס',
    'לוך': 'לוֹךְ', 'נס': 'נֶס', 'מלוך': 'מִלּוֹךְ', 'בלוך': 'בְּלוֹךְ',
    'מלנין': 'מֶלָנִין', 'המלנין': 'הַמֶּלָנִין', 'בריל': 'בְּרַיְל', 'ברייל': 'בְּרַיְיל',
}
# The spelling with matres lectionis must remain unchanged too.
READINGS.update({letter: letter for letter in 'אבגד'})
READINGS = {key: value for key, value in READINGS.items() if MARKS.sub('', value) == key}


class Restorer:
    def __init__(self, model_path, tokenizer_path, cache_dir):
        from dicta_onnx.model import OnnxDiacritizationModel
        from tokenizers import Tokenizer
        import onnxruntime as ort
        self.model = OnnxDiacritizationModel.__new__(OnnxDiacritizationModel)
        self.model.tokenizer = Tokenizer.from_file(str(tokenizer_path))
        options = ort.SessionOptions()
        options.intra_op_num_threads = 4
        self.model.session = ort.InferenceSession(str(model_path), sess_options=options, providers=['CPUExecutionProvider'])
        self.model.input_names = [item.name for item in self.model.session.get_inputs()]
        self.model.output_names = [item.name for item in self.model.session.get_outputs()]
        self.cache = Path(cache_dir)
        self.cache.mkdir(parents=True, exist_ok=True)

    def point(self, text):
        if not re.search('[א-ת]', text):
            return text
        bare = MARKS.sub('', text)
        cache = self.cache / (hashlib.sha256(bare.encode()).hexdigest() + '.txt')
        if cache.exists():
            pointed = cache.read_text()
        else:
            # Keep context within paragraphs; split long passages at line breaks.
            chunks = re.split(r'(\n+)', bare) if len(bare) > 1600 else [bare]
            results = []
            for chunk in chunks:
                if re.search('[א-ת]', chunk):
                    if len(chunk) > 2000:
                        raise ValueError('Split long paragraphs before restoration')
                    chunk = self.model.predict([chunk])[0]
                results.append(chunk)
            pointed = ''.join(results)
            if MARKS.sub('', pointed) != bare:
                raise ValueError(f'Model changed source characters: {bare[:80]!r}')
            cache.write_text(pointed)
        pointed = WORD.sub(lambda match: READINGS.get(MARKS.sub('', match[0]), match[0]), pointed)
        pointed = unicodedata.normalize('NFC', pointed)
        if MARKS.sub('', pointed) != bare:
            raise ValueError('A reviewed reading changed source letters')
        return pointed

    def bank(self, bank):
        for test in bank['tests']:
            for question in test['questions']:
                for key in ('prompt', 'instruction', 'explanation'):
                    if question.get(key):
                        question[key] = self.point(question[key])
                question['choices'] = [self.point(choice) for choice in question['choices']]
        bank['passages'] = {key: self.point(text) for key, text in bank['passages'].items()}
        return bank


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('bank', type=Path)
    cli.add_argument('--model', required=True, type=Path)
    cli.add_argument('--tokenizer', required=True, type=Path)
    cli.add_argument('--cache', type=Path, default=Path('/tmp/gifted-niqqud-cache'))
    cli.add_argument('--output', type=Path, required=True)
    args = cli.parse_args()
    restore = Restorer(args.model, args.tokenizer, args.cache)
    bank = restore.bank(json.loads(args.bank.read_text()))
    args.output.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + '\n')
