#!/usr/bin/env python3
"""
Gera icones PNG para todas as densidades Android.
Usa apenas stdlib Python (zlib + struct).
"""

import struct, zlib, math, os

def create_png(width, height, pixels):
    def chunk(t, data):
        c = t + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    raw = b''
    for y in range(height):
        raw += b'\x00'
        for x in range(width):
            raw += struct.pack('BBBB', *pixels[y][x])
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')

def draw_icon(s):
    BLUE = (37, 99, 235, 255)
    W = (255, 255, 255, 255)
    W8 = (255, 255, 255, 217)
    W7 = (255, 255, 255, 178)

    px = [[BLUE for _ in range(s)] for _ in range(s)]
    
    # Funcoes de desenho
    def line(c, x1, y1, x2, y2, t):
        t2 = t/2
        for y in range(s):
            for x in range(s):
                dx, dy = x2-x1, y2-y1
                ls = dx*dx + dy*dy
                if ls == 0:
                    d = math.hypot(x-x1, y-y1)
                else:
                    tt = max(0, min(1, ((x-x1)*dx + (y-y1)*dy)/ls))
                    d = math.hypot(x-(x1+tt*dx), y-(y1+tt*dy))
                if d <= t2:
                    px[y][x] = c

    def circle(c, cx, cy, r):
        r2 = r*r
        for y in range(max(0,cy-r), min(s,cy+r+1)):
            for x in range(max(0,cx-r), min(s,cx+r+1)):
                if (x-cx)**2 + (y-cy)**2 <= r2:
                    px[y][x] = c

    def fill_circle_area(cx, cy, r, cond_color, cond_fn):
        for y in range(max(0,cy-r), min(s,cy+r+1)):
            for x in range(max(0,cx-r), min(s,cx+r+1)):
                if (x-cx)**2 + (y-cy)**2 <= r*r and cond_fn(x-cx, y-cy):
                    px[y][x] = cond_color

    sc = lambda v: int(v * s / 512)
    lw = max(sc(45), 2)
    cr = max(sc(90), 2)
    cxc, cyc = sc(382), sc(382)

    # 3 linhas horizontais
    line(W, sc(110), sc(160), sc(402), sc(160), lw)
    line(W8, sc(110), sc(266), sc(402), sc(266), lw)
    line(W7, sc(110), sc(372), sc(260), sc(372), lw)

    # Circulo branco
    circle(W, cxc, cyc, cr)

    # Seta: diagonal + gancho
    # A seta original SVG: path M-25 25 L35 -35 (diagonal)
    # + M-15 -35 H35 V15 (L-shape)
    ah = int(cr * 0.7)
    # Diagonal: do canto inferior esquerdo do quadrado imaginario
    # para o canto superior direito
    diag_len = int(ah * 1.0)
    diag_w = max(sc(25), 2)
    
    # Diagonal SW->NE
    x1, y1 = cxc - ah//2, cyc + ah//2
    x2, y2 = cxc + ah//2, cyc - ah//2
    line(BLUE, x1, y1, x2, y2, diag_w)
    
    # Gancho horizontal na ponta NE
    hook_y = y2
    hook_x1 = x2
    hook_x2 = x2 + ah//3
    line(BLUE, hook_x1, hook_y, hook_x2, hook_y, diag_w)
    
    # Pequena linha vertical no gancho
    line(BLUE, hook_x2, hook_y, hook_x2, hook_y - ah//4, diag_w)

    return px

def main(res_dir):
    sizes = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for d, s in sizes.items():
        p = draw_icon(s)
        png = create_png(s, s, p)
        dp = os.path.join(res_dir, f'mipmap-{d}')
        os.makedirs(dp, exist_ok=True)
        with open(os.path.join(dp, 'ic_launcher.png'), 'wb') as f:
            f.write(png)
        with open(os.path.join(dp, 'ic_launcher_round.png'), 'wb') as f:
            f.write(png)
        print(f'  {d} ({s}x{s}): {len(png)} bytes')

if __name__ == '__main__':
    r = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'android', 'app', 'src', 'main', 'res')
    print(f'Generating icons in: {r}')
    main(r)
    print('Done!')
