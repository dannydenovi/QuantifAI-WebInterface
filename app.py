from flask import Flask, request, jsonify, render_template, send_file
import base64
import os
import requests

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024 * 1024  # 5 GB


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
        input_format = request.form.get('input_format')
        num_batches = request.form.get('num_batches')
        is_classification = request.form.get('is_classification')
        save_onnx = request.form.get('save_onnx')
        args = request.form.get('args')

        # Prepare JSON-compatible file data (Base64 encode the file content)
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
                'input_format': input_format,
                'num_batches': num_batches,
                'is_classification': is_classification,
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
                f.write(base64.b64decode(response_data["quantized_model_base64"]))

        # Save ONNX model if present
        if "onnx_base64" in response_data and response_data["onnx_base64"]:
            with open(onnx_model_path, "wb") as f:
                f.write(base64.b64decode(response_data["onnx_base64"]))

        # Prepare response
        download_urls = {"quantized_model": "/download/quantized"}
        if "onnx_base64" in response_data and response_data["onnx_base64"]:
            download_urls["onnx_model"] = "/download/onnx"

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

@app.route('/download/quantized')
def download_quantized():
    quantized_model_path = os.path.join(UPLOAD_FOLDER, "quantized_model.pth")
    if os.path.exists(quantized_model_path):
        return send_file(quantized_model_path, as_attachment=True)
    return jsonify({"error": "Quantized model not found"}), 404

@app.route('/download/onnx')
def download_onnx():
    onnx_model_path = os.path.join(UPLOAD_FOLDER, "quantized_model.onnx")
    if os.path.exists(onnx_model_path):
        return send_file(onnx_model_path, as_attachment=True)
    return jsonify({"error": "ONNX model not found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
