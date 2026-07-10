# sentence-bank OCR service

A small [FastAPI](https://fastapi.tiangolo.com/) service that extracts text from images for
the sentence-bank **Capture** feature. It runs [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
as the primary engine (Japanese + English + page layout) and uses
[manga-ocr](https://github.com/kha-white/manga-ocr) as a **confidence-based rescue**: any Japanese
block PaddleOCR reads with low confidence is cropped and re-read by manga-ocr, keeping the better
result.

Because OCR is CPU/RAM-hungry and the app is deployed on a Raspberry Pi, this service is designed to
run on a **separate, memory-rich machine on the same LAN** (e.g. a Windows desktop). The Pi's
middleware proxies each image here via the `OCR_SERVICE_URL` environment variable.

- **Footprint:** models are ~450 MB on disk and use ~800 MB RAM. CPU-only is fine (a few seconds per
  image); a GPU speeds it up but is not required.
- **Dependency:** captures only work while this machine is **awake and reachable** on the LAN.

---

## Windows setup tutorial

### 1. Install Python

Install **Python 3.10 or 3.11** from [python.org](https://www.python.org/downloads/) (tick *"Add
python.exe to PATH"* during install). Avoid the very newest Python release — PaddlePaddle/PyTorch
wheels often lag behind it. Verify in a new terminal:

```powershell
python --version
```

### 2. Get the code

Copy or clone this repository onto the Windows machine, then open a terminal in this folder:

```powershell
cd path\to\sentence-bank\ocr-service
```

### 3. Create and activate a virtual environment

```powershell
python -m venv .venv
.venv\Scripts\activate
```

Your prompt should now be prefixed with `(.venv)`. (In PowerShell, if activation is blocked, run
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then retry.)

### 4. Install dependencies

```powershell
pip install -r requirements.txt
```

> The **first run** downloads the PaddleOCR and manga-ocr models (a few hundred MB). This is a
> one-time download; models are cached for subsequent runs.

### 5. Choose a port

Other services may run on this machine, so pick a free port. Copy the env template and edit it:

```powershell
copy .env.example .env
notepad .env      # set OCR_PORT to a free port, e.g. 8422
```

Check a port is free before using it:

```powershell
netstat -ano | findstr :8422
```

No output means the port is available. Leave `OCR_HOST=0.0.0.0` so the Pi can reach the service.

### 6. Run the service

```powershell
python server.py
```

On startup it loads both models, then listens on the port you chose. Confirm it's alive (replace the
port if you changed it):

```powershell
curl http://localhost:8422/health
# {"status":"ok"}
```

### 7. Open the firewall for the LAN

Allow inbound connections on your port so the Raspberry Pi can reach it. In an **Administrator**
PowerShell (match the port to your `OCR_PORT`):

```powershell
New-NetFirewallRule -DisplayName "sentence-bank OCR" -Direction Inbound -Protocol TCP -LocalPort 8422 -Action Allow
```

### 8. Find this machine's LAN IP

```powershell
ipconfig
```

Note the **IPv4 Address** (e.g. `192.168.1.50`). The Raspberry Pi's middleware then uses:

```
OCR_SERVICE_URL=http://192.168.1.50:8422
```

(Set that in `packages/middleware/.env` — the port must match `OCR_PORT` here.)

### 9. Keep it running (optional but recommended)

So captures work without manually launching the service, run it at startup. Two easy options:

- **Task Scheduler:** create a *Basic Task* → trigger *"When the computer starts"* → action *Start a
  program* → `path\to\.venv\Scripts\python.exe` with argument `path\to\ocr-service\server.py` and
  *Start in* set to the `ocr-service` folder.
- **[NSSM](https://nssm.cc/):** install it as a proper Windows service pointing at the same
  `python.exe` + `server.py`.

### 10. Smoke test & troubleshooting

From the Pi (or any machine on the LAN), send a sample image:

```bash
curl -F file=@sample-jp.jpg http://192.168.1.50:8422/ocr
```

You should get JSON with `blocks` and `fullText`; low-confidence Japanese blocks report
`"engine": "manga-ocr"`.

| Symptom | Fix |
|---|---|
| `OSError: [WinError 10048] address already in use` | Port taken — pick another `OCR_PORT` (step 5). |
| Pi can't connect, but `localhost` works on Windows | Firewall rule missing (step 7) or wrong IP (step 8); confirm `OCR_HOST=0.0.0.0`. |
| First request hangs for a while | One-time model download/warm-up; subsequent requests are fast. |
| `pip install` fails on paddlepaddle | Use Python 3.10/3.11 (step 1); newest Python may lack wheels. |

---

## API

- `GET /health` → `{ "status": "ok" }`
- `POST /ocr` (multipart form field `file`) → `{ "blocks": [{ text, bbox, confidence, lang, engine }], "fullText": string }`

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `OCR_PORT` | `8000` | Port the service binds. Change to avoid collisions. |
| `OCR_HOST` | `0.0.0.0` | Bind address; keep `0.0.0.0` for LAN access. |
| `OCR_CONFIDENCE_THRESHOLD` | `0.8` | Japanese blocks below this are re-read by manga-ocr. |
