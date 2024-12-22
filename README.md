# QuantifAI-WebInterface

This guide provides instructions for setting up and launching the QuantifAI Web Interface using Flask and Gunicorn.

---

## Install Dependencies

To ensure the environment is ready for the web interface, install the required Python packages:

```bash
pip install flask gunicorn requests
```

---

## Launch the Web Interface

Use **Gunicorn** to launch the Flask application with the desired configuration:

1. **Launch Command**:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 --timeout 5000 app:app
   ```

2. **Explanation of the Command**:
   - `-w 4`: Spawns 4 worker processes to handle incoming requests.
   - `-b 0.0.0.0:5000`: Binds the application to all network interfaces on port 5000, making it accessible on the local network.
   - `--timeout 5000`: Sets the timeout to 5000 seconds to allow for long-running requests.
   - `app:app`: Specifies the entry point for the Flask application (`app.py` file with `app` as the Flask application instance).

---

## Accessing the Interface

Once launched, the QuantifAI Web Interface will be available at:
```plaintext
http://<your-server-ip>:5000
```

Replace `<your-server-ip>` with the actual IP address of the machine running the application. If running locally, use:
```plaintext
http://127.0.0.1:5000
```

---

## Notes and Best Practices

- **Environment Isolation**: Use a virtual environment (`venv`) to isolate dependencies for the project.
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  pip install flask gunicorn requests
  ```

- **Production Configuration**:
  - Configure a reverse proxy (e.g., Nginx) for enhanced security and performance.
  - Use environment variables for sensitive configuration (e.g., API keys, database credentials).

- **Debugging**:
  - For development, use Flask's built-in server with `app.run(debug=True)` to enable debugging.
  - Avoid using Flask's built-in server in production as it is not designed for production workloads.
