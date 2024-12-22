# QuantifAI-WebInterface

Install dependencies:

```bash
pip install flask gunicorn requests

```

Launch with 

```bash
gunicorn -w 4 -b 0.0.0.0:5000 --timeout 5000 app:app
```
