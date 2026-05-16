from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String, Line
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus.flowables import Flowable
from reportlab.lib.colors import HexColor
import io, base64
from datetime import date, timedelta

# ── Brand colors ──
BRAND_DARK   = HexColor('#111827')
BRAND_NAVY   = HexColor('#21376c')
BRAND_BLUE   = HexColor('#2563eb')
BRAND_BLUE_LT= HexColor('#eff6ff')
GRAY_100     = HexColor('#f8fafc')
GRAY_200     = HexColor('#e2e8f0')
GRAY_400     = HexColor('#94a3b8')
GRAY_600     = HexColor('#475569')
GRAY_900     = HexColor('#0f172a')
GREEN        = HexColor('#16a34a')
GREEN_LT     = HexColor('#f0fdf4')
ORANGE       = HexColor('#ea580c')
WHITE        = colors.white

W, H = A4  # 595.27 x 841.89 pts

# ── Gixen SVG logo as inline drawing ──
# We'll render it as styled text since SVG isn't directly embeddable in reportlab
# Instead we use the path as a custom flowable

class LogoFlowable(Flowable):
    """Renders Gixen logo using reportlab shapes approximating the wordmark"""
    def __init__(self, width=120, height=35, color=BRAND_NAVY):
        super().__init__()
        self.logo_width = width
        self.logo_height = height
        self.color = color
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        c.saveState()
        # Draw "Gixen" as styled text since we can't embed SVG paths directly
        c.setFillColor(self.color)
        c.setFont('Helvetica-Bold', self.logo_height * 0.7)
        c.drawString(0, self.logo_height * 0.15, 'Gixen')
        # Draw a small gear-like circle as symbol
        cx = self.logo_width * 0.88
        cy = self.logo_height * 0.55
        r = self.logo_height * 0.28
        c.setStrokeColor(self.color)
        c.setLineWidth(1.5)
        c.circle(cx, cy, r, stroke=1, fill=0)
        c.setLineWidth(0.8)
        # Small inner circle
        c.circle(cx, cy, r*0.4, stroke=1, fill=0)
        c.restoreState()

def generate_oferta(data: dict) -> bytes:
    """
    data = {
        'client': { 'name', 'cui', 'regCom', 'adresa', 'email', 'telefon' },
        'produse': [ { 'cod', 'name', 'unitate', 'pretBaza', 'pretFinal', 'discountProcent', 'cantitate', 'specs' } ],
        'nr_oferta': 'OF-2025-001',
        'valabila_zile': 15,
        'moneda': 'RON',
        'observatii': '...',
        'discount_global': 0,
    }
    """
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18*mm,
        rightMargin=18*mm,
        topMargin=16*mm,
        bottomMargin=20*mm,
        title=f"Ofertă {data.get('nr_oferta', '')} — Gixen SRL",
        author='Gixen SRL',
        subject='Ofertă comercială',
    )

    story = []

    # ── HEADER ── dark band top
    def header_footer(canvas, doc):
        canvas.saveState()
        # Top header bar
        canvas.setFillColor(BRAND_DARK)
        canvas.rect(0, H - 22*mm, W, 22*mm, fill=1, stroke=0)

        # Gixen name in header
        canvas.setFillColor(WHITE)
        canvas.setFont('Helvetica-Bold', 18)
        canvas.drawString(18*mm, H - 14*mm, 'Gixen')
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(HexColor('#94a3b8'))
        canvas.drawString(18*mm, H - 18.5*mm, 'OFERTĂ COMERCIALĂ')

        # Nr oferta + data in header right
        canvas.setFillColor(WHITE)
        canvas.setFont('Helvetica-Bold', 10)
        nr = data.get('nr_oferta', '')
        canvas.drawRightString(W - 18*mm, H - 13*mm, nr)
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(HexColor('#94a3b8'))
        today = date.today().strftime('%d.%m.%Y')
        canvas.drawRightString(W - 18*mm, H - 18*mm, f'Data: {today}')

        # Accent line below header
        canvas.setStrokeColor(BRAND_BLUE)
        canvas.setLineWidth(3)
        canvas.line(0, H - 22*mm, W, H - 22*mm)

        # Bottom footer
        canvas.setFillColor(GRAY_200)
        canvas.rect(0, 0, W, 12*mm, fill=1, stroke=0)
        canvas.setFillColor(GRAY_600)
        canvas.setFont('Helvetica', 7.5)
        canvas.drawString(18*mm, 4.5*mm, 'Gixen SRL · CUI RO46291658 · Str. Exemplu nr. 1, București · contact@gixen.ro · www.gixen.ro')
        canvas.drawRightString(W - 18*mm, 4.5*mm, f'Oferta este valabilă {data.get("valabila_zile", 15)} zile de la data emiterii.')

        # Page number
        canvas.setFillColor(GRAY_400)
        canvas.setFont('Helvetica', 7)
        canvas.drawCentredString(W/2, 4.5*mm, f'Pagina {doc.page}')

        canvas.restoreState()

    # ── PARTIES ROW ── Gixen left | Logo center | Client right
    today = date.today()
    valabil_pana = today + timedelta(days=data.get('valabila_zile', 15))

    def make_party_table():
        gixen_lines = [
            Paragraph('<b>FURNIZOR</b>', ParagraphStyle('lbl', fontName='Helvetica-Bold', fontSize=7,
                textColor=GRAY_400, spaceAfter=4, leading=9)),
            Paragraph('<b>Gixen SRL</b>', ParagraphStyle('nm', fontName='Helvetica-Bold', fontSize=12,
                textColor=BRAND_NAVY, spaceAfter=3, leading=14)),
            Paragraph('CUI: RO46291658', ParagraphStyle('d', fontName='Helvetica', fontSize=8, textColor=GRAY_600, leading=11)),
            Paragraph('Str. Exemplu nr. 1, București', ParagraphStyle('d', fontName='Helvetica', fontSize=8, textColor=GRAY_600, leading=11)),
            Paragraph('contact@gixen.ro', ParagraphStyle('d', fontName='Helvetica', fontSize=8, textColor=BRAND_BLUE, leading=11)),
            Paragraph('Tel: +40 700 000 000', ParagraphStyle('d', fontName='Helvetica', fontSize=8, textColor=GRAY_600, leading=11)),
        ]

        client = data.get('client', {})
        client_lines = [
            Paragraph('<b>CUMPĂRĂTOR</b>', ParagraphStyle('lbl2', fontName='Helvetica-Bold', fontSize=7,
                textColor=GRAY_400, spaceAfter=4, leading=9, alignment=TA_RIGHT)),
            Paragraph(f'<b>{client.get("name", "—")}</b>', ParagraphStyle('nm2', fontName='Helvetica-Bold', fontSize=12,
                textColor=BRAND_NAVY, spaceAfter=3, leading=14, alignment=TA_RIGHT)),
            Paragraph(f'CUI: {client.get("cui", "—")}', ParagraphStyle('d2', fontName='Helvetica', fontSize=8, textColor=GRAY_600, leading=11, alignment=TA_RIGHT)),
            Paragraph(f'{client.get("adresa", "—")}', ParagraphStyle('d2', fontName='Helvetica', fontSize=8, textColor=GRAY_600, leading=11, alignment=TA_RIGHT)),
            Paragraph(f'{client.get("email", "")}', ParagraphStyle('d2', fontName='Helvetica', fontSize=8, textColor=BRAND_BLUE, leading=11, alignment=TA_RIGHT)),
            Paragraph(f'Tel: {client.get("telefon", "—")}', ParagraphStyle('d2', fontName='Helvetica', fontSize=8, textColor=GRAY_600, leading=11, alignment=TA_RIGHT)),
        ]

        # Center logo block
        center_block = [
            Spacer(1, 6),
            Paragraph('<b>Gixen</b>', ParagraphStyle('logo_center', fontName='Helvetica-Bold', fontSize=26,
                textColor=BRAND_NAVY, alignment=TA_CENTER, leading=30)),
            Paragraph('OFERTĂ COMERCIALĂ', ParagraphStyle('tag', fontName='Helvetica', fontSize=7,
                textColor=GRAY_400, alignment=TA_CENTER, leading=10, spaceAfter=6)),
            HRFlowable(width='80%', thickness=1.5, color=BRAND_BLUE, hAlign='CENTER'),
            Spacer(1, 4),
            Paragraph(f'Nr. <b>{data.get("nr_oferta", "")}</b>', ParagraphStyle('nr', fontName='Helvetica', fontSize=8,
                textColor=GRAY_600, alignment=TA_CENTER, leading=11)),
            Paragraph(f'Data: <b>{today.strftime("%d.%m.%Y")}</b>', ParagraphStyle('dt', fontName='Helvetica', fontSize=8,
                textColor=GRAY_600, alignment=TA_CENTER, leading=11)),
            Paragraph(f'Valabilă până la: <b>{valabil_pana.strftime("%d.%m.%Y")}</b>', ParagraphStyle('vl', fontName='Helvetica-Bold', fontSize=8,
                textColor=ORANGE, alignment=TA_CENTER, leading=11)),
        ]

        tbl = Table(
            [[gixen_lines, center_block, client_lines]],
            colWidths=[62*mm, 55*mm, 62*mm],
            rowHeights=None
        )
        tbl.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (1,0), (1,0), BRAND_BLUE_LT),
            ('ROUNDEDCORNERS', [6]),
            ('BOX', (1,0), (1,0), 0.5, BRAND_BLUE),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (0,0), 0),
            ('RIGHTPADDING', (-1,0), (-1,0), 0),
            ('LEFTPADDING', (1,0), (1,0), 8),
            ('RIGHTPADDING', (1,0), (1,0), 8),
        ]))
        return tbl

    story.append(Spacer(1, 26*mm))  # below header
    story.append(make_party_table())
    story.append(Spacer(1, 7*mm))

    # ── DIVIDER ──
    story.append(HRFlowable(width='100%', thickness=1, color=GRAY_200))
    story.append(Spacer(1, 5*mm))

    # ── INTRO TEXT ──
    story.append(Paragraph(
        f'Stimați parteneri, vă transmitem oferta noastră comercială pentru produsele de mai jos, '
        f'valabilă <b>{data.get("valabila_zile", 15)} zile</b> de la data emiterii. '
        f'Prețurile sunt exprimate în <b>{data.get("moneda", "RON")} fără TVA</b>.',
        ParagraphStyle('intro', fontName='Helvetica', fontSize=9, textColor=GRAY_600,
            leading=14, spaceAfter=6*mm)
    ))

    # ── PRODUCTS TABLE ──
    # Header
    def make_products_table(produse):
        col_styles = ParagraphStyle('cell', fontName='Helvetica', fontSize=8.5, textColor=GRAY_900, leading=12)
        col_styles_sm = ParagraphStyle('cellsm', fontName='Helvetica', fontSize=7.5, textColor=GRAY_600, leading=10)
        col_right = ParagraphStyle('right', fontName='Helvetica', fontSize=8.5, textColor=GRAY_900, leading=12, alignment=TA_RIGHT)
        col_right_bold = ParagraphStyle('rightb', fontName='Helvetica-Bold', fontSize=8.5, textColor=BRAND_NAVY, leading=12, alignment=TA_RIGHT)
        col_center = ParagraphStyle('center', fontName='Helvetica', fontSize=8.5, textColor=GRAY_900, leading=12, alignment=TA_CENTER)
        disc_style = ParagraphStyle('disc', fontName='Helvetica-Bold', fontSize=8, textColor=GREEN, leading=11, alignment=TA_CENTER)

        headers = [
            Paragraph('#', ParagraphStyle('h', fontName='Helvetica-Bold', fontSize=8, textColor=WHITE, alignment=TA_CENTER)),
            Paragraph('Produs', ParagraphStyle('h', fontName='Helvetica-Bold', fontSize=8, textColor=WHITE)),
            Paragraph('Cant.', ParagraphStyle('h', fontName='Helvetica-Bold', fontSize=8, textColor=WHITE, alignment=TA_CENTER)),
            Paragraph('Preț bază\n(fără TVA)', ParagraphStyle('h', fontName='Helvetica-Bold', fontSize=8, textColor=WHITE, alignment=TA_RIGHT, leading=10)),
            Paragraph('Discount', ParagraphStyle('h', fontName='Helvetica-Bold', fontSize=8, textColor=WHITE, alignment=TA_CENTER)),
            Paragraph('Preț net\n(fără TVA)', ParagraphStyle('h', fontName='Helvetica-Bold', fontSize=8, textColor=WHITE, alignment=TA_RIGHT, leading=10)),
            Paragraph('Total linie\n(fără TVA)', ParagraphStyle('h', fontName='Helvetica-Bold', fontSize=8, textColor=WHITE, alignment=TA_RIGHT, leading=10)),
        ]

        rows = [headers]
        subtotal = 0
        total_discount_val = 0

        for i, p in enumerate(produse):
            cant = p.get('cantitate', 1)
            pret_baza = p.get('pretBaza', 0)
            pret_final = p.get('pretFinal', pret_baza)
            disc_pct = p.get('discountProcent', 0)
            total_linie = pret_final * cant
            subtotal += pret_baza * cant
            total_discount_val += (pret_baza - pret_final) * cant

            name_cell = [
                Paragraph(f'<b>{p.get("name", "")}</b>', col_styles),
            ]
            specs = p.get('specs', '')
            if specs:
                name_cell.append(Paragraph(specs, col_styles_sm))
            cod = p.get('cod', '')
            if cod:
                name_cell.append(Paragraph(f'Cod: {cod}', col_styles_sm))

            disc_cell = Paragraph(
                f'-{disc_pct}%' if disc_pct > 0 else '—',
                disc_style if disc_pct > 0 else ParagraphStyle('dash', fontName='Helvetica', fontSize=8, textColor=GRAY_400, alignment=TA_CENTER)
            )

            row = [
                Paragraph(str(i+1), col_center),
                name_cell,
                Paragraph(f'{cant}\n{p.get("unitate", "buc")}', ParagraphStyle('cnt', fontName='Helvetica', fontSize=8, textColor=GRAY_600, alignment=TA_CENTER, leading=10)),
                Paragraph(f'{pret_baza:.2f}\n{data.get("moneda","RON")}', ParagraphStyle('pb', fontName='Helvetica', fontSize=8.5, textColor=GRAY_600, alignment=TA_RIGHT, leading=10)),
                disc_cell,
                Paragraph(f'<b>{pret_final:.2f}</b>\n{data.get("moneda","RON")}', ParagraphStyle('pf', fontName='Helvetica-Bold', fontSize=9, textColor=BRAND_BLUE, alignment=TA_RIGHT, leading=11)),
                Paragraph(f'<b>{total_linie:.2f}</b>\n{data.get("moneda","RON")}', col_right_bold),
            ]
            rows.append(row)

        # Totals rows
        total_net = subtotal - total_discount_val
        tva = total_net * 0.19
        total_cu_tva = total_net + tva

        rows.append([
            '', '', '', '', '',
            Paragraph('Subtotal brut:', ParagraphStyle('tot', fontName='Helvetica', fontSize=8, textColor=GRAY_600, alignment=TA_RIGHT)),
            Paragraph(f'{subtotal:.2f} {data.get("moneda","RON")}', ParagraphStyle('tot_v', fontName='Helvetica', fontSize=8, textColor=GRAY_600, alignment=TA_RIGHT)),
        ])
        if total_discount_val > 0:
            rows.append([
                '', '', '', '', '',
                Paragraph('Total reduceri:', ParagraphStyle('tot', fontName='Helvetica-Bold', fontSize=8, textColor=GREEN, alignment=TA_RIGHT)),
                Paragraph(f'-{total_discount_val:.2f} {data.get("moneda","RON")}', ParagraphStyle('tot_v', fontName='Helvetica-Bold', fontSize=8, textColor=GREEN, alignment=TA_RIGHT)),
            ])
        rows.append([
            '', '', '', '', '',
            Paragraph('<b>Total fără TVA:</b>', ParagraphStyle('tot', fontName='Helvetica-Bold', fontSize=9, textColor=GRAY_900, alignment=TA_RIGHT)),
            Paragraph(f'<b>{total_net:.2f} {data.get("moneda","RON")}</b>', ParagraphStyle('tot_v', fontName='Helvetica-Bold', fontSize=9, textColor=GRAY_900, alignment=TA_RIGHT)),
        ])
        rows.append([
            '', '', '', '', '',
            Paragraph('TVA 19%:', ParagraphStyle('tot', fontName='Helvetica', fontSize=8, textColor=GRAY_600, alignment=TA_RIGHT)),
            Paragraph(f'{tva:.2f} {data.get("moneda","RON")}', ParagraphStyle('tot_v', fontName='Helvetica', fontSize=8, textColor=GRAY_600, alignment=TA_RIGHT)),
        ])
        rows.append([
            '', '', '', '', '',
            Paragraph('<b>TOTAL CU TVA:</b>', ParagraphStyle('tot', fontName='Helvetica-Bold', fontSize=11, textColor=BRAND_NAVY, alignment=TA_RIGHT)),
            Paragraph(f'<b>{total_cu_tva:.2f} {data.get("moneda","RON")}</b>', ParagraphStyle('tot_v', fontName='Helvetica-Bold', fontSize=11, textColor=BRAND_NAVY, alignment=TA_RIGHT)),
        ])

        # Col widths: #, Produs, Cant, PretBaza, Disc, PretNet, Total
        col_w = [9*mm, 67*mm, 16*mm, 22*mm, 18*mm, 24*mm, 23*mm]

        tbl = Table(rows, colWidths=col_w, repeatRows=1)

        n_data = len(produse)
        n_total_rows = 4 + (1 if total_discount_val > 0 else 0)

        style = [
            # Header
            ('BACKGROUND', (0,0), (-1,0), BRAND_DARK),
            ('TEXTCOLOR', (0,0), (-1,0), WHITE),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 8),
            ('ROWBACKGROUND', (0,0), (-1,0), BRAND_DARK),
            ('TOPPADDING', (0,0), (-1,0), 7),
            ('BOTTOMPADDING', (0,0), (-1,0), 7),
            ('LEFTPADDING', (0,0), (-1,0), 5),
            ('RIGHTPADDING', (0,0), (-1,0), 5),
            # Data rows
            ('FONTNAME', (0,1), (-1,n_data), 'Helvetica'),
            ('FONTSIZE', (0,1), (-1,n_data), 8.5),
            ('TOPPADDING', (0,1), (-1,n_data), 7),
            ('BOTTOMPADDING', (0,1), (-1,n_data), 7),
            ('LEFTPADDING', (0,1), (-1,n_data), 5),
            ('RIGHTPADDING', (0,1), (-1,n_data), 5),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('GRID', (0,0), (-1,n_data), 0.5, GRAY_200),
            # Alternating rows
            *[('BACKGROUND', (0,r), (-1,r), GRAY_100) for r in range(2, n_data+1, 2)],
            # Total rows
            ('TOPPADDING', (0,n_data+1), (-1,-1), 5),
            ('BOTTOMPADDING', (0,n_data+1), (-1,-1), 5),
            ('LINEABOVE', (5, n_data+1), (-1, n_data+1), 1, GRAY_200),
            # Last total row (TOTAL CU TVA)
            ('BACKGROUND', (5,-1), (-1,-1), BRAND_NAVY),
            ('TEXTCOLOR', (5,-1), (-1,-1), WHITE),
            ('TOPPADDING', (5,-1), (-1,-1), 8),
            ('BOTTOMPADDING', (5,-1), (-1,-1), 8),
            ('ROUNDEDCORNERS', [4]),
        ]
        tbl.setStyle(TableStyle(style))
        return tbl, total_net, tva, total_cu_tva

    produse = data.get('produse', [])
    prod_tbl, total_net, tva, total_tva = make_products_table(produse)
    story.append(Paragraph('PRODUSE ȘI PREȚURI', ParagraphStyle('sec', fontName='Helvetica-Bold', fontSize=9,
        textColor=GRAY_400, spaceAfter=4*mm, tracking=2)))
    story.append(prod_tbl)
    story.append(Spacer(1, 6*mm))

    # ── VALIDITY + CONDITIONS ──
    cond_data = [
        [
            Paragraph('⏰ Valabilitate', ParagraphStyle('ci', fontName='Helvetica-Bold', fontSize=8.5, textColor=BRAND_NAVY, spaceAfter=3)),
            Paragraph('🚚 Livrare', ParagraphStyle('ci', fontName='Helvetica-Bold', fontSize=8.5, textColor=BRAND_NAVY, spaceAfter=3)),
            Paragraph('💳 Plată', ParagraphStyle('ci', fontName='Helvetica-Bold', fontSize=8.5, textColor=BRAND_NAVY, spaceAfter=3)),
        ],
        [
            Paragraph(f'Oferta este valabilă <b>{data.get("valabila_zile",15)} zile</b> de la data emiterii, până la <b>{valabil_pana.strftime("%d.%m.%Y")}</b>.',
                ParagraphStyle('ct', fontName='Helvetica', fontSize=8, textColor=GRAY_600, leading=12)),
            Paragraph('Livrare la sediul / depozitul indicat de cumpărător. Termenul de livrare se stabilește la confirmarea comenzii.',
                ParagraphStyle('ct', fontName='Helvetica', fontSize=8, textColor=GRAY_600, leading=12)),
            Paragraph('Plata se efectuează prin ordin de plată (OP) în contul furnizorului, în termen convenit la semnarea contractului.',
                ParagraphStyle('ct', fontName='Helvetica', fontSize=8, textColor=GRAY_600, leading=12)),
        ]
    ]
    cond_tbl = Table(cond_data, colWidths=[59*mm, 59*mm, 59*mm])
    cond_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GRAY_100),
        ('BOX', (0,0), (-1,-1), 0.5, GRAY_200),
        ('INNERGRID', (0,0), (-1,-1), 0.5, GRAY_200),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROUNDEDCORNERS', [6]),
    ]))
    story.append(cond_tbl)
    story.append(Spacer(1, 6*mm))

    # ── OBSERVATII ──
    obs = data.get('observatii', '')
    if obs:
        story.append(Paragraph('OBSERVAȚII', ParagraphStyle('sec2', fontName='Helvetica-Bold', fontSize=9,
            textColor=GRAY_400, spaceAfter=3*mm, tracking=2)))
        obs_tbl = Table([[Paragraph(obs, ParagraphStyle('obs', fontName='Helvetica', fontSize=8.5,
            textColor=GRAY_600, leading=13))]], colWidths=[179*mm])
        obs_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), BRAND_BLUE_LT),
            ('BOX', (0,0), (-1,-1), 0.5, BRAND_BLUE),
            ('LEFTBORDER', (0,0), (0,-1), 3, BRAND_BLUE),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ]))
        story.append(obs_tbl)
        story.append(Spacer(1, 6*mm))

    # ── SIGNATURE BLOCK ──
    sig_data = [
        [
            Paragraph('Întocmit de,', ParagraphStyle('s', fontName='Helvetica', fontSize=8, textColor=GRAY_600)),
            Paragraph('', ParagraphStyle('s')),
            Paragraph('Confirmat de client,', ParagraphStyle('s', fontName='Helvetica', fontSize=8, textColor=GRAY_600)),
        ],
        [Spacer(1, 16*mm), '', Spacer(1, 16*mm)],
        [
            Paragraph('<b>Gixen SRL</b>', ParagraphStyle('sb', fontName='Helvetica-Bold', fontSize=9, textColor=BRAND_NAVY)),
            '',
            Paragraph(f'<b>{data.get("client",{}).get("name","")}</b>', ParagraphStyle('sb', fontName='Helvetica-Bold', fontSize=9, textColor=BRAND_NAVY)),
        ],
        [
            HRFlowable(width='100%', thickness=0.5, color=GRAY_400),
            '',
            HRFlowable(width='100%', thickness=0.5, color=GRAY_400),
        ],
        [
            Paragraph('Semnătură și ștampilă', ParagraphStyle('sl', fontName='Helvetica', fontSize=7.5, textColor=GRAY_400)),
            '',
            Paragraph('Semnătură și ștampilă', ParagraphStyle('sl', fontName='Helvetica', fontSize=7.5, textColor=GRAY_400)),
        ],
    ]
    sig_tbl = Table(sig_data, colWidths=[75*mm, 29*mm, 75*mm])
    sig_tbl.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(sig_tbl)

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return buf.getvalue()


# ── TEST DATA ──
test_data = {
    'nr_oferta': 'OF-2025-001',
    'valabila_zile': 15,
    'moneda': 'RON',
    'client': {
        'name': 'SC Papirus SRL',
        'cui': 'RO12345678',
        'regCom': 'J40/1234/2010',
        'adresa': 'Str. Mihai Eminescu 12, București',
        'email': 'contact@papirus.ro',
        'telefon': '0721 234 567',
    },
    'produse': [
        {
            'cod': 'GX-PTR-XXL',
            'name': 'Patrice XXL',
            'unitate': 'rolă',
            'pretBaza': 8.50,
            'pretFinal': 7.65,
            'discountProcent': 10,
            'cantitate': 192,
            'specs': '4 straturi · 280 foi · H21.5cm, Ø27cm · 4 role/pachet',
        },
        {
            'cod': 'GX-PTR-CLS',
            'name': 'Patrice Clasic 4S',
            'unitate': 'rolă',
            'pretBaza': 6.20,
            'pretFinal': 5.58,
            'discountProcent': 10,
            'cantitate': 288,
            'specs': '4 straturi · 160 foi · H22cm, Ø21.5cm · 6 role/pachet',
        },
        {
            'cod': 'GX-MRB-2S',
            'name': 'Mr Big 2S',
            'unitate': 'rolă',
            'pretBaza': 5.20,
            'pretFinal': 4.68,
            'discountProcent': 10,
            'cantitate': 192,
            'specs': '2 straturi · 330 foi · H22cm, Ø27cm · 4 role/pachet',
        },
        {
            'cod': 'GX-RYL-MNI',
            'name': 'Royal Clean Mini 2S',
            'unitate': 'rolă',
            'pretBaza': 2.80,
            'pretFinal': 2.80,
            'discountProcent': 0,
            'cantitate': 336,
            'specs': '2 straturi · 150 foi · H19cm, Ø21cm · 6 role/pachet',
        },
        {
            'cod': 'GX-FLP-VLT',
            'name': 'Flip Violet 2S',
            'unitate': 'rolă',
            'pretBaza': 4.60,
            'pretFinal': 4.14,
            'discountProcent': 10,
            'cantitate': 144,
            'specs': '2 straturi · 250 foi · H22cm, Ø22cm · 6 role/pachet',
        },
    ],
    'observatii': (
        'Prețurile includ discount de volum pentru cantitățile specificate. '
        'Pentru comenzi cu cantități diferite, prețul unitar se recalculează conform grilei de prețuri standard. '
        'Livrarea se efectuează în maxim 3-5 zile lucrătoare de la confirmarea comenzii și recepția plății. '
        'Oferta poate fi negociată suplimentar pentru contracte pe termen lung sau volume mai mari.'
    ),
}

pdf_bytes = generate_oferta(test_data)
with open('/mnt/user-data/outputs/Oferta_Gixen_Demo.pdf', 'wb') as f:
    f.write(pdf_bytes)
print(f"PDF generat: {len(pdf_bytes):,} bytes")
