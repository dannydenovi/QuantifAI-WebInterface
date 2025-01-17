import os
import uuid
import time
from flask import Flask, request, jsonify, render_template, send_from_directory
import requests
import base64
import zipfile
import hashlib

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024 * 1024  # 5 GB

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/convert', methods=['POST'])
def convert():

    # Retrieve files and form data
    test_set_file = request.files.get('testSetFile')
    training_set_file = request.files.get('trainingSetFile')
    python_file = request.files.get('pythonFile')
    model_file = request.files.get('modelFile')

    print("form data", request.form)

    # Retrieve other form parameters
    model_class = request.form.get('model_class')
    batch_size = request.form.get('batch_size')
    num_batches = request.form.get('num_batches')
    static_quantization = request.form.get('staticQuantization')
    dynamic_quantization = request.form.get('dynamicQuantization')
    evaluate_metrics = request.form.get('evaluate_metrics')
    save_onnx = request.form.get('save_onnx')
    args = request.form.get('args')

    # Prepare JSON-compatible file data
    files_data = {}
    if test_set_file:
        files_data['testSetFile'] = {
            'filename': test_set_file.filename,
            'content': base64.b64encode(test_set_file.read()).decode('utf-8')
        }
    if training_set_file:
        files_data['trainingSetFile'] = {
            'filename': training_set_file.filename,
            'content': base64.b64encode(training_set_file.read()).decode('utf-8')
        }
    if python_file:
        files_data['pythonFile'] = {
            'filename': python_file.filename,
            'content': base64.b64encode(python_file.read()).decode('utf-8')
        }
    if model_file:
        files_data['modelFile'] = {
            'filename': model_file.filename,
            'content': base64.b64encode(model_file.read()).decode('utf-8')
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
    response_data = faas_response.json()

    # Create a dictionary to hold the paths and sizes for each model
    model_links = {}
    model_sizes = {}

    # Save quantized models from the response (if present)
    if "quantized_models" in response_data:
        for format, model_base64 in response_data["quantized_models"].items():
            if isinstance(model_base64, dict):  # If it's a dictionary, check for 'data' or correct key
                print(f"Model base64 is a dictionary, accessing the 'data' key.")
                model_base64 = model_base64.get('data', None)  # Adjust based on actual structure
            if model_base64:
                model_data = base64.b64decode(model_base64)  # Decode the base64 data
                model_filename = f"quantized_model_{format}.pth"
                model_path = os.path.join(UPLOAD_FOLDER, model_filename)
                with open(model_path, 'wb') as f:
                    f.write(model_data)
                model_links[model_filename] = f"/download/{model_filename}"
                model_sizes[model_filename] = len(model_data) / (1024 * 1024)  # Size in MB

    # Save ONNX model if present
    if "onnx_models" in response_data:
        for format, onnx_base64 in response_data["onnx_models"].items():
            if isinstance(onnx_base64, dict):  # If it's a dictionary, check for 'data' or correct key
                print(f"ONNX model base64 is a dictionary, accessing the 'data' key.")
                onnx_base64 = onnx_base64.get('data', None)  # Adjust based on actual structure
            if onnx_base64:
                onnx_data = base64.b64decode(onnx_base64)  # Decode the base64 data
                onnx_filename = "quantized_model.onnx"
                onnx_path = os.path.join(UPLOAD_FOLDER, onnx_filename)
                with open(onnx_path, 'wb') as f:
                    f.write(onnx_data)
                model_links[onnx_filename] = f"/download/{onnx_filename}"
                model_sizes[onnx_filename] = len(onnx_data) / (1024 * 1024)  # Size in MB

    # Return download links and sizes for individual models
    return jsonify({
        "model_links": model_links,
        "model_sizes": model_sizes
    })


# Flask route to serve individual model files when requested
@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    # Serve the file directly based on the filename
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
