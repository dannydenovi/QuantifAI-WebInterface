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

    // Combine staticQuantization options into a single string
    const staticQuantizationOptions = [];
    if (document.getElementById('staticQuantInt8').checked) staticQuantizationOptions.push('int8');
    if (document.getElementById('staticQuantFloat16').checked) staticQuantizationOptions.push('float16');
    if (staticQuantizationOptions.length > 0) {
        formData.set('staticQuantization', staticQuantizationOptions.join(',')); // Use `set` to ensure no duplicates
    }

    // Combine dynamicQuantization options into a single string
    const dynamicQuantizationOptions = [];
    if (document.getElementById('dynamicQuantInt8').checked) dynamicQuantizationOptions.push('int8');
    if (document.getElementById('dynamicQuantFloat16').checked) dynamicQuantizationOptions.push('float16');
    if (dynamicQuantizationOptions.length > 0) {
        formData.set('dynamicQuantization', dynamicQuantizationOptions.join(',')); // Use `set` to ensure no duplicates
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
            populateResultsTable(result); // Display result in a table
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

    // Combine staticQuantization options into a single string
    const staticQuantizationOptions = [];
    if (document.getElementById('staticQuantInt8').checked) staticQuantizationOptions.push('int8');
    if (document.getElementById('staticQuantFloat16').checked) staticQuantizationOptions.push('float16');
    if (staticQuantizationOptions.length > 0) {
        formData.set('staticQuantization', staticQuantizationOptions.join(',')); // Use `set` to ensure no duplicates
    }

    // Combine dynamicQuantization options into a single string
    const dynamicQuantizationOptions = [];
    if (document.getElementById('dynamicQuantInt8').checked) dynamicQuantizationOptions.push('int8');
    if (document.getElementById('dynamicQuantFloat16').checked) dynamicQuantizationOptions.push('float16');
    if (dynamicQuantizationOptions.length > 0) {
        formData.set('dynamicQuantization', dynamicQuantizationOptions.join(',')); // Use `set` to ensure no duplicates
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
            populateResultsTable(result); // Display result in a table
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

function populateResultsTable(result) {
    // Create a table to display the results
    const tableContainer = document.getElementById('resultsTableContainer');
    tableContainer.innerHTML = ''; // Clear any previous content

    const table = document.createElement('table');
    table.classList.add('table', 'table-striped'); // Add bootstrap styles for the table

    // Create table headers
    const headers = ['Model Type', 'Loss', 'MSE', 'R2', 'MAE', 'Model Size (MB)'];
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });

    // Create table body with the data from the response
    const tbody = table.createTBody();

    // Display the quantized model metrics
    if (result.quantized_metrics) {
        const quantizedMetrics = result.quantized_metrics.static_quantization;

        const quantizedModelData = [
            'Quantized Model',
            quantizedMetrics.int8 ? quantizedMetrics.int8.loss : 'N/A',
            quantizedMetrics.int8 ? quantizedMetrics.int8.mse : 'N/A',
            quantizedMetrics.int8 ? quantizedMetrics.int8.r2 : 'N/A',
            quantizedMetrics.int8 ? quantizedMetrics.int8.mae : 'N/A',
            result.quantized_model_size_mb || 'N/A',
        ];

        // Add the Quantized Model row to the table
        const quantizedRow = tbody.insertRow();
        quantizedModelData.forEach(data => {
            const cell = quantizedRow.insertCell();
            cell.innerHTML = data;
        });

        // Display Static Quantization for both int8 and float16
        const staticQuantData = [
            'Static Quantization (int8)',
            quantizedMetrics.int8 ? quantizedMetrics.int8.loss : 'N/A',
            quantizedMetrics.int8 ? quantizedMetrics.int8.mse : 'N/A',
            quantizedMetrics.int8 ? quantizedMetrics.int8.r2 : 'N/A',
            quantizedMetrics.int8 ? quantizedMetrics.int8.mae : 'N/A',
            result.quantized_model_size_mb || 'N/A',
        ];

        const staticQuantRow = tbody.insertRow();
        staticQuantData.forEach(data => {
            const cell = staticQuantRow.insertCell();
            cell.innerHTML = data;
        });

        // Display Dynamic Quantization for both int8 and float16
        const dynamicQuantData = [
            'Dynamic Quantization (int8)',
            quantizedMetrics.int8 ? quantizedMetrics.int8.loss : 'N/A',
            quantizedMetrics.int8 ? quantizedMetrics.int8.mse : 'N/A',
            quantizedMetrics.int8 ? quantizedMetrics.int8.r2 : 'N/A',
            quantizedMetrics.int8 ? quantizedMetrics.int8.mae : 'N/A',
            result.quantized_model_size_mb || 'N/A',
        ];

        const dynamicQuantRow = tbody.insertRow();
        dynamicQuantData.forEach(data => {
            const cell = dynamicQuantRow.insertCell();
            cell.innerHTML = data;
        });
    }

    // Add "Download zip file" button at the end of the table
    const downloadRow = tbody.insertRow();
    const downloadCell = downloadRow.insertCell();
    downloadCell.colSpan = headers.length; // Make the button span across all columns
    const downloadButton = document.createElement('button');
    downloadButton.classList.add('btn', 'btn-success');
    downloadButton.textContent = 'Download zip file';
    downloadButton.onclick = function () {
        window.location.href = result.download_urls['quantized_model']; // Assuming the URL points to the zip file
    };
    downloadCell.appendChild(downloadButton);

    // Append the table to the container
    tableContainer.appendChild(table);

    // Now show the modal with the results table
    const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
    resultModal.show();  // Show the modal after the table is populated
}