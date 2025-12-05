🧠 ROOM-BY-ROOM EXPLANATIONS & SOLUTIONS

Below is the full documentation for each vulnerability, including how to exploit it and how to fix it.

🟦 ROOM 1 — JSON / CONFIG INJECTION
🔥 Vulnerability

The server merges user-controlled JSON with game configuration:

const merged = Object.assign({}, defaultConfig, userConfig);


This allows overwriting sensitive fields such as:

isAdmin

score

level

No validation is applied.

🎯 Goal

Become admin by injecting a malicious JSON object.

✅ Solution

Submit this JSON:

{
  "username": "aziz",
  "score": 9999,
  "isAdmin": true
}


Result:

You gain admin privileges

Room 1 is completed

🛡️ How to Fix

Use whitelisting:

const allowed = (({ username }) => ({ username }))(userConfig);


Or manually validate each accepted field.
Never merge user input with server config.

🟨 ROOM 2 — DOM-BASED XSS
🔥 Vulnerability

The page uses:

mirror.innerHTML = "✨ " + val + " ✨";


which executes HTML & JavaScript from user input.

🎯 Goal

Execute JavaScript in the browser and call:

window.salle2Win()

✅ Solution

Enter this payload:

<img src=x onerror="salle2Win()">


This triggers the XSS and clears the room.

🛡️ How to Fix

Replace innerHTML with textContent

Sanitize input using DOMPurify

Never inject untrusted input into HTML

🟥 ROOM 3 — WEAK JWT SIGNATURE
🔥 Vulnerability

JWT tokens are signed with an extremely weak secret:

const WEAK_JWT_SECRET = "123";


This makes it trivial to forge tokens.

🎯 Goal

Forge a token with:

{
  "role": "master",
  "level": 3
}


and sign it using the same secret.

✅ Solution

Use any JWT editor (jwt.io / authorizer.dev / auth0 debugger)
with secret: 123

Or use this already signed valid token:

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoibWFzdGVyIiwibGV2ZWwiOjMsImlhdCI6MTc2NDkwMTEyNCwiZXhwIjoxNzY0OTA0NzI0fQ.KlPHVBnK4VquT5jAFXaFxs4PabBGysXaRF1DKVstDlw


Paste it into the form → Room 3 validated.

🛡️ How to Fix

Use long, random secrets (32+ chars)

Store secrets in environment variables

Enforce strong algorithms & token validation

🟪 ROOM 4 — SQL INJECTION
🔥 Vulnerability

Query is built unsafely:

const sql = `SELECT * FROM books WHERE title LIKE '%${q}%'`;


This enables SQL injection.

🎯 Goal

Dump all books and extract the secret note containing:

DARK-PORTAL-77

✅ Solution

Search for:

' OR 1=1 --


This returns all rows, including:

Mot de passe porte finale: DARK-PORTAL-77


Room 4 is completed.

🛡️ How to Fix

Use prepared statements:

db.all("SELECT * FROM books WHERE title LIKE ?", [`%${q}%`]);


Never concatenate SQL strings.

🟧 ROOM 5 — PATH TRAVERSAL
🔥 Vulnerability

Server reads files like:

const targetPath = path.join(baseDir, req.query.file);
fs.readFile(targetPath);


User can escape directories using ../.

🎯 Goal

Read any file, such as:

flag-room5.txt (inside /secret)

or escape and read app.js

✅ Solution A — Legit flag

Enter:

flag-room5.txt

✅ Solution B — Path traversal

Enter:

../app.js


This reads the server source code.
Room 5 is completed.

🛡️ How to Fix

Whitelist allowed filenames

Reject paths containing ../ or normalize and check boundaries

Never read files based solely on user input

🏆 FINAL ROOM — SUMMARY

Once all vulnerabilities are exploited, the player can access /final, which summarizes:

Each flaw

How it was exploited

Why it is dangerous

How to fix it

This final room acts as a learning report.