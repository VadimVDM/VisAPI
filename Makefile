.PHONY: python-setup python-clean

python-setup:
	@echo "[python-setup] Creating virtualenv at .venv"
	@test -d .venv || python3 -m venv .venv
	@echo "[python-setup] Installing Python dependencies"
	@.venv/bin/pip install --upgrade pip
	@.venv/bin/pip install --upgrade pyairtable bandit
	@echo "[python-setup] Done"

python-clean:
	@echo "[python-clean] Removing .venv"
	@rm -rf .venv
