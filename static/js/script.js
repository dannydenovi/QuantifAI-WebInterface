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
    
    if (result.metrics.quantized_metrics == null && result.metrics.raw_metrics == null) {
        // Hide the chart if no metrics are available
        const canvas = document.getElementById('metricsChart');
        canvas.style.display = 'none';

        return;
    }

    const rawMetrics = result.metrics.raw_metrics || {};
    const quantizedMetrics = result.metrics.quantized_metrics || {};


    // Prepare labels dynamically based on the available data
    const labels = [];
    const quantizationLabels = {
        raw: 'Raw Model',
        static_int8: 'Static (int8)',
        static_float16: 'Static (float16)',
        dynamic_int8: 'Dynamic (int8)',
        dynamic_float16: 'Dynamic (float16)',
    };

    if (rawMetrics) labels.push(quantizationLabels.raw);
    if (quantizedMetrics.static_quantization?.int8) labels.push(quantizationLabels.static_int8);
    if (quantizedMetrics.static_quantization?.float16) labels.push(quantizationLabels.static_float16);
    if (quantizedMetrics.dynamic_quantization?.int8) labels.push(quantizationLabels.dynamic_int8);
    if (quantizedMetrics.dynamic_quantization?.float16) labels.push(quantizationLabels.dynamic_float16);

    console.log("Labels Generated:", labels);

    const datasets = [];

    // Function to add datasets for specific metrics
    function addDataset(label, metricKey, color) {
        const data = labels.map((lbl) => {
            if (lbl === quantizationLabels.raw) return rawMetrics[metricKey] || 0;
            if (lbl === quantizationLabels.static_int8)
                return quantizedMetrics.static_quantization?.int8?.[metricKey] || 0;
            if (lbl === quantizationLabels.static_float16)
                return quantizedMetrics.static_quantization?.float16?.[metricKey] || 0;
            if (lbl === quantizationLabels.dynamic_int8)
                return quantizedMetrics.dynamic_quantization?.int8?.[metricKey] || 0;
            if (lbl === quantizationLabels.dynamic_float16)
                return quantizedMetrics.dynamic_quantization?.float16?.[metricKey] || 0;
            return 0; // Default value for undefined metrics
        });

        console.log(`Dataset for ${label} (${metricKey}):`, data);

        // Add the dataset only if there is valid data
        if (data.some(value => value !== undefined && value !== null)) {
            datasets.push({
                label: label,
                data: data,
                backgroundColor: color,
            });
        }
    }
    // Add datasets for metrics
    if (result.metrics.raw_metrics.loss){
        addDataset('Loss', 'loss', 'rgba(75, 192, 192, 0.6)');
    }

    if (result.metrics.raw_metrics.accuracy) {
        addDataset('Accuracy', 'accuracy', 'rgba(255, 159, 64, 0.6)');
    }

    if (result.metrics.raw_metrics.r2) {
        addDataset('R2 Score', 'r2', 'rgba(54, 162, 235, 0.6)');
    }

    if (result.metrics.raw_metrics.mse) {
        addDataset('MSE', 'mse', 'rgba(255, 99, 132, 0.6)');
    }

    if (result.metrics.raw_metrics.mae) {
        addDataset('MAE', 'mae', 'rgba(153, 102, 255, 0.6)');
    }


    addDataset('Model Size (MB)', 'model_size', 'rgba(255, 206, 86, 0.6)'); 

    console.log("Final Datasets for Chart:", datasets);

    if (chartInstance) chartInstance.destroy();

    const ctx = document.getElementById('metricsChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Model Metrics Comparison' },
                tooltip: {
                    callbacks: {
                        label: function(tooltipItem) {
                            // Get the label and value
                            const datasetLabel = tooltipItem.dataset.label || '';
                            const value = tooltipItem.raw;
    
                            // Return the label and full value
                            return `${datasetLabel}: ${value.toLocaleString(undefined, { maximumFractionDigits: 20 })}`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Model Type' } },
                y: {
                    title: { display: true, text: 'Value' },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString(undefined, { maximumFractionDigits: 20 });
                        }
                    }
                },
            },
        }
    });
     // Add the download button dynamically
     const modalBody = document.querySelector('.modal-body');

     // Add chart to the modal
    const chartCanvas = document.getElementById('metricsChart');
    chartCanvas.style.display = 'block';

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

