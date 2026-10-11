from pathlib import Path
import re
import subprocess
from html import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Preformatted, PageBreak, KeepTogether, CondPageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
QA = ROOT.parent.parent / 'tmp' / 'guide-qa'
QA.mkdir(parents=True, exist_ok=True)
OUTPUT = ROOT / 'Guide_ChronoSquad_Express_EJS.pdf'
TEXT = (ROOT / 'guide.md').read_text(encoding='utf-8')
NODE = r'C:\Users\marse\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
for i, block in enumerate(re.findall(r'```js\n(.*?)```', TEXT, re.S)):
    if block.startswith('async create('):
        block = 'class Example {\n' + block + '\n}'
    target = QA / f'example-{i}.mjs'
    target.write_text(block, encoding='utf-8')
    result = subprocess.run([NODE, '--check', str(target)], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f'Example {i}: {result.stderr}')
print('18 JavaScript examples passed syntax checking.')

pdfmetrics.registerFont(TTFont('ArialGuide', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialGuideBold', r'C:\Windows\Fonts\arialbd.ttf'))
pdfmetrics.registerFont(TTFont('ConsolasGuide', r'C:\Windows\Fonts\consola.ttf'))
pdfmetrics.registerFontFamily('ArialGuide',normal='ArialGuide',bold='ArialGuideBold',italic='ArialGuide',boldItalic='ArialGuideBold')
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyGuide', fontName='ArialGuide', fontSize=10.1, leading=14.6, spaceAfter=8, allowWidows=0, allowOrphans=0, textColor=colors.HexColor('#233145')))
styles.add(ParagraphStyle(name='TitleGuide', fontName='ArialGuideBold', fontSize=26, leading=31, spaceAfter=18, textColor=colors.HexColor('#172B45')))
styles.add(ParagraphStyle(name='H1Guide', fontName='ArialGuideBold', fontSize=18, leading=23, spaceBefore=4, spaceAfter=15, keepWithNext=True, textColor=colors.HexColor('#183E65')))
styles.add(ParagraphStyle(name='H2Guide', fontName='ArialGuideBold', fontSize=12, leading=16, spaceBefore=12, spaceAfter=7, keepWithNext=True, textColor=colors.HexColor('#183E65')))
styles.add(ParagraphStyle(name='CodeGuide', fontName='ConsolasGuide', fontSize=8.1, leading=10.6, spaceBefore=5, spaceAfter=11, leftIndent=9, rightIndent=9, backColor=colors.HexColor('#F1F4F7'), borderPadding=8))
styles.add(ParagraphStyle(name='BulletGuide', parent=styles['BodyGuide'], leftIndent=12, firstLineIndent=-9, spaceAfter=6))
styles.add(ParagraphStyle(name='TOCGuide', parent=styles['BodyGuide'], fontSize=10.3, leading=16, spaceAfter=7))

def inline(s):
    text = escape(s)
    text = re.sub(r'(https://[^\s]+)', lambda m: '<link href="'+m.group(1)+'" color="#155E8C">'+m.group(1)+'</link>', text)
    return text

story=[]
title=TEXT.splitlines()[0][2:]
story.append(Paragraph(title, styles['TitleGuide']))
story.append(Paragraph('Guide de migration de la branche sprint0', styles['H2Guide']))
story.append(Paragraph('ChronoSquad · 10 octobre 2026 · Référence a6f10b2', styles['BodyGuide']))
story.append(Spacer(1,15))
story.append(Paragraph('Comprendre le rôle de chaque composant, conserver votre interface et construire progressivement un serveur qui fournit les pages et les données.',styles['BodyGuide']))
story.append(Spacer(1,12))
story.append(Paragraph('Parcours de lecture',styles['H2Guide']))
headings=re.findall(r'^## (.+)$',TEXT,re.M)
for idx, h in enumerate(headings):
    story.append(Paragraph(f'<link href="#section{idx}" color="#183E65">{escape(h)}</link>',styles['TOCGuide']))
story.append(PageBreak())

lines=TEXT.splitlines()
i=0
section=-1
while i<len(lines):
    line=lines[i]
    if line.startswith('# ') or line.startswith('Guide de migration de la branche sprint0'):
        i+=1;continue
    if not line.strip():
        i+=1;continue
    if line.startswith('## '):
        section+=1
        if section>0:
            story.append(Spacer(1, 14))
            story.append(CondPageBreak(150))
        story.append(Paragraph(f'<a name="section{section}"/>'+escape(line[3:]),styles['H1Guide']))
        i+=1;continue
    if line.startswith('### '):
        story.append(Paragraph(escape(line[4:]),styles['H2Guide']))
        i+=1;continue
    if line.startswith('```'):
        i+=1;block=[]
        while i<len(lines) and not lines[i].startswith('```'):
            block.append(lines[i]);i+=1
        i+=1
        longest=max((pdfmetrics.stringWidth(l,'ConsolasGuide',8.1) for l in block),default=0)
        if longest>465: raise ValueError(f'Code line too wide: {longest}: {max(block,key=len)}')
        for start in range(0,len(block),22):
            chunk=Preformatted('\n'.join(block[start:start+22]),styles['CodeGuide'])
            if len(block)<=12:
                story.append(KeepTogether([chunk]))
            else:
                story.append(chunk)
        continue
    if line.startswith('- '):
        story.append(Paragraph('• '+inline(line[2:]),styles['BulletGuide']))
    else:
        story.append(Paragraph(inline(line),styles['BodyGuide']))
    i+=1

def footer(c,doc):
    c.setFont('ArialGuide',8)
    c.setFillColor(colors.HexColor('#607184'))
    c.drawString(48,25,'ChronoSquad · Express et EJS · sprint0')
    c.drawRightString(A4[0]-48,25,str(doc.page))
doc=SimpleDocTemplate(str(OUTPUT),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=43,bottomMargin=45,title=title,author='Guide technique ChronoSquad')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
r=PdfReader(OUTPUT)
print(f'PDF: {len(r.pages)} pages, {OUTPUT.stat().st_size} bytes')
for n,p in enumerate(r.pages):
    text=p.extract_text()
    if len(text)<180: print('CHECK sparse page',n+1,len(text))
