// Helper function to handle file input changes
function handleFileInput(dropzoneId, inputId) {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(inputId);

    // Trigger file dialog on dropzone click
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle drag-and-drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.backgroundColor = '#e9ecef';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.backgroundColor = '';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.backgroundColor = '';
        const file = e.dataTransfer.files[0];
        dropzone.textContent = `Uploaded: ${file.name}`;
        fileInput.files = e.dataTransfer.files; // Assign dropped file to input

        if(inputId == "pythonFile"){
            // Remove the extension '.py' from the file name
            const fileNameWithoutExtension = file.name.replace(/\.py$/, '');

            // Find the input field and set its value
            const classNameInput = document.getElementById("model_class");
            if (classNameInput) {
                classNameInput.value = fileNameWithoutExtension;
            }
        }
    });

    // Handle file selection via file dialog
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            dropzone.textContent = `Uploaded: ${file.name}`;
            if(inputId == "pythonFile"){
                // Remove the extension '.py' from the file name
                const fileNameWithoutExtension = file.name.replace(/\.py$/, '');
    
                // Find the input field and set its value
                const classNameInput = document.getElementById("model_class");
                if (classNameInput) {
                    classNameInput.value = fileNameWithoutExtension;
                }
            }
        }
    });
}

// Initialize file input handlers
handleFileInput('testSetDropzone', 'testSetFile');
handleFileInput('trainingSetDropzone', 'trainingSetFile');
handleFileInput('pythonFileDropzone', 'pythonFile');
handleFileInput('modelFileDropzone', 'modelFile');

// Show and hide loading spinner
function showLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'flex';
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = 'none';
}
function populateModal(result) {
    const metricsContainer = document.getElementById('metricsContainer');
    const downloadList = document.getElementById('downloadList');

    metricsContainer.innerHTML = '';
    downloadList.innerHTML = '';

    // Add metrics if available
    if (result.raw_metrics || result.quantized_metrics) {
        const metricsTitle = document.createElement('h5');
        metricsTitle.textContent = 'Calculated Metrics';
        metricsContainer.appendChild(metricsTitle);

        if (result.raw_metrics) {
            const rawMetricsHeader = document.createElement('h6');
            rawMetricsHeader.textContent = 'Raw Model Metrics';
            metricsContainer.appendChild(rawMetricsHeader);

            for (const [key, value] of Object.entries(result.raw_metrics)) {
                const metric = document.createElement('p');
                metric.textContent = `${key}: ${value}`;
                metricsContainer.appendChild(metric);
            }
        }

        if (result.quantized_metrics) {
            const quantizedMetricsHeader = document.createElement('h6');
            quantizedMetricsHeader.textContent = 'Quantized Model Metrics';
            metricsContainer.appendChild(quantizedMetricsHeader);

            for (const [key, value] of Object.entries(result.quantized_metrics)) {
                const metric = document.createElement('p');
                metric.textContent = `${key}: ${value}`;
                metricsContainer.appendChild(metric);
            }
        }
    } else {
        const noMetrics = document.createElement('p');
        noMetrics.textContent = 'Here is your quantized model!';
        metricsContainer.appendChild
    }

    // Add download buttons if files are available
    if (result.download_urls.quantized_model) {
        const quantizedLink = document.createElement('a');
        quantizedLink.href = result.download_urls.quantized_model;
        quantizedLink.textContent = 'Download Quantized Model';
        quantizedLink.className = 'download-btn mt-3';
        downloadList.appendChild(quantizedLink);
    }

    if (result.download_urls.onnx_model) {
        const onnxLink = document.createElement('a');
        onnxLink.href = result.download_urls.onnx_model;
        onnxLink.textContent = 'Download ONNX Model';
        onnxLink.className = 'download-btn mt-3';
        downloadList.appendChild(onnxLink);
    }

    const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
    resultModal.show();
}
document.getElementById('modelForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = document.getElementById('modelForm');
    const formData = new FormData(form);

    // Append file inputs to the FormData
    ['testSetFile', 'trainingSetFile', 'pythonFile', 'modelFile'].forEach((fieldId) => {
        const fileInput = document.getElementById(fieldId);
        if (fileInput && fileInput.files[0]) {
            formData.append(fieldId, fileInput.files[0]);
        }
    });

    // Append quantization options to the FormData
    const staticQuantization = [];
    if (document.getElementById('staticQuantInt8').checked) staticQuantization.push('int8');
    if (document.getElementById('staticQuantFloat16').checked) staticQuantization.push('float16');
    if (staticQuantization.length > 0) {
        formData.append('staticQuantization', staticQuantization.join(','));
    }

    const dynamicQuantization = [];
    if (document.getElementById('dynamicQuantInt8').checked) dynamicQuantization.push('int8');
    if (document.getElementById('dynamicQuantFloat16').checked) dynamicQuantization.push('float16');
    if (dynamicQuantization.length > 0) {
        formData.append('dynamicQuantization', dynamicQuantization.join(','));
    }

    // Debug: Print formData as JSON
    const formDataJson = {};
    formData.forEach((value, key) => {
        if (value instanceof File) {
            formDataJson[key] = value.name; // Log file names
        } else {
            formDataJson[key] = value; // Log field values
        }
    });
    console.log('Form Data Sent:', JSON.stringify(formDataJson, null, 2));

    try {
        showLoadingSpinner(); // Show loading spinner before making the request

        const response = await fetch('/convert', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Failed to submit data');
        }

        const result = await response.json();
        if (result) {
            console.log('Server Response:', result); // Print server response for debugging
            populateModal(result); // Display result in modal
        } else {
            alert('No response received. Please try again.');
        }
    } catch (error) {
        console.error('Error during submission:', error); // Log errors for debugging
        alert(`Error: ${error.message}`);
    } finally {
        hideLoadingSpinner(); // Hide loading spinner after the request completes
    }
});
