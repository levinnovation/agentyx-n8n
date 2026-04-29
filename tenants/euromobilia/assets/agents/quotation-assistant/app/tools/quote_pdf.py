"""
Quote PDF Generator Tool — generates a branded Euromobilia PDF cotización.
"""

from __future__ import annotations

import io
import json
import os
import uuid
from datetime import datetime, timezone

from langchain_core.tools import tool

BRAND = {
    "company_name": "Euromobilia S.A.",
    "cedula": "Cédula Jurídica 3-101-077629",
    "address": "Nunciatura, de Teletica Canal 7, 600m oeste.",
    "phone": "(506) 2519-3100",
    "email": "andres.retana@euromobilia.com",
    "website": "www.euromobilia.com",
    "social_handle": "/euromobilia",
}

_RED_RGB = (1.0, 0.008, 0.051)
_DARK_RGB = (0.118, 0.161, 0.231)
_LIGHT_GRAY_RGB = (0.95, 0.95, 0.95)
_MID_GRAY_RGB = (0.80, 0.80, 0.80)


def _fmt(value: float, currency: str = "$") -> str:
    if value == 0:
        return ""
    return f"{currency}{value:,.2f}"


def _generate_pdf(quote_json: dict) -> bytes:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from reportlab.lib.colors import Color, white, black
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

    buf = io.BytesIO()
    page_w, page_h = letter
    margin_lr = 0.5 * inch
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        leftMargin=margin_lr, rightMargin=margin_lr,
        topMargin=0.4 * inch, bottomMargin=0.4 * inch,
    )
    usable_w = page_w - 2 * margin_lr

    red = Color(*_RED_RGB)
    dark = Color(*_DARK_RGB)
    light_gray = Color(*_LIGHT_GRAY_RGB)
    mid_gray = Color(*_MID_GRAY_RGB)

    styles = getSampleStyleSheet()
    s = lambda name, **kw: ParagraphStyle(name, parent=styles["Normal"], **kw)

    s_normal = s("EN", fontSize=9, textColor=dark, fontName="Helvetica")
    s_bold = s("EB", fontSize=9, textColor=dark, fontName="Helvetica-Bold")
    s_small = s("ES", fontSize=8, textColor=dark, fontName="Helvetica")
    s_small_b = s("ESB", fontSize=8, textColor=dark, fontName="Helvetica-Bold")
    s_label = s("EL", fontSize=9, textColor=dark, fontName="Helvetica-Bold")
    s_right = s("ER", fontSize=9, textColor=dark, fontName="Helvetica", alignment=TA_RIGHT)
    s_right_b = s("ERB", fontSize=9, textColor=dark, fontName="Helvetica-Bold", alignment=TA_RIGHT)
    s_section = s("ESEC", fontSize=11, textColor=dark, fontName="Helvetica-Bold", spaceBefore=2, spaceAfter=2)
    s_th = s("ETH", fontSize=9, textColor=white, fontName="Helvetica-Bold")
    s_th_r = s("ETHR", fontSize=9, textColor=white, fontName="Helvetica-Bold", alignment=TA_RIGHT)
    s_total_lbl = s("ETL", fontSize=10, textColor=white, fontName="Helvetica-Bold", alignment=TA_RIGHT)
    s_total_val = s("ETV", fontSize=10, textColor=white, fontName="Helvetica-Bold", alignment=TA_RIGHT)
    s_final_lbl = s("EFL", fontSize=12, textColor=white, fontName="Helvetica-Bold", alignment=TA_RIGHT)
    s_final_val = s("EFV", fontSize=12, textColor=white, fontName="Helvetica-Bold", alignment=TA_RIGHT)
    s_note = s("ENOTE", fontSize=8, textColor=dark, fontName="Helvetica")
    s_footer_w = s("EFW", fontSize=9, textColor=white, fontName="Helvetica")

    elements = []
    currency = quote_json.get("currency", "$")
    customer_name = quote_json.get("customer_name", "")
    project_name = quote_json.get("project_name", customer_name)
    date_str = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    valid_days = quote_json.get("valid_days", 15)

    logo_p = Paragraph("<b>EUROMOBILIA</b>", s("LOGO", fontSize=16, textColor=red, fontName="Helvetica-Bold"))
    hdr = Table([[logo_p, Paragraph("CUSTOMER INFORMATION", s_section)]], colWidths=[2.5 * inch, usable_w - 2.5 * inch])
    hdr.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    elements.append(hdr)
    elements.append(Spacer(1, 4))

    company_rows = [
        [Paragraph(f"<b>{BRAND['company_name']}</b>", s_bold), "", Paragraph("<b>PROJECT</b>", s_label), Paragraph(project_name, s_normal)],
        [Paragraph(BRAND["cedula"], s_small), "", Paragraph("<b>NAME</b>", s_label), Paragraph(customer_name, s_normal)],
        [Paragraph(BRAND["address"], s_small), "", Paragraph("<b>EMAIL</b>", s_label), Paragraph(quote_json.get("customer_email", ""), s_normal)],
        [Paragraph(f"Tel. {BRAND['phone']}", s_small), "", Paragraph("<b>PHONE</b>", s_label), Paragraph(quote_json.get("customer_phone", ""), s_normal)],
        [Paragraph(f"<b>Date</b> {date_str}", s_small_b), "", "", ""],
        [Paragraph(f"<b>Valid</b> {valid_days} días", s_small_b), "", "", ""],
    ]
    info_tbl = Table(company_rows, colWidths=[2.5 * inch, 0.3 * inch, 1.0 * inch, usable_w - 3.8 * inch])
    info_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 1), ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(info_tbl)
    elements.append(Spacer(1, 8))

    col_w = [0.5 * inch, 3.0 * inch, 1.0 * inch, 1.3 * inch, 1.3 * inch]
    th = [Paragraph("QTY", s_th), Paragraph("DESCRIPTION", s_th), Paragraph("MODEL", s_th), Paragraph("UNIT PRICE", s_th_r), Paragraph("FINAL", s_th_r)]
    all_rows = [th]
    row_styles = [
        ("BACKGROUND", (0, 0), (-1, 0), dark), ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("TOPPADDING", (0, 0), (-1, 0), 6), ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
    ]

    row_idx = 1
    global_item_idx = 0

    for group in quote_json.get("groups", []):
        group_name = group.get("name", "")
        if group_name:
            all_rows.append([Paragraph(f"<b>{group_name.upper()}</b>", s_small_b), "", "", "", ""])
            row_styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), light_gray))
            row_styles.append(("SPAN", (0, row_idx), (-1, row_idx)))
            row_styles.extend([("TOPPADDING", (0, row_idx), (-1, row_idx), 4), ("BOTTOMPADDING", (0, row_idx), (-1, row_idx), 4)])
            row_idx += 1

        for item in group.get("items", []):
            global_item_idx += 1
            desc = str(item.get("description", ""))[:60]
            model = str(item.get("model", item.get("unit", "")))[:30]
            qty = float(item.get("qty", item.get("quantity", 1)))
            unit_price = float(item.get("unit_price", 0))
            subtotal = float(item.get("subtotal", 0))
            if subtotal == 0 and unit_price > 0:
                subtotal = qty * unit_price

            bg = white if global_item_idx % 2 == 1 else light_gray
            all_rows.append([
                Paragraph(f"{qty:g}", s_normal), Paragraph(desc, s_normal), Paragraph(model, s_normal),
                Paragraph(_fmt(unit_price, currency), s_right), Paragraph(_fmt(subtotal, currency), s_right),
            ])
            row_styles.append(("BACKGROUND", (0, row_idx), (-1, row_idx), bg))
            row_styles.extend([("TOPPADDING", (0, row_idx), (-1, row_idx), 3), ("BOTTOMPADDING", (0, row_idx), (-1, row_idx), 3)])
            row_idx += 1

    row_styles.extend([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -2), 0.25, mid_gray),
        ("BOX", (0, 0), (-1, -1), 0.5, dark),
    ])
    main_table = Table(all_rows, colWidths=col_w, repeatRows=1)
    main_table.setStyle(TableStyle(row_styles))
    elements.append(main_table)
    elements.append(Spacer(1, 6))

    _sub = float(quote_json.get("subtotal", 0))
    _total_before_tax = _sub if _sub else float(quote_json.get("total", 0))
    _tax_rate = 0.13
    _vat = float(quote_json.get("vat", _total_before_tax * _tax_rate))
    _final = float(quote_json.get("final_total", _total_before_tax + _vat))

    notes = quote_json.get("notes", [])
    if isinstance(notes, str):
        notes = [notes] if notes else []
    if not notes:
        notes = ["Instalación no incluida.", "Solo un transporte al proyecto incluido."]

    notes_parts = [Paragraph("<b>Notes:</b>", s_small_b)] + [Paragraph(n, s_note) for n in notes]

    totals_data = [
        [Paragraph("SUBTOTAL", s_total_lbl), Paragraph(_fmt(_sub, currency), s_total_val)],
        [Paragraph("TOTAL", s_total_lbl), Paragraph(_fmt(_total_before_tax, currency), s_total_val)],
        [Paragraph("IVA 13%", s_right_b), Paragraph(_fmt(_vat, currency), s_right)],
        [Paragraph("FINAL", s_final_lbl), Paragraph(_fmt(_final, currency), s_final_val)],
    ]
    totals_tbl = Table(totals_data, colWidths=[1.3 * inch, 1.3 * inch])
    totals_tbl.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 0), (-1, 0), red), ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("BACKGROUND", (0, 1), (-1, 1), red), ("TEXTCOLOR", (0, 1), (-1, 1), white),
        ("BACKGROUND", (0, 3), (-1, 3), red), ("TEXTCOLOR", (0, 3), (-1, 3), white),
        ("BOX", (0, 0), (-1, -1), 0.5, dark),
        ("LINEBELOW", (0, 0), (-1, -2), 0.25, mid_gray),
    ]))

    footer_row = Table([[notes_parts, totals_tbl]], colWidths=[usable_w - 2.8 * inch, 2.8 * inch])
    footer_row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(footer_row)

    elements.append(Spacer(1, 12))
    contact_rows = [[Paragraph(line, s_footer_w)] for line in [
        BRAND["phone"], BRAND["email"], BRAND["website"], BRAND["social_handle"],
    ]]
    contact_tbl = Table(contact_rows, colWidths=[usable_w])
    contact_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), red),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(contact_tbl)

    doc.build(elements)
    return buf.getvalue()


def _upload_to_supabase(pdf_bytes: bytes, filename: str) -> str:
    import httpx
    supabase_url = os.environ.get("SUPABASE_URL", "")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_key:
        raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")

    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    uid = uuid.uuid4().hex[:12]
    path = f"quotes/{ts}/{uid}/{filename}"

    resp = httpx.post(
        f"{supabase_url}/storage/v1/object/artifacts/{path}",
        headers={
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/pdf",
            "x-upsert": "true",
        },
        content=pdf_bytes,
        timeout=15,
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Supabase upload failed ({resp.status_code}): {resp.text[:200]}")

    return f"{supabase_url}/storage/v1/object/public/artifacts/{path}"


@tool
def generate_quotation_pdf(quote_json_str: str) -> str:
    """Generate a branded Euromobilia PDF quotation and return a downloadable URL."""
    try:
        quote_data = json.loads(quote_json_str)
    except json.JSONDecodeError as e:
        return f"Error: Invalid JSON — {e}"

    try:
        pdf_bytes = _generate_pdf(quote_data)
    except Exception as e:
        return f"Error generating PDF: {e}"

    try:
        url = _upload_to_supabase(pdf_bytes, "Cotizacion-Euromobilia.pdf")
    except Exception as e:
        return f"Error uploading PDF: {e}"

    return (
        f"PDF generado exitosamente.\n\n"
        f"Descargar cotización: {url}\n\n"
        f"El documento incluye {len(quote_data.get('groups', []))} grupo(s) de artículos "
        f"con un total de ${quote_data.get('total', 0):,.2f}."
    )
