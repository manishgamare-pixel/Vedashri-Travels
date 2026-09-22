#!/usr/bin/env python3
from pathlib import Path
from fpdf import FPDF, XPos, YPos

OUT = Path("/workspace/docs/VEDASHRI_DEPLOY_RENDER.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)


class Guide(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(27, 67, 50)
        self.cell(0, 8, "Vedashri Travels  |  Deploy on Render, Railway and VPS",
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

    def numbered(self, items):
        self.set_font("Helvetica", "", 11)
        self.set_text_color(16, 35, 24)
        for i, it in enumerate(items, 1):
            self.set_x(self.l_margin)
            self.multi_cell(0, 6, "%s.  %s" % (i, it))
        self.ln(2)

    def code(self, text):
        self.set_x(self.l_margin)
        self.set_fill_color(238, 246, 240)
        self.set_font("Courier", "", 9)
        self.set_text_color(16, 35, 24)
        self.multi_cell(0, 5, text, fill=True)
        self.ln(3)

    def note(self, text):
        self.set_x(self.l_margin)
        self.set_fill_color(255, 248, 230)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(16, 35, 24)
        self.multi_cell(0, 6, text, fill=True)
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
        self.ln(3)


pdf = Guide()
pdf.set_auto_page_break(auto=True, margin=18)
pdf.add_page()

pdf.heading("Vedashri Travels", 22)
pdf.heading("Deploy on Render, Railway and a VPS", 14)
pdf.p("Detailed note for putting this Node.js app online so the three links stay up and bookings do not reset. Written for the current code: Express on port from process.env.PORT, start command npm start, PostgreSQL when DATABASE_URL is set, otherwise data/store.json.")

pdf.heading("1. What you are deploying", 14)
pdf.p("One Node.js server, three public pages:")
pdf.bullet([
    "Customer desktop: /customer.html  (same as /)",
    "Owner dashboard: /owner.html  (PIN 2145 until you change it)",
    "Customer mobile app: /app.html",
])
pdf.p("This is not a static site. Do not use Vercel, Netlify or GitHub Pages. You need a host that keeps a Node process running.")
pdf.shot("After deploy, share", [
    "https://YOUR-HOST/customer.html",
    "https://YOUR-HOST/owner.html",
    "https://YOUR-HOST/app.html",
])

pdf.heading("2. How data is stored", 14)
pdf.bullet([
    "If DATABASE_URL is set: PostgreSQL table app_state (company, cars, bookings, staff).",
    "If DATABASE_URL is empty: file data/store.json (or $DATA_DIR/store.json).",
    "Uploaded logos, QR and car photos go in DATA_DIR/uploads.",
])
pdf.note("On Render Free without Postgres, store.json is wiped on every restart or redeploy. That is why bookings and fleet reset. Link a PostgreSQL database. Then you do not need a paid disk.")

pdf.heading("3. Push the project to GitHub", 14)
pdf.numbered([
    "Create a GitHub account if needed. New repository: vedashri-travels. Do not add a README on GitHub if this folder already has one.",
    "On your computer, in the project folder, run the commands below. Replace YOUR_USER.",
    "GitHub will ask for a personal access token as the password, not your GitHub login password.",
    "Confirm the repo shows public/customer.html, public/owner.html, public/app.html, server.js and package.json.",
])
pdf.code("git add .\ngit commit -m \"Vedashri Travels ready to deploy\"\ngit branch -M main\ngit remote add origin https://github.com/YOUR_USER/vedashri-travels.git\ngit push -u origin main")
pdf.p("Later updates (same repo, same Render/Railway service):")
pdf.code("git add .\ngit commit -m \"Describe the change\"\ngit push")

pdf.add_page()
pdf.heading("4. Deploy on Render (recommended)", 14)
pdf.p("Use the existing Web Service if you already created one. Do not click New Web Service unless you want a second copy.")

pdf.heading("4.1 Create or open the Web Service", 12)
pdf.numbered([
    "Sign in at render.com with GitHub.",
    "If you have no service yet: New +  ->  Web Service  ->  connect vedashri-travels.",
    "If you already have a service: open that service. Skip creating another one.",
])
pdf.shot("Web Service settings", [
    "Runtime / Language: Node",
    "Branch: main",
    "Build command: npm install",
    "Start command: npm start",
    "Do not set PORT. Render sets it. server.js already reads process.env.PORT.",
])
pdf.p("Click Create Web Service (or Save). Wait until logs show: Vedashri Travels running on...")

pdf.heading("4.2 Add PostgreSQL so data does not reset", 12)
pdf.numbered([
    "In the Render dashboard click New +  ->  PostgreSQL.",
    "Name: vedashri-db. Region: same region as the web service. Plan: Free is enough to start.",
    "Create the database. Wait until status is Available.",
    "Open the database -> Connect. Copy Internal Database URL (for services on Render).",
    "Open your Web Service -> Environment.",
    "Add DATABASE_URL  =  that Internal Database URL. Save.",
    "Easier: on the Web Service, Environment, use Link Database if shown. Render fills DATABASE_URL.",
    "Manual Deploy -> Deploy latest commit. Wait for green.",
    "In logs you should see: Storage: PostgreSQL",
])
pdf.note("If logs still say Storage: file ... then DATABASE_URL is missing or not visible to the web service. Link the database again and redeploy. Do not create a second web service.")

pdf.heading("4.3 Your three lasting links", 12)
pdf.p("If the service URL is https://vedashri-travels.onrender.com :")
pdf.bullet([
    "Customer: https://vedashri-travels.onrender.com/customer.html",
    "Owner: https://vedashri-travels.onrender.com/owner.html   PIN 2145",
    "App: https://vedashri-travels.onrender.com/app.html",
])
pdf.p("Replace vedashri-travels with the name Render assigned. These URLs stay as long as that service is running.")

pdf.heading("4.4 Disk option (only if you skip Postgres)", 12)
pdf.p("Persistent disks are not on Render Free. Disks appears after you change Instance type from Free to Starter.")
pdf.numbered([
    "Settings -> Instance type -> Starter. Save.",
    "Left sidebar Disks -> Add disk. Mount path /var/data. Size 1 GB.",
    "Environment: DATA_DIR = /var/data",
    "Redeploy.",
])
pdf.p("Postgres (section 4.2) is the better free path. You do not need both.")

pdf.heading("4.5 After each code change", 12)
pdf.code("git add .\ngit commit -m \"Describe the change\"\ngit push")
pdf.p("Render rebuilds the same service. The three URLs do not change.")

pdf.add_page()
pdf.heading("5. Deploy on Railway (no Render upgrade)", 14)
pdf.numbered([
    "Sign in at railway.app with GitHub.",
    "New Project -> Deploy from GitHub repo -> vedashri-travels.",
    "Railway detects Node. Start command: npm start. Build: npm install.",
    "New -> Database -> PostgreSQL. Wait until it is running.",
    "Open the web service -> Variables. Add DATABASE_URL from the Postgres plugin (Railway often injects it when you link the database). Do not set PORT.",
    "Generate a public domain: Settings -> Networking -> Generate domain.",
    "Share /customer.html, /owner.html and /app.html on that domain.",
])
pdf.p("Optional: add a Volume at /var/data and set DATA_DIR=/var/data if you want file backups as well. Postgres alone is enough for bookings and fleet.")

pdf.heading("6. Deploy on a small VPS (Hetzner / DigitalOcean)", 14)
pdf.p("Use Ubuntu 22.04. Point a domain or use the server IP.")
pdf.code("sudo apt update\nsudo apt install -y nodejs npm nginx postgresql\nsudo -u postgres createdb vedashri\nsudo -u postgres createuser vedashri\n# set a password in psql, then:\nexport DATABASE_URL=postgres://vedashri:PASSWORD@127.0.0.1:5432/vedashri\ngit clone https://github.com/YOUR_USER/vedashri-travels.git /var/www/vedashri\ncd /var/www/vedashri\nnpm install\nDATABASE_URL=$DATABASE_URL npx --yes pm2 start server.js --name vedashri\nnpx --yes pm2 startup && npx --yes pm2 save")
pdf.p("Nginx (one public port, all three links):")
pdf.code("server {\n  listen 80;\n  server_name travels.example.in;\n  location / {\n    proxy_pass http://127.0.0.1:3000;\n    proxy_set_header Host $host;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n  }\n}")
pdf.p("HTTPS: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d travels.example.in")

pdf.heading("7. What not to use", 14)
pdf.bullet([
    "Vercel / Netlify / GitHub Pages: no always-on Node process, no lasting store.json, uploads vanish.",
    "A second Render Web Service: you would get a new URL and empty data. Edit the existing service.",
    "MonkeyCode session preview: expires with the session. Not a production host.",
])

pdf.heading("8. Check that it worked", 14)
pdf.numbered([
    "Open /customer.html. Book a test trip.",
    "Open /owner.html, PIN 2145. Confirm the booking is listed. Change a car rate. Refresh the customer Fleet page. The new rate must show.",
    "Render: Manual Deploy once. After it comes back, the booking and the new rate must still be there. If they vanished, DATABASE_URL is not set.",
    "Logs should contain Storage: PostgreSQL",
])

pdf.heading("9. Owner first login", 14)
pdf.bullet([
    "PIN 2145. Change it under Company.",
    "Upload logo and GPay QR.",
    "Edit fleet rates. Customer site follows live.",
])

pdf.heading("10. Files in this project that matter for deploy", 14)
pdf.bullet([
    "package.json  start: npm start   Node 18+",
    "server.js  listens on 0.0.0.0 and process.env.PORT",
    "lib/store.js  PostgreSQL if DATABASE_URL, else JSON file",
    "render.yaml  example Web Service + Postgres (optional Blueprint)",
    "public/customer.html  public/owner.html  public/app.html",
])

pdf.p("Vedashri Travels  -  keep this PDF in docs/VEDASHRI_DEPLOY_RENDER.pdf")
pdf.output(str(OUT))
print("Wrote", OUT)
