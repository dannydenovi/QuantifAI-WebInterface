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


   # Output ZIP file name
    zip_file_name = f"{str(uuid.uuid4())}_models.zip"
    zip_file_path = os.path.join(UPLOAD_FOLDER, zip_file_name)

    # Directory to temporarily store decoded files
    output_dir = os.path.join(UPLOAD_FOLDER, "decoded_files")
    os.makedirs(output_dir, exist_ok=True)

    # Open ZIP file for writing
    with zipfile.ZipFile(zip_file_path, 'w') as zipf:
        # Iterate over the Base64 data in the response
        for quantization_type, models in response_data["quantized_model_base64"].items():
            # Extract the filetype (default to bin if not specified)
            filetype = models.get("filetype", "pth")
            for model_type, base64_string in models.items():
                if model_type == "filetype":
                    continue  # Skip the filetype entry
                
                # Decode the Base64 string
                decoded_data = base64.b64decode(base64_string)
                
                # Save the decoded data to a file
                file_name = f"{quantization_type}_{model_type}.{filetype}"
                file_path = os.path.join(output_dir, file_name)
                with open(file_path, 'wb') as f:
                    f.write(decoded_data)
                
                # Add the file to the ZIP archive
                zipf.write(file_path, arcname=file_name)

        #print the json schema from the response

        for quantization_type, models in response_data["onnx_base64"].items():
            # Extract the filetype (default to onnx if not specified)
            filetype = models.get("filetype", "onnx")
            for model_type, base64_string in models.items():
                if model_type == "filetype":
                    continue  # Skip the filetype entry

                # Decode the Base64 string
                decoded_data = base64.b64decode(base64_string)

                # Save the decoded data to a file
                file_name = f"{quantization_type}_{model_type}.{filetype}"
                file_path = os.path.join(output_dir, file_name)
                with open(file_path, 'wb') as f:
                    f.write(decoded_data)

                # Add the file to the ZIP archive
                zipf.write(file_path, arcname=file_name)


    # Clean up temporary directory (optional)
    for file_name in os.listdir(output_dir):
        os.remove(os.path.join(output_dir, file_name))
    os.rmdir(output_dir)

    print(f"ZIP file created: {zip_file_path}")

    # Return the metrics (both quantized and raw) along with the download URL
    return jsonify({
        "success": True,
        "metrics": {
            "quantized_metrics": response_data.get("quantized_metrics", {}),
            "raw_metrics": response_data.get("raw_metrics", {})
        },
        "download_url": f"/download/{zip_file_name}"
    })




# Flask route to serve individual model files when requested
@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    # Serve the ZIP file from the upload folder
    return send_from_directory(UPLOAD_FOLDER, filename, as_attachment=True)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
