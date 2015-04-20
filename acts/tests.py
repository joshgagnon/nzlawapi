import unittest
import importlib
import sys
import os
import re


#e.split('[^.a-zA-Z\d\+\- ]+', parts[1])
def link_to_canonical(string):
    # strip long brackets
    string = re.sub('\([^)]{5,}\).*$', '', string).strip()
    clean_tail = lambda s: re.sub(r'(,|and|to|or)$', r'', s, flags=re.I).strip()

    swap = re.compile('of (schedule|section|part|subpart)(.*)', flags=re.I)
    swap_match = swap.search(string)
    if swap_match:
        string = swap_match.group(1)+swap_match.group(2)+ ' '+string
    # dont care about anythin after ' of '
    of_pattern = re.compile('[A-Z0-9 ](of) ')
    of_matches = of_pattern.search(string)
    if of_matches:
        string = string[:of_matches.span(1)[0]]
    while string != clean_tail(string):
        string = clean_tail(string)

    string = re.split(r'row [\d+]?', string, flags=re.I)[0]
    string = re.sub(r'sections?', r's', string, flags=re.I)

    if re.compile('(schedule|sch) .*, (part|subpart|table).*', flags=re.I).match(string):
        string = re.sub(', ?', ' ', string)



    start = re.compile('^(schedule|section|sch|clause|rule|part|subpart|ss|s|r|cl)s? ', flags=re.I)
    if not start.match(string):
        string = 's '+string
    else:
        string = re.sub(r'^ss?', r's', string, flags=re.I)
        string = re.sub(r'subparts?', r'subpart', string, flags=re.I)
        string = re.sub(r'parts?', r'part', string, flags=re.I)
        string = re.sub(r'sections?', r's', string, flags=re.I)
        string = re.sub(r'schedules?', r'sch', string, flags=re.I)
        string = re.sub(r'clauses?', r'cl', string, flags=re.I)
        string = re.sub(r'rules?', r'r', string, flags=re.I)

    string = re.sub(r',? and ', r'+', string, flags=re.I)
    string = re.sub(r' to ', r'-', string, flags=re.I)
    string = re.sub(r',? or ', r'+', string, flags=re.I)
    string = re.sub(r', ?', r'+', string, flags=re.I)
    return string.strip()

class TestLinkParsing(unittest.TestCase):

    def test_transform(self):
        with open('tests/link_examples.txt') as links, open('tests/links_manually_fixed.txt') as expected:
            expected_lines = expected.readlines()
            for i, line in enumerate(links.readlines()):
                print i
                self.assertEqual(
                    link_to_canonical(unicode(line.strip(), 'utf-8').replace(u"\u00A0", u' ')),
                    unicode(expected_lines[i].strip(), 'utf-8').replace(u"\u00A0", u' '))

if __name__ == '__main__':
    # Warn against potentially dropping the live database
    sys.path.append(os.getcwd())
    config = importlib.import_module(sys.argv[1].replace('.py', ''), 'parent')

    # Make server routes available in testing mode

    # Run the tests
    unittest.main(argv=[sys.argv[0]])
