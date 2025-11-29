# Notebooks

This directory contains all Jupyter notebooks used for **data exploration**,
**prototype analytics**, and **development of the analytics package**.

Notebooks are committed to Git because they document the reasoning and
experimentation behind the code in `packages/analytics`.

---

## Running Notebooks

The notebooks run in a dedicated UV-managed Python environment located in:

## 1. Create a fresh UV-managed virtual environment

Inside the `notebooks/` directory:

```bash
uv venv
```

## 2. Install ipykernel inside this environment

```bash
uv pip install ipykernel
```

## 3. Register the Jupyter kernel

```bash
uv run python -m ipykernel install --user --name menuyukti-notebooks --display-name "menuyukti-notebooks"
```

## 4. Install the analytics package (editable mode)

```bash
uv pip install -e ../packages/analytics
```

## 5. Select the kernel in VS Code
