from lxml import etree
import sys
from subprocess import Popen, PIPE
from tempfile import mkdtemp
import os
import shutil

def insert_content(tree, result):
    result.extend(map(lambda x: etree.fromstring(etree.tostring(x, method="html",encoding='UTF-8')), tree.xpath('.//*[@id="page-container"]')))


def insert_style(tree, result, path):
    style = etree.Element("style")
    style.text = ''
    for f in tree.xpath('.//*[@rel="stylesheet"]'):
        if f.attrib['href'] != 'fancy.min.css':
            with open(os.path.join(path, f.attrib['href'])) as css:
                style.text += css.read()
    result.append(style)


def process_file(filename):
    tmp = mkdtemp()
    outname = 'out.html'
    cmd = """ pdf2htmlEX %s --embed-javascript 0 --embed-css 0 --printing 0  --process-outline 0 --embed-image 1   --embed-font 0 --embed-external-font 1 --fit-width 992 --stretch-narrow-glyph 1 --fallback 0 --dest-dir  %s %s"""
    print cmd % (filename, tmp, outname)
    p = Popen(cmd % (filename, tmp, outname), shell=True, stdout=PIPE, stderr=PIPE)
    out, err = p.communicate()
    if out.rstrip():
        print filename, err
    tree = etree.parse(os.path.join(tmp, outname))
    result = etree.Element("div")
    result.append(etree.fromstring('<meta charset="utf-8" />'))
    insert_content(tree, result)
    insert_style(tree,result, tmp)
    shutil.rmtree(tmp)
    return etree.tostring(result, method="html",encoding='UTF-8')

if __name__ == "__main__":
    files = [f for f in os.listdir(sys.argv[1]) if f.endswith('.pdf')]
    #files = ['0023b100-3624-415b-9b66-e1e40616a6fd.pdf']
   #files = ['494e2f13-e708-4dd0-92a9-8ce90fe2806b.pdf']
    for i, f in enumerate(files):
        try:
            if i % 100 == 0:
                print '%d/%d' % (i,len(files))
            result = process_file(os.path.join(sys.argv[1], f))
            with open(os.path.join(sys.argv[2], f.replace('.pdf', '.html')), "w") as out:
                out.write(result)
        except Exception, e:
            print 'error:', e, f

