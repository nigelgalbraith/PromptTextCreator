# PromptTextCreator

PromptTextCreator is a local, Docker-based text generation tool built around Ollama.

It allows you to define structured prompt profiles, generate text using a local LLM, and optionally convert output to speech using Piper TTS.

The design goal is simple:
- keep everything local
- keep profiles JSON-driven
- avoid hardcoded prompts
- keep the stack minimal and understandable

---

## What It Does

- Runs a local LLM using Ollama (default: phi3)
- Uses profile-driven prompt templates
- Generates structured text based on form input
- Allows profile editing and exporting
- Optional text-to-speech playback (Piper)
- Runs entirely through Docker Compose

Two main UI pages:

1. Generator page
   - Fill in fields
   - Select options
   - Generate text
   - Copy or export output

2. Profile Builder page
   - Edit form fields
   - Edit prompt template
   - Configure checklist groups
   - Configure model settings
   - Export profile JSON

---

## Architecture

Services defined in `docker-compose.yml`:

- web (Nginx)
  - Serves the UI
  - Proxies API requests if needed

- ollama
  - Hosts the LLM API
  - Exposes port 11434

- ollama-init
  - Pulls the default model (phi3) on first startup

- piper (optional)
  - Text-to-speech service

The browser only interacts with the web container.

---

## Requirements

- Docker
- Docker Compose v2

---

## Run

Start the stack using the helper script:

```bash
./manage.sh

