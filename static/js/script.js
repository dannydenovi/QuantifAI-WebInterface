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
    });

    // Handle file selection via file dialog
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            dropzone.textContent = `Uploaded: ${file.name}`;
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

// Form submission handler
document.getElementById('modelForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = document.getElementById('modelForm');
    const formData = new FormData(form);

    // Append file inputs to the FormData
    if (document.getElementById('testSetFile').files[0]) {
        formData.append('testSetFile', document.getElementById('testSetFile').files[0]);
    }
    if (document.getElementById('trainingSetFile').files[0]) {
        formData.append('trainingSetFile', document.getElementById('trainingSetFile').files[0]);
    }
    if (document.getElementById('pythonFile').files[0]) {
        formData.append('pythonFile', document.getElementById('pythonFile').files[0]);
    }
    if (document.getElementById('modelFile').files[0]) {
        formData.append('modelFile', document.getElementById('modelFile').files[0]);
    }

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
            populateModal(result);
        } else {
            alert('No response received. Please try again.');
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        hideLoadingSpinner(); // Hide loading spinner after the request completes
    }
});
