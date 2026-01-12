# Overleaf Resume Tailor

This project generates tailored LaTeX resume content from a Job Description (JD) and can optionally sync changes to an Overleaf project.

Important: the Overleaf project link is required for the generate/sync workflow.

## Quick setup

1. Create a virtual environment and install dependencies (Windows PowerShell):

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate
pip install -r requirements.txt
python app.py
```

2. Provide your OpenAI API key. You can either set it in your shell or put it in the `.env` file at the repo root.

PowerShell (temporary for session):

```powershell
$env:OPENAI_API_KEY = 'sk-...'
```

Or edit `.env` and fill `OPENAI_API_KEY=`.

3. Configure Overleaf connection

There are two modes to connect to Overleaf:

Mode B (recommended, safer) — Manual paste / returned LaTeX:
- The app will require you to supply the Overleaf project link when generating content, but will return the LaTeX for you to paste into Overleaf manually.

Mode A (opt-in) — Git sync (automated push):
- Overleaf exposes a git remote for each project. To use auto-sync from the server you must:
  1. Create a local clone of your Overleaf project (on the same machine where the server runs):
     - In Overleaf: open your project & go to Menu -> Git -> Clone with HTTPS. The URL will be something like `https://git.overleaf.com/project/<project-id>`.
     - Overleaf will ask you for a project-specific git password (they provide instructions). Use that when cloning.
  2. Clone locally:

```powershell
# example
git clone https://git.overleaf.com/project/<project-id> C:\path\to\overleaf-clone
```

  3. Set the `OVERLEAF_PATH` value in `backend/app.py` to the absolute path of that clone, or set it in `.env` and modify the code to read it.
  4. When you click Sync in the UI, the server will write the target file, `git add`/`commit` and `push` to Overleaf.

Security note: the app currently expects the local clone to exist on the server (`OVERLEAF_PATH`). It does not accept long-lived credentials via API. If you'd like a mode where the server accepts a one-time token to push to Overleaf, we can implement a temporary-token flow — but do so carefully.

## How to use

1. Start the backend server:

```powershell
cd 'C:\Users\asus\Desktop\mcp_overlead\backend'
python app.py
```

2. Open http://127.0.0.1:5000/ in a browser.
3. Enter the Overleaf project link (required), the target LaTeX file (e.g. `resume.tex`), paste the JD, and click Generate.
4. The generated LaTeX will appear in the LaTeX output box. You can copy-paste it into Overleaf or click Sync if you configured `OVERLEAF_PATH`.
5. Use the Chat box to request tweaks (e.g., "shorten bullet points"), and it will return suggested LaTeX edits.

## Notes & troubleshooting

- Make sure the OpenAI API key is set and valid.
- If you use Git sync, ensure the local clone in `OVERLEAF_PATH` has the correct remote and you can push from the server machine.
- If the server cannot push (auth error), the API will return an error and you can still copy the LaTeX manually.

## Next improvements you can request

- Accept one-time Overleaf git credentials in the UI (secure ephemeral usage).
- Use a database for KB instead of `backend/kb.json`.
- Add tests and CI.
- Add prettier LaTeX preview or direct PDF generation.
