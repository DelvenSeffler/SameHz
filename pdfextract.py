import re, sys, zlib

path = sys.argv[1]
outpath = sys.argv[2]
data = open(path, 'rb').read()
s = data.decode('latin-1')

objs = {}
for m in re.finditer(r'(\d+)\s+0\s+obj(.*?)endobj', s, re.S):
    objs[int(m.group(1))] = m.group(2)

def stream_bytes(body):
    m = re.search(r'stream\r?\n', body)
    if not m:
        return None
    raw = body[m.end():body.rfind('endstream')].encode('latin-1')
    if '/FlateDecode' in body[:m.start()]:
        try:
            return zlib.decompress(raw)
        except Exception:
            return None
    return raw

def get_obj(num):
    return objs.get(num, '')

def parse_tounicode(txt):
    mp = {}
    for m in re.finditer(r'beginbfchar(.*?)endbfchar', txt, re.S):
        for a, b in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', m.group(1)):
            try:
                mp[int(a, 16)] = bytes.fromhex(b).decode('utf-16-be', 'replace')
            except Exception:
                pass
    for m in re.finditer(r'beginbfrange(.*?)endbfrange', txt, re.S):
        for a, b, c in re.findall(r'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', m.group(1)):
            lo, hi, dst = int(a, 16), int(b, 16), int(c, 16)
            for i in range(lo, min(hi, lo + 512) + 1):
                mp[i] = chr(dst + (i - lo))
    return mp

def font_info(num):
    body = get_obj(num)
    info = {'identity': ('/Identity-H' in body) or ('/Type0' in body), 'map': {}}
    m = re.search(r'/ToUnicode\s+(\d+)\s+0\s+R', body)
    if m:
        st = stream_bytes(get_obj(int(m.group(1))))
        if st:
            info['map'] = parse_tounicode(st.decode('latin-1'))
    return info

def decode_string(raw, finfo):
    if finfo and finfo['identity']:
        out = []
        for i in range(0, len(raw) - 1, 2):
            out.append(finfo['map'].get(raw[i] * 256 + raw[i + 1], ''))
        return ''.join(out)
    try:
        return raw.decode('cp1252')
    except Exception:
        return raw.decode('latin-1')

def unescape_lit(b):
    out = bytearray(); i = 0
    while i < len(b):
        c = b[i]
        if c == 92 and i + 1 < len(b):
            n = b[i + 1]
            mp = {110: 10, 114: 13, 116: 9, 98: 8, 102: 12, 40: 40, 41: 41, 92: 92}
            if n in mp:
                out.append(mp[n]); i += 2; continue
            if 48 <= n <= 55:
                d = chr(n); i += 2
                while i < len(b) and 48 <= b[i] <= 55 and len(d) < 3:
                    d += chr(b[i]); i += 1
                out.append(int(d, 8) & 0xFF); continue
            i += 2; continue
        out.append(c); i += 1
    return bytes(out)

def page_text(cs):
    txt = cs.decode('latin-1')
    pat = re.compile(r"""
        (?P<fe>\[[^\]]*\]\s*TJ)
      | (?P<lit>\((?:\\.|[^\\()])*\))\s*(?P<op>Tj|TJ|'|")
      | (?P<hex><[0-9A-Fa-f\s]*>)\s*(?P<op2>Tj|TJ)
      | (?P<num>-?[\d.]+)\s+(?P<num2>-?[\d.]+)\s+(?P<opTd>Td|TD)
      | (?P<opTstar>T\*)
      | (?P<opTm>-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+(?P<tx>-?[\d.]+)\s+(?P<ty>-?[\d.]+)\s+Tm)
      | /(?P<fname>[A-Za-z0-9]+)\s+[\d.]+\s+Tf
    """, re.X | re.S)
    items = []
    x = y = 0.0
    font = None
    for m in pat.finditer(txt):
        if m.group('fname'):
            font = fonts.get(m.group('fname'))
            continue
        if m.group('opTd'):
            dx, dy = float(m.group('num')), float(m.group('num2'))
            x += dx; y += dy
            continue
        if m.group('opTstar'):
            y -= 12
            continue
        if m.group('opTm'):
            x = float(m.group('tx')); y = float(m.group('ty'))
            continue
        seg = None
        if m.group('fe'):
            parts = re.findall(r'(\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>)', m.group('fe'))
            chunks = []
            for p in parts:
                if p.startswith('('):
                    chunks.append(decode_string(unescape_lit(p[1:-1].encode('latin-1')), font))
                else:
                    hx = re.sub(r'\s+', '', p[1:-1])
                    if len(hx) % 2: hx += '0'
                    chunks.append(decode_string(bytes.fromhex(hx), font))
            seg = ''.join(chunks)
        elif m.group('lit'):
            seg = decode_string(unescape_lit(m.group('lit')[1:-1].encode('latin-1')), font)
        elif m.group('hex'):
            hx = re.sub(r'\s+', '', m.group('hex')[1:-1])
            if len(hx) % 2: hx += '0'
            seg = decode_string(bytes.fromhex(hx), font)
        if seg:
            items.append((y, x, seg))
    # group by line
    lines = {}
    for yy, xx, seg in items:
        key = round(yy / 3.0)
        lines.setdefault(key, []).append((xx, seg))
    out = []
    for key in sorted(lines, reverse=True):
        parts = sorted(lines[key])
        out.append(''.join(p[1] for p in parts))
    return '\n'.join(out)

pages = [n for n, b in objs.items() if '/Type/Page' in b and '/Type/Pages' not in b]
pages.sort()
buf = []
for idx, pnum in enumerate(pages, 1):
    body = get_obj(pnum)
    fonts = {}
    fm = re.search(r'/Font\s*<<(.*?)>>', body, re.S)
    if fm:
        for name, ref in re.findall(r'/([A-Za-z0-9]+)\s+(\d+)\s+0\s+R', fm.group(1)):
            fonts[name] = font_info(int(ref))
    conts = []
    cm = re.search(r'/Contents\s+(\d+)\s+0\s+R', body)
    if cm:
        conts = [int(cm.group(1))]
    else:
        cm = re.search(r'/Contents\s*\[(.*?)\]', body, re.S)
        if cm:
            conts = [int(v) for v in re.findall(r'(\d+)\s+0\s+R', cm.group(1))]
    text = ''
    for c in conts:
        st = stream_bytes(get_obj(c))
        if st:
            text += page_text(st) + '\n'
    buf.append(f'\n===== PAGE {idx} =====\n{text}')

open(outpath, 'w', encoding='utf-8').write('\n'.join(buf))
print('wrote', outpath)
