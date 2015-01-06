from __future__ import print_function
import re

class DefWrap(object):
    def __init__(self, string):
        self.string = string
    def __eq__(self, other):
        return self.string == other.string
    def __repr__(self):
        return '<DefWrap>%s</DefWrap>' % self.string

inputstring = "testing is a fun thing to do, oh boy you better believe it's a fun thing"

defs = ['fun', 'fun thing', 'boy', 'oh boy you better']

expected = ['testing is a ', DefWrap('fun thing'), ' to do, ', DefWrap('oh boy you better'), " believe it's a ", DefWrap('fun thing')]


ordered_defs = sorted(defs, key=lambda x: len(x), reverse=True)
lines = [inputstring]
for definition in ordered_defs:
    i = 0
    while i < len(lines):
        line = lines[i]
        while isinstance(line, basestring) and definition.lower() in line.lower():
            hit = line.lower().index(definition.lower())
            lines[i:i+1] = [line[:hit], DefWrap(definition), line[hit + len(definition):]]
            line = line[hit + len(definition):]
        i += 1

print('results')
print(lines)
print(expected)