#!/usr/bin/env python3
from pathlib import Path
from fpdf import FPDF, XPos, YPos

OUT = Path("/workspace/docs/VEDASHRI_TRAVELS_GUIDE.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)


class Guide(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(27, 67, 50)
        self.cell(0, 8, "Vedashri Travels  |  User manual and publish guide",
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(27, 67, 50)
        self.line(15, 12, 195, 12)
        self.ln(4)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(80, 80, 80)
        self.cell(0, 8, "Page %s" % self.page_no(), align="C")

    def heading(self, text, size=16):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", size)
        self.set_text_color(27, 67, 50)
        self.multi_cell(0, 8, text)
        self.ln(2)

    def p(self, text):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(16, 35, 24)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def bullet(self, items):
        self.set_font("Helvetica", "", 11)
        self.set_text_color(16, 35, 24)
        for it in items:
            self.set_x(self.l_margin)
            self.multi_cell(0, 6, "-  " + it)
        self.ln(2)

    def code(self, text):
        self.set_x(self.l_margin)
        self.set_fill_color(238, 246, 240)
        self.set_font("Courier", "", 9)
        self.set_text_color(16, 35, 24)
        self.multi_cell(0, 5, text, fill=True)
        self.ln(3)

    def shot(self, title, lines):
        w = self.epw
        self.set_x(self.l_margin)
        self.set_fill_color(27, 67, 50)
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 10)
        self.cell(w, 8, "  " + title, new_x=XPos.LMARGIN, new_y=YPos.NEXT, fill=True)
        self.set_fill_color(247, 243, 234)
        self.set_text_color(16, 35, 24)
        self.set_font("Helvetica", "", 10)
        for line in lines:
            self.set_x(self.l_margin)
            self.cell(w, 7, "  " + line, new_x=XPos.LMARGIN, new_y=YPos.NEXT, fill=True)
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(77, 99, 86)
        self.cell(w, 6, "Screenshot layout (wireframe of the live screen)",
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(3)


pdf = Guide()
pdf.set_auto_page_break(auto=True, margin=18)
pdf.add_page()
pdf.heading("Vedashri Travels", 22)
pdf.p("User manual, hosting guide, and how to publish this app on GitHub. Compact India-only car travel: one Node.js server, two public links.")

pdf.heading("1. The two website links", 14)
pdf.p("Customer site  ->  /     Home, book, fleet, my trips, pay, AI assistant")
pdf.p("Customer app   ->  /app.html     Mobile home-screen view")
pdf.p("Owner desk     ->  /owner.html     Company, fleet, rates, drivers, staff, bookings, accounts, reports")
pdf.p("Default owner PIN: 2145  (change it under Company after first login).")

pdf.shot("Customer home", [
    "Vedashri Travels",
    "Safe, on-time car travel across India",
    "[ Local ]  [ Airport pickup & drop ]  [ Outstation ]",
    "[ Book a trip ]   [ Customer app ]",
    "Ask a query | Local travel | Airport | Outstation",
])
pdf.p("Figure 1. Every page load starts on Home. The customer never lands on a blank or inner screen first.")

pdf.heading("2. Booking, map and fare", 14)
pdf.bullet([
    "Choose Local, Airport or Outstation.",
    "For airport, choose Pickup or Drop. Rates differ by car.",
    "Choose Single or Return. Return bills both ways on distance slabs.",
    "Type From and To from the India place list. The map follows the place name. Do not enter coordinates.",
    "Set start and end dates. Extra days between them are waiting days, charged per car per day.",
    "Pick a car. The estimate updates: slab fare plus waiting.",
    "Pay with GPay, UPI, card or cash, then Confirm booking. A WhatsApp greeting link opens.",
])
pdf.shot("Book trip + map", [
    "Travel type: Local | Airport | Outstation     Journey: Single | Return",
    "From: Shivajinagar, Pune",
    "To:   Mahabaleshwar, Maharashtra",
    "Map: India tiles, From marker, To marker, route line",
    "Car cards     Estimated fare Rs ....",
    "Pay with: GPay / UPI / Card / Cash     [ Confirm booking ]",
])
pdf.p("Figure 2. Place names drive the map. Fare uses distance slabs, return multiplier and waiting days.")

pdf.heading("3. How fares are calculated", 14)
pdf.bullet([
    "Slab 1: fixed amount up to slab-1 km (example: first 80 km = Rs 2000).",
    "Slab 2: fixed amount from after slab 1 up to slab-2 km (example: 81-300 km = Rs 3500).",
    "Slab 3: after slab 2 = slab-2 rate + leftover km x per-km rate.",
    "Return: distance is doubled before slabs (local and outstation).",
    "Waiting: days between start and end x waiting per day for that car. Same-day = 0.",
    "Airport: fixed pickup or drop. Return airport = pickup + drop. No distance slab.",
])
pdf.p("Each car has its own rates. The owner edits them on Fleet & rates. Customer fleet and quote screens read the same numbers.")

pdf.heading("4. Payment gateway", 14)
pdf.p("On confirm, the Pay page shows the company GPay UPI ID and QR uploaded by the owner. Cash stays pending until the owner marks the trip completed. GPay / UPI / card are marked paid at booking. This is a compact gateway: QR + method record, not a live bank capture.")

pdf.heading("5. My trips, fleet, AI, WhatsApp", 14)
pdf.bullet([
    "My trips: enter the 10-digit mobile used at booking. Approve, cancel, or mark complete anytime.",
    "Cancel and complete open a WhatsApp greeting using the owner WhatsApp number.",
    "Fleet: cars, seats, slabs, waiting/day, airport pickup and drop.",
    "AI assistant (gold AI button): answers fares, cars, waiting, payments and contact in English.",
    "Home query form posts to the owner Bookings & queries list.",
])

pdf.heading("6. Owner dashboard", 14)
pdf.shot("Owner desk", [
    "Sidebar: Dashboard | Company | Fleet | Drivers | Staff | Bookings | Accounts | Reports",
    "KPIs: Trips | Income | Expenses | Profit",
    "Charts: income by travel type, income by car, daily totals",
    "Tables: bookings with Approve / Complete / Cancel",
])
pdf.bullet([
    "Company: owner name, company, address, phones, WhatsApp, GPay ID, PIN, logo and QR upload.",
    "Fleet: add / edit / delete cars, image upload, 3 slabs, waiting/day, airport pickup and drop.",
    "Drivers / Staff: details, salary, trip charge; edit or delete. Staff reports export as CSV.",
    "Bookings: live customer bookings and queries.",
    "Accounts: expenses plus income from non-cancelled bookings.",
    "Reports: daily, monthly, annual. CSV export for bookings, staff, drivers, expenses.",
])

pdf.heading("7. Run on your computer", 14)
pdf.code("git clone https://github.com/YOUR_USER/vedashri-travels.git\ncd vedashri-travels\nnpm install\nnpm start")
pdf.p("Open http://localhost:3000 (customer) and http://localhost:3000/owner.html (owner). Need Node.js 18 or newer.")

pdf.add_page()
pdf.heading("8. Put the two links on the web", 14)
pdf.p("The app is Node.js, not a static GitHub Pages site. Use Railway, Render, or a small Linux VPS.")

pdf.heading("Option A - Render or Railway", 12)
pdf.bullet([
    "Push the repo to GitHub (section 9).",
    "Create a new Web Service from that repo.",
    "Build command: npm install",
    "Start command: npm start",
    "The app reads process.env.PORT automatically.",
])
pdf.p("After deploy, share:")
pdf.bullet([
    "Customer: https://YOUR-HOST/",
    "Owner: https://YOUR-HOST/owner.html",
    "App: https://YOUR-HOST/app.html",
])

pdf.heading("Option B - Ubuntu VPS", 12)
pdf.code("sudo apt update\nsudo apt install -y nodejs npm nginx\ngit clone https://github.com/YOUR_USER/vedashri-travels.git /var/www/vedashri\ncd /var/www/vedashri\nnpm install\nnpx --yes pm2 start server.js --name vedashri\nnpx --yes pm2 startup && npx --yes pm2 save")
pdf.p("Nginx (one public port, both links):")
pdf.code("server {\n  listen 80;\n  server_name travels.example.in;\n  location / {\n    proxy_pass http://127.0.0.1:3000;\n    proxy_set_header Host $host;\n  }\n}")
pdf.p("Add HTTPS with Let's Encrypt (certbot --nginx) before sharing GPay/QR with customers. Back up data/store.json; that file is the live database.")

pdf.heading("9. Publish the app to GitHub", 14)
pdf.bullet([
    "Create a free GitHub account at github.com if needed.",
    "New repository named vedashri-travels. Do not add a README on GitHub if this folder already has one.",
    "In the project folder run the commands below. Replace YOUR_USER.",
    "GitHub will ask for a personal access token as the password (not your GitHub account password).",
])
pdf.code("git init\ngit add .\ngit commit -m \"Vedashri Travels customer and owner sites\"\ngit branch -M main\ngit remote add origin https://github.com/YOUR_USER/vedashri-travels.git\ngit push -u origin main")
pdf.p("Later updates:")
pdf.code("git add .\ngit commit -m \"Describe the change\"\ngit push")
pdf.p("GitHub Pages only serves static files. This app needs Node, so keep the live customer and owner links on Render / Railway / VPS. GitHub still holds the source, this PDF (docs/VEDASHRI_TRAVELS_GUIDE.pdf), and the HTML copy (docs/manual.html).")

pdf.heading("10. Customer mobile app link", 14)
pdf.p("Share /app.html. On Android Chrome: menu, Add to Home screen. On iPhone Safari: Share, Add to Home Screen. That icon opens the customer flow. The owner desk stays on /owner.html on a larger screen.")

pdf.heading("11. Data and limits", 14)
pdf.bullet([
    "Places and map geocoding are India-only.",
    "Bookings, cars and staff live in data/store.json (no extra database).",
    "WhatsApp greetings open wa.me with the owner number; they are not WhatsApp Business API.",
    "GPay QR is the image the owner uploads.",
    "Keep the product small: one Pune-based fleet, India routes, PIN login for the owner.",
])
pdf.p("Vedashri Travels  -  keep this PDF with the repository under docs/")
pdf.output(str(OUT))
print("Wrote", OUT)
