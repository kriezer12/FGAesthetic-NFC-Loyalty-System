type ReceiptItem = {
  description: string
  quantity: number
  lineTotal: number
}

export type ReceiptTemplateData = {
  modeLabel: "INTERNAL ORIGINAL" | "INTERNAL DUPLICATE"
  businessName: string
  vatTin?: string
  branchAddress?: string
  ptuNo?: string
  dateIssued?: string
  posSerialNo?: string
  transactionDate: string
  receiptNo: string
  customerName?: string
  branchName?: string
  items: ReceiptItem[]
  subtotal?: number
  lessVat?: number
  salesNetOfVat?: number
  seniorPwdDiscount?: number
  discountLabel?: string
  discountAmount?: number
  total?: number
  amountPaid?: number
  changeAmount?: number
  zeroRatedSale?: number
  vatExemptSale?: number
  vatableSale?: number
  vatAmount?: number
  paymentMethod?: string
  paymentReference?: string
}

const formatMoney = (value: number) => `P${Number(value || 0).toFixed(2)}`

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;")

const row = (label: string, amount: number, alwaysShow = false) => {
  if (!alwaysShow && amount <= 0) return ""
  return `<tr><td>${escapeHtml(label)}</td><td class=\"right\">${escapeHtml(formatMoney(amount))}</td></tr>`
}

const openPrintWindow = (html: string, windowFeatures: string) => {
  if (typeof window === "undefined") return
  const popup = window.open("", "_blank", windowFeatures)
  if (!popup) return

  popup.document.write(html)
  popup.document.close()
  popup.focus()
  popup.print()
}

export const openThermalReceipt58mm = (data: ReceiptTemplateData) => {
  const itemRows = data.items
    .map((item) => {
      const label = `${item.description} x${item.quantity}`
      return `<tr><td>${escapeHtml(label)}</td><td class=\"right\">${escapeHtml(formatMoney(item.lineTotal))}</td></tr>`
    })
    .join("")

  const totalsRows = [
    data.subtotal !== undefined ? row("SubTotal (Including Taxes)", data.subtotal, true) : "",
    data.lessVat !== undefined ? row("Less VAT", data.lessVat) : "",
    data.salesNetOfVat !== undefined ? row("Sales Net of VAT", data.salesNetOfVat) : "",
    data.seniorPwdDiscount !== undefined ? row("Senior/PWD Discount", data.seniorPwdDiscount) : "",
    data.discountAmount !== undefined ? row(data.discountLabel ? `Discount (${data.discountLabel})` : "Discount", data.discountAmount) : "",
    data.total !== undefined ? row("Total", data.total, true) : "",
    data.amountPaid !== undefined ? row("Amount Paid", data.amountPaid, true) : "",
    data.changeAmount !== undefined ? row("Change Amount", data.changeAmount, true) : "",
  ].join("")

  const vatRows = [
    data.zeroRatedSale !== undefined ? row("Zero Rated Sale", data.zeroRatedSale) : "",
    data.vatExemptSale !== undefined ? row("VAT Exempt Sale", data.vatExemptSale) : "",
    data.vatableSale !== undefined ? row("Vatable Sale", data.vatableSale) : "",
    data.vatAmount !== undefined ? row("VAT Amount", data.vatAmount) : "",
  ].join("")

  const html = `
    <html>
      <head>
        <title>${escapeHtml(`Internal Transaction ${data.receiptNo}`)}</title>
        <style>
          @page { size: 58mm auto; margin: 4mm; }
          * { box-sizing: border-box; }
          body { width: 50mm; margin: 0 auto; font-family: Arial, sans-serif; color: #000; font-size: 10px; line-height: 1.25; }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: 700; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 1px 0; vertical-align: top; }
          .badge { display: inline-block; border: 1px solid #000; padding: 2px 6px; font-weight: 700; margin-bottom: 4px; }
          .logo { width: 28mm; max-width: 100%; display: block; margin: 0 auto 4px; }
        </style>
      </head>
      <body>
        <div class="center">
          <img class="logo" src="${window.location.origin}/logo/logo.png" alt="FG Aesthetic Clinic Logo" />
          <div class="badge">${escapeHtml(data.modeLabel)}</div>
          <div class="bold">${escapeHtml(data.businessName || "FG Aesthetic Clinic")}</div>
          ${data.vatTin ? `<div>VAT REG TIN: ${escapeHtml(data.vatTin)}</div>` : ""}
          ${data.branchAddress ? `<div>Branch Address: ${escapeHtml(data.branchAddress)}</div>` : ""}
          ${data.ptuNo ? `<div>PTU No.: ${escapeHtml(data.ptuNo)}</div>` : ""}
          ${data.dateIssued ? `<div>Date Issued: ${escapeHtml(data.dateIssued)}</div>` : ""}
          ${data.posSerialNo ? `<div>POS S/N: ${escapeHtml(data.posSerialNo)}</div>` : ""}
        </div>

        <div class="divider"></div>
        <div class="center bold" style="font-size: 10px; border: 1px solid #000; padding: 4px 3px; margin-bottom: 4px;">
          INTERNAL USE ONLY - NOT AN OFFICIAL BIR RECEIPT/INVOICE
        </div>
        <div class="center bold" style="font-size: 11px;">INTERNAL TRANSACTION SLIP</div>
        <div>Date: ${escapeHtml(data.transactionDate)}</div>
        <div>Transaction Ref: ${escapeHtml(data.receiptNo)}</div>

        ${data.customerName || data.branchName ? `<div class=\"divider\"></div>` : ""}
        ${data.customerName ? `<div>Customer: ${escapeHtml(data.customerName)}</div>` : ""}
        ${data.branchName ? `<div>Branch: ${escapeHtml(data.branchName)}</div>` : ""}

        <div class="divider"></div>
        <table><tbody>${itemRows || `<tr><td>No items</td><td class=\"right\">${escapeHtml(formatMoney(0))}</td></tr>`}</tbody></table>

        ${totalsRows ? `<div class=\"divider\"></div><table><tbody>${totalsRows}</tbody></table>` : ""}
        ${vatRows ? `<div class=\"divider\"></div><table><tbody>${vatRows}</tbody></table>` : ""}

        ${(data.paymentMethod || data.paymentReference) ? `<div class=\"divider\"></div>` : ""}
        ${data.paymentMethod ? `<div>Payment: ${escapeHtml(data.paymentMethod)}</div>` : ""}
        ${data.paymentReference ? `<div>Reference: ${escapeHtml(data.paymentReference)}</div>` : ""}

        <div class="center" style="margin-top: 8px;">For internal transaction tracking only.</div>
      </body>
    </html>
  `

  openPrintWindow(html, "width=420,height=900")
}

export const openInvoiceA4Landscape = (data: ReceiptTemplateData) => {
  const itemRows = data.items
    .map((item, index) => {
      const amount = formatMoney(item.lineTotal)
      const unit = item.quantity > 0 ? item.lineTotal / item.quantity : 0
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.description)}</td>
        <td class=\"right\">${item.quantity}</td>
        <td class=\"right\">${escapeHtml(formatMoney(unit))}</td>
        <td class=\"right\">${escapeHtml(amount)}</td>
      </tr>`
    })
    .join("")

  const html = `
    <html>
      <head>
        <title>${escapeHtml(`Internal Invoice ${data.receiptNo}`)}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: Arial, sans-serif; margin: 0; color: #111; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111; padding-bottom: 10px; }
          .title { font-size: 24px; font-weight: 700; }
          .meta { font-size: 12px; text-align: right; }
          .section { margin-top: 14px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background: #f5f5f5; text-align: left; }
          .right { text-align: right; }
          .totals { margin-top: 14px; width: 40%; margin-left: auto; }
          .totals td { border: none; padding: 4px 0; }
          .footer { margin-top: 20px; font-size: 11px; color: #444; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">FG Aesthetic Clinic - INTERNAL INVOICE</div>
            <div>${escapeHtml(data.branchAddress || "")}</div>
            <div>${data.vatTin ? `VAT REG TIN: ${escapeHtml(data.vatTin)}` : ""}</div>
          </div>
          <div class="meta">
            <div><strong>${escapeHtml(data.modeLabel)}</strong></div>
            <div>Transaction Ref: ${escapeHtml(data.receiptNo)}</div>
            <div>Date: ${escapeHtml(data.transactionDate)}</div>
            ${data.ptuNo ? `<div>PTU No: ${escapeHtml(data.ptuNo)}</div>` : ""}
            ${data.posSerialNo ? `<div>POS S/N: ${escapeHtml(data.posSerialNo)}</div>` : ""}
          </div>
        </div>

        <div style="margin-top: 8px; border: 1px solid #111; padding: 6px 8px; font-size: 11px; font-weight: 700; background: #f9f9f9;">
          INTERNAL USE ONLY - NOT AN OFFICIAL BIR RECEIPT/INVOICE.
          Manual BIR-approved receipt should be issued separately.
        </div>

        <div class="section">
          ${data.customerName ? `<div><strong>Customer:</strong> ${escapeHtml(data.customerName)}</div>` : ""}
          ${data.branchName ? `<div><strong>Branch:</strong> ${escapeHtml(data.branchName)}</div>` : ""}
        </div>

        <div class="section">
          <table>
            <thead>
              <tr>
                <th style="width:8%;">#</th>
                <th>Description</th>
                <th style="width:12%;" class="right">Qty</th>
                <th style="width:16%;" class="right">Unit Price</th>
                <th style="width:16%;" class="right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows || `<tr><td colspan=\"5\">No items</td></tr>`}
            </tbody>
          </table>
        </div>

        <table class="totals">
          ${data.subtotal !== undefined ? `<tr><td>Subtotal</td><td class=\"right\">${escapeHtml(formatMoney(data.subtotal))}</td></tr>` : ""}
          ${(data.discountAmount ?? 0) > 0 ? `<tr><td>${escapeHtml(data.discountLabel || "Discount")}</td><td class=\"right\">-${escapeHtml(formatMoney(data.discountAmount || 0))}</td></tr>` : ""}
          ${data.total !== undefined ? `<tr><td><strong>Total</strong></td><td class=\"right\"><strong>${escapeHtml(formatMoney(data.total))}</strong></td></tr>` : ""}
          ${data.amountPaid !== undefined ? `<tr><td>Amount Paid</td><td class=\"right\">${escapeHtml(formatMoney(data.amountPaid))}</td></tr>` : ""}
          ${data.changeAmount !== undefined ? `<tr><td>Change</td><td class=\"right\">${escapeHtml(formatMoney(data.changeAmount))}</td></tr>` : ""}
        </table>

        <div class="footer">
          ${data.paymentMethod ? `<div>Payment Method: ${escapeHtml(data.paymentMethod)}</div>` : ""}
          ${data.paymentReference ? `<div>Payment Reference: ${escapeHtml(data.paymentReference)}</div>` : ""}
          <div>Generated for internal tracking and A4 landscape PDF export.</div>
        </div>
      </body>
    </html>
  `

  openPrintWindow(html, "width=1200,height=900")
}
