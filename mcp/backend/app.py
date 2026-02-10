#type: ignore
import os
import json
import openai
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import subprocess
from typing import List, Optional
from dotenv import load_dotenv
import requests

# Serve static frontend files from ../frontend
BASE_DIR = os.path.dirname(__file__)
FRONTEND_DIR = os.path.normpath(os.path.join(BASE_DIR, '..', 'frontend'))

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)  # Enable CORS for all routes

# Load KB using an absolute path so the app can be started from repo root
KB_PATH = os.path.join(BASE_DIR, 'kb.json')
if os.path.exists(KB_PATH):
    with open(KB_PATH, 'r', encoding='utf-8') as f:
        KB = json.load(f)
else:
    KB = {"experiences": []}

# load .env from repo root (if present)
load_dotenv(os.path.normpath(os.path.join(BASE_DIR, '..', '.env')))

openai.api_key = os.getenv("OPENAI_API_KEY")

# Read Overleaf path and token from environment (or .env). Keep empty unless configured.
OVERLEAF_PATH = os.getenv('OVERLEAF_PATH') or ''
OVERLEAF_GIT_TOKEN = os.getenv('OVERLEAF_GIT_TOKEN') or ''


def _get_json():
    """Safely get JSON body from request."""
    data = request.get_json(silent=True)
    return data or {}


def call_llm_chat(messages: List[dict], model: str = 'gpt-3.5-turbo') -> str:
    """Call OpenAI ChatCompletion and return assistant text.

    Uses the ChatCompletion API to get the assistant response. Keeps this
    small so it can be swapped for a different provider easily.
    """
    if not openai.api_key:
        raise RuntimeError('OPENAI_API_KEY not set')

    resp = openai.ChatCompletion.create(
        model=model,
        messages=messages,
        max_tokens=800,
        temperature=0.6,
    )
    # Extract assistant content
    return resp['choices'][0]['message']['content'].strip()


def _strip_md_fences(text: str) -> str:
    # Remove triple-backtick fences if present
    if text.startswith('```'):
        # remove leading ``` and optional language
        first = text.find('\n')
        if first != -1:
            text = text[first+1:]
    if text.endswith('```'):
        text = text[:-3]
    return text.strip()


@app.route("/generate", methods=["POST"])
def generate():
    data = _get_json()
    jd = (data.get('jd') or '').strip()
    overleaf_link = (data.get('overleaf_link') or '').strip()
    target_file = data.get('target_file') or 'resume.tex'

    # Overleaf link is required for this workflow
    if not overleaf_link:
        return jsonify({'error': 'overleaf_link is required'}), 400

    if not jd:
        return jsonify({'error': 'jd is required'}), 400

    # Find relevant KB entries (simple contains match)
    relevant = []
    for entry in KB.get('experiences', []):
        skills = entry.get('skills', []) or []
        if any(sk.lower() in jd.lower() for sk in skills):
            relevant.append(entry.get('description'))

    system = (
        "You are an assistant that edits LaTeX resumes. "
        "Given a job description and a set of relevant experience snippets, produce LaTeX code suitable for direct insertion into the target file. "
        "Return ONLY LaTeX code (no explanation)."
    )

    user = (
        f"Job Description:\n{jd}\n\nRelevant experiences:\n{json.dumps(relevant, ensure_ascii=False, indent=2)}\n\n"
        f"Target file: {target_file}\n"
        "Provide the LaTeX sections or content to replace or insert."
    )

    try:
        assistant = call_llm_chat([
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': user}
        ])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    latex = _strip_md_fences(assistant)
    print("\n" + "="*60)
    print("GENERATED LATEX:")
    print("="*60)
    print(latex)
    print("="*60 + "\n")
    return jsonify({'latex': latex, 'synced': False, 'message': 'Generated LaTeX (not synced)'}), 200


@app.route('/chat', methods=['POST'])
def chat():
    data = _get_json()
    msg = (data.get('msg') or '').strip()
    context_latex = data.get('latex') or ''
    if not msg:
        return jsonify({'error': 'msg is required'}), 400

    system = "You are a friendly assistant that suggests edits for a LaTeX resume. Return only LaTeX or a short description followed by LaTeX if needed."
    user = f"User request: {msg}\nContext LaTeX: {context_latex[:2000]}"

    try:
        assistant = call_llm_chat([
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': user}
        ])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({'suggestion': _strip_md_fences(assistant)})


@app.route('/kb', methods=['GET', 'POST'])
def kb_endpoint():
    if request.method == 'GET':
        return jsonify(KB)

    # POST: add an experience entry
    data = _get_json()
    entry = data.get('entry')
    if not entry:
        return jsonify({'error': 'entry required'}), 400
    KB.setdefault('experiences', []).append(entry)
    # persist to disk
    with open(KB_PATH, 'w', encoding='utf-8') as f:
        json.dump(KB, f, ensure_ascii=False, indent=2)
    return jsonify({'message': 'ok', 'entry': entry}), 201


@app.route("/update_overleaf", methods=["POST"])
def update_overleaf():
    data = _get_json()
    jd = (data.get('jd') or '').strip()
    target_file = data.get('file') or 'resume.tex'
    overleaf_link = (data.get('overleaf_link') or '').strip()

    # Overleaf link is required for update/sync operations
    if not overleaf_link:
        return jsonify({'error': 'overleaf_link is required'}), 400

    # Use similar generation flow as /generate if jd provided
    relevant_entries = []
    if jd:
        for entry in KB.get('experiences', []):
            if any(skill.lower() in jd.lower() for skill in entry.get('skills', []) or []):
                relevant_entries.append(entry.get('description'))

        system = (
            "You are an assistant that edits LaTeX resumes. Return only LaTeX code suitable for insertion."
        )
        user = f"Job Description:\n{jd}\nRelevant experiences:\n{json.dumps(relevant_entries, ensure_ascii=False)}"
        try:
            assistant = call_llm_chat([
                {'role': 'system', 'content': system},
                {'role': 'user', 'content': user}
            ])
        except Exception as e:
            return jsonify({'error': str(e)}), 500

        modified_latex = _strip_md_fences(assistant)
    else:
        modified_latex = data.get('latex') or ''

    print("\n" + "="*60)
    print("GENERATED LATEX (update_overleaf):")
    print("="*60)
    print(modified_latex)
    print("="*60 + "\n")

    # If an Overleaf git path is configured, attempt to write & push. Otherwise return LaTeX.
    if overleaf_link:
        # For server-side sync, require a local clone path be configured
        if not OVERLEAF_PATH:
            return jsonify({'error': 'Server OVERLEAF_PATH not configured; cannot auto-sync'}), 400
        if not os.path.exists(OVERLEAF_PATH):
            return jsonify({'error': 'LOCAL OVERLEAF_PATH does not exist on server'}, 400)

        # If a git token is available, temporarily set the origin remote to include it
        # Parse project id from the provided overleaf_link (expect .../project/<id>)
        project_id = None
        try:
            parts = overleaf_link.rstrip('/').split('/')
            project_id = parts[-1]
        except Exception:
            project_id = None

        file_path = os.path.join(OVERLEAF_PATH, target_file)
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(modified_latex)

            # If a token is configured and we were able to parse project id, set remote to include token
            if OVERLEAF_GIT_TOKEN and project_id:
                # Construct git over https remote with token (do not log or persist the token elsewhere)
                remote_url = f"https://{OVERLEAF_GIT_TOKEN}@git.overleaf.com/project/{project_id}"
                subprocess.run(["git", "-C", OVERLEAF_PATH, "remote", "set-url", "origin", remote_url], check=True)

            subprocess.run(["git", "-C", OVERLEAF_PATH, "add", target_file], check=True)
            subprocess.run(["git", "-C", OVERLEAF_PATH, "commit", "-m", "AI updated resume"], check=True)
            subprocess.run(["git", "-C", OVERLEAF_PATH, "push"], check=True)
        except subprocess.CalledProcessError as e:
            return jsonify({'error': str(e)}), 500

        return jsonify({'message': 'Overleaf resume updated successfully', 'synced': True})

    # No sync requested / possible — return LaTeX for user to paste
    return jsonify({'latex': modified_latex, 'synced': False})



@app.route('/api/ollama/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def ollama_proxy(path):
    ollama_url = f'http://localhost:11434/api/{path}'
    if request.method == 'GET':
        resp = requests.get(ollama_url)
    else:
        resp = requests.post(ollama_url, json=request.get_json())
    return jsonify(resp.json()), resp.status_code


@app.route('/')
def index():
    # Serve the frontend index.html
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    app.run(debug=True, port=5000)
