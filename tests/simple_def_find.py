from __future__ import print_function
import re

class DefWrap(object):
    def __init__(self, string):
        self.string = string
    def __eq__(self, other):
        return self.string == other.string
    def __repr__(self):
        return '<DefWrap>%s</DefWrap>' % self.string

inputstring = "testing is a fun thing is a fun thing fun to do, oh boy you better believe it's a fun thing fun fun"

defs = ['fun', 'fun thing', 'boy', 'oh boy you better', 'it']

expected = ['testing is a ', DefWrap('fun thing'), ' is a ', DefWrap('fun thing'),' ', DefWrap('fun'), ' to do, ', DefWrap('oh boy you better'), " believe ",  DefWrap('it'), "'s a ", DefWrap('fun thing'), ' ', DefWrap('fun'), ' ', DefWrap('fun')]


ordered_defs = sorted(defs, key=lambda x: len(x), reverse=True)
lines = [inputstring]
for definition in ordered_defs:
    i = 0
    while i < len(lines):
        line = lines[i]
        while isinstance(line, basestring) and definition.lower() in line.lower():
            hit = line.lower().index(definition.lower())
            lines[i:i+1] = [line[:hit], DefWrap(definition), line[hit + len(definition):]]
            i += 2
            line = line[hit + len(definition):]
        i += 1
lines = filter(lambda x:x, lines)
print('Success: ', lines==expected)
print(lines)
print(expected)