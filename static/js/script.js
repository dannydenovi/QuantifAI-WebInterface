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
            renderMetricsChart(result); // Display result in the chart
    
            // Programmatically open the modal
            const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
            resultModal.show();
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

/* document.getElementById('modelForm').addEventListener('submit', async (e) => {
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
            renderMetricsChart(result); // Display result in a table
        } else {
            alert('No response received. Please try again.');
        }
    } catch (error) {
        console.error('Error during submission:', error); // Log errors for debugging
        alert(`Error: ${error.message}`);
    } finally {
        hideLoadingSpinner(); // Hide loading spinner after the request completes
    }
}); */

let chartInstance = null; // Global variable to store the Chart.js instance
function renderMetricsChart(result) {
    // Extract metrics from the result
    const rawMetrics = result.metrics.raw_metrics || {};
    const quantizedMetrics = result.metrics.quantized_metrics || {};

    // Prepare labels for the chart
    const labels = ['Raw Model', 'Static (int8)', 'Static (float16)', 'Dynamic (int8)', 'Dynamic (float16)'];

    // Prepare the datasets, filtering out missing data
    const datasets = [];

    // Loss Data
    const lossData = [
        rawMetrics.loss,
        quantizedMetrics.static_quantization?.int8?.loss,
        quantizedMetrics.static_quantization?.float16?.loss,
        quantizedMetrics.dynamic_quantization?.int8?.loss,
        quantizedMetrics.dynamic_quantization?.float16?.loss
    ];
    if (lossData.some(value => value !== undefined && value !== null)) {
        datasets.push({
            label: 'Loss',
            data: lossData.map(value => value !== undefined && value !== null ? value : null),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
        });
    }

    // MSE Data
    const mseData = [
        rawMetrics.mse,
        quantizedMetrics.static_quantization?.int8?.mse,
        quantizedMetrics.static_quantization?.float16?.mse,
        quantizedMetrics.dynamic_quantization?.int8?.mse,
        quantizedMetrics.dynamic_quantization?.float16?.mse
    ];
    if (mseData.some(value => value !== undefined && value !== null)) {
        datasets.push({
            label: 'MSE',
            data: mseData.map(value => value !== undefined && value !== null ? value : null),
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
        });
    }

    // R² Data
    const r2Data = [
        rawMetrics.r2,
        quantizedMetrics.static_quantization?.int8?.r2,
        quantizedMetrics.static_quantization?.float16?.r2,
        quantizedMetrics.dynamic_quantization?.int8?.r2,
        quantizedMetrics.dynamic_quantization?.float16?.r2
    ];
    if (r2Data.some(value => value !== undefined && value !== null)) {
        datasets.push({
            label: 'R2',
            data: r2Data.map(value => value !== undefined && value !== null ? value : null),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
        });
    }

    // MAE Data
    const maeData = [
        rawMetrics.mae,
        quantizedMetrics.static_quantization?.int8?.mae,
        quantizedMetrics.static_quantization?.float16?.mae,
        quantizedMetrics.dynamic_quantization?.int8?.mae,
        quantizedMetrics.dynamic_quantization?.float16?.mae
    ];
    if (maeData.some(value => value !== undefined && value !== null)) {
        datasets.push({
            label: 'MAE',
            data: maeData.map(value => value !== undefined && value !== null ? value : null),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
        });
    }

    // Model Size Data
    const modelSizeData = [
        rawMetrics.model_size,
        quantizedMetrics.static_quantization?.int8?.model_size,
        quantizedMetrics.static_quantization?.float16?.model_size,
        quantizedMetrics.dynamic_quantization?.int8?.model_size,
        quantizedMetrics.dynamic_quantization?.float16?.model_size
    ];
    if (modelSizeData.some(value => value !== undefined && value !== null)) {
        datasets.push({
            label: 'Model Size (MB)',
            data: modelSizeData.map(value => value !== undefined && value !== null ? value : null),
            backgroundColor: 'rgba(255, 206, 86, 0.6)',
        });
    }

    // Remove datasets with only null or undefined values
    datasets.forEach(dataset => {
        dataset.data = dataset.data.filter(value => value !== null && value !== undefined);
    });

    // Remove the labels of the models that have no corresponding data
    const validLabels = labels.filter((_, index) => datasets.some(dataset => dataset.data[index] !== null && dataset.data[index] !== undefined));

    // Destroy the existing chart instance if it exists
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Get the canvas context
    const ctx = document.getElementById('metricsChart').getContext('2d');

    // Create a new Chart.js instance and store it in the global variable
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: validLabels, // Use filtered labels
            datasets: datasets, // Use dynamically created datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allow the chart to stretch based on container
            plugins: {
                legend: {
                    position: 'top', // Keep legend at the top for better visibility
                    labels: {
                        font: {
                            size: 14, // Larger font size for the legend
                        },
                    },
                },
                title: {
                    display: true,
                    text: 'Model Metrics Comparison',
                    font: {
                        size: 18, // Larger font size for the title
                        weight: 'bold',
                    },
                    padding: {
                        top: 10,
                        bottom: 30,
                    },
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Model Type',
                        font: {
                            size: 16, // Larger font size for axis label
                        },
                    },
                    ticks: {
                        font: {
                            size: 14, // Larger font size for tick labels
                        },
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'Value',
                        font: {
                            size: 16, // Larger font size for axis label
                        },
                    },
                    ticks: {
                        font: {
                            size: 14, // Larger font size for tick labels
                        },
                    },
                    beginAtZero: true,
                },
            },
        },
    });

    // Add the download button dynamically
    const modalBody = document.querySelector('.modal-body');

    // Remove existing download button to avoid duplicates
    const existingButton = document.getElementById('downloadButton');
    if (existingButton) {
        existingButton.remove();
    }

    // Create a new download button
    const downloadButton = document.createElement('button');
    downloadButton.id = 'downloadButton';
    downloadButton.classList.add('btn', 'btn-success', 'mt-3');
    downloadButton.textContent = 'Download ZIP File';

    // Set the download action
    downloadButton.onclick = () => {
        if (result.download_url) {
            window.location.href = result.download_url;
        } else {
            alert('Download URL not available');
        }
    };

    // Append the button below the chart
    modalBody.appendChild(downloadButton);
}