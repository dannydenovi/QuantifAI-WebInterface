import os
import uuid
import time
from collections import defaultdict
from flask import Flask, request, jsonify, render_template, send_file
import requests

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024 * 1024  # 5 GB

# Temporary storage for tokens
DOWNLOAD_TOKENS = defaultdict(dict)

TOKEN_LIFETIME = 300  # 5 minutes

def generate_download_token(file_type):
    token = str(uuid.uuid4())
    expiry = time.time() + TOKEN_LIFETIME
    DOWNLOAD_TOKENS[token] = {"file_type": file_type, "expiry": expiry}
    return token


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/convert', methods=['POST'])
def convert():
    try:
        # Retrieve files and form data
        test_set_file = request.files.get('testSetFile')
        training_set_file = request.files.get('trainingSetFile')
        python_file = request.files.get('pythonFile')
        model_file = request.files.get('modelFile')

        # Retrieve other form parameters
        model_class = request.form.get('model_class')
        batch_size = request.form.get('batch_size')
        num_batches = request.form.get('num_batches')
        static_quantization = request.form.get('static_quantization')
        dynamic_quantization = request.form.get('dynamic_quantization')
        evaluate_metrics = request.form.get('evaluate_metrics')
        save_onnx = request.form.get('save_onnx')
        args = request.form.get('args')

        # Prepare JSON-compatible file data
        files_data = {}
        if test_set_file:
            files_data['testSetFile'] = {
                'filename': test_set_file.filename,
                'content': test_set_file.read()
            }
        if training_set_file:
            files_data['trainingSetFile'] = {
                'filename': training_set_file.filename,
                'content': training_set_file.read()
            }
        if python_file:
            files_data['pythonFile'] = {
                'filename': python_file.filename,
                'content': python_file.read()
            }
        if model_file:
            files_data['modelFile'] = {
                'filename': model_file.filename,
                'content': model_file.read()
            }

        # Combine files data with form parameters
        request_data = {
            'form': {
                'model_class': model_class,
                'batch_size': batch_size,
                'num_batches': num_batches,
                'static_quantization': static_quantization,
                'dynamic_quantization': dynamic_quantization,
                'evaluate_metrics': evaluate_metrics,
                'save_onnx': save_onnx,
                'args': args
            },
            'files': files_data
        }

        # Forward the request to the OpenFaaS function
        openfaas_function_url = 'http://127.0.0.1:8080/function/quantifai-faas'
        faas_response = requests.post(openfaas_function_url, json=request_data, timeout=5000)
        faas_response.raise_for_status()

        # Process the response from OpenFaaS
        response_data = faas_response.json()
        quantized_model_path = os.path.join(UPLOAD_FOLDER, "quantized_model.pth")
        onnx_model_path = os.path.join(UPLOAD_FOLDER, "quantized_model.onnx")

        # Save quantized model
        if "quantized_model_base64" in response_data and response_data["quantized_model_base64"]:
            with open(quantized_model_path, "wb") as f:
                f.write(response_data["quantized_model_base64"])

        # Save ONNX model if present
        if "onnx_base64" in response_data and response_data["onnx_base64"]:
            with open(onnx_model_path, "wb") as f:
                f.write(response_data["onnx_base64"])

        # Generate secure download tokens
        quantized_token = generate_download_token("quantized_model")
        onnx_token = generate_download_token("onnx_model") if "onnx_base64" in response_data else None

        # Prepare download URLs with tokens
        download_urls = {
            "quantized_model": f"/download/{quantized_token}"
        }
        if onnx_token:
            download_urls["onnx_model"] = f"/download/{onnx_token}"

        return jsonify({
            "download_urls": download_urls,
            "raw_metrics": response_data.get("raw_metrics"),
            "quantized_metrics": response_data.get("quantized_metrics"),
            "raw_model_size_mb": response_data.get("raw_model_size_mb"),
            "quantized_model_size_mb": response_data.get("quantized_model_size_mb")
        })
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "Failed to send request to OpenFaaS", "details": str(e)}), 500
    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@app.route('/download/<token>')
def secure_download(token):
    file_info = DOWNLOAD_TOKENS.get(token)
    
    if not file_info:
        return jsonify({"error": "Invalid or expired token"}), 404
    
    # Check for token expiry
    if time.time() > file_info["expiry"]:
        del DOWNLOAD_TOKENS[token]
        return jsonify({"error": "Token has expired"}), 403
    
    file_type = file_info["file_type"]
    file_path = os.path.join(UPLOAD_FOLDER, f"{file_type}.pth" if file_type == "quantized_model" else f"{file_type}.onnx")
    
    if os.path.exists(file_path):
        # Remove the token to prevent reuse
        del DOWNLOAD_TOKENS[token]
        return send_file(file_path, as_attachment=True)
    
    return jsonify({"error": f"{file_type.replace('_', ' ').capitalize()} not found"}), 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
