// Copyright (c) 2025, Ashish and contributors
// For license information, please see license.txt

frappe.query_reports["Survey Report"] = {
    "filters": [
        {
            "fieldname": "project_title",
            "label": __("Project"),
            "fieldtype": "Link",
            "options": "Research Template",
            "default": null,  // Set default to null for an empty selection
            "reqd": 1,
            "on_change": function() {
                let selected_template = frappe.query_report.get_filter_value('project_title');
                if (selected_template) {
                    // When project_title changes, fetch dimensions for the dimensions filter
                    frappe.call({
                        method: "frappe.client.get_list",
                        args: {
                            doctype: "Dimensions",
                            filters: {
                                parent: selected_template
                            },
                            fields: ["dimensions"],
                            parent: "Research Template"
                        },
                        callback: function(response) {
                            if(response.message) {
                                // Get unique dimensions
                                let options = ["All Indicators"];
                            
                                // Get unique dimensions
                                let dimensions = response.message.map(d => d.dimensions);
                                let unique_dimensions = [...new Set(dimensions)];

                                // Combine empty option with unique dimensions
                                options = options.concat(unique_dimensions);
                                
                                // Update the dimensions filter options
                                frappe.query_report.get_filter('dimension').df.options = options;
                                frappe.query_report.get_filter('dimension').refresh();
                                
                                // Refresh the report
                                frappe.query_report.refresh();
                            }
                        }
                    });
                }
            }
        },
        {
            "fieldname": "dimension",
            "label": __("Dimensions"),
            "fieldtype": "Select",  // Changed from Link to Select
            "options": "",  // Will be populated dynamically
            "reqd": 0,
            "on_change": function() {
                let selected_dimension = frappe.query_report.get_filter_value('dimension');
                if (selected_dimension) {
                    frappe.query_report.refresh();
                }
            }
        },
        {
            "fieldname": "gwgi",
            "label": __("GWGI"),
            "fieldtype": "Select",  // Changed from Link to Select
            "options": ["No Filter", "GWGI"],  // Will be populated dynamically
            "reqd": 0,
            "on_change": function() {
                let selected_dimension = frappe.query_report.get_filter_value('gwgi');
                if (selected_dimension) {
                    // Set the dimension filter to "All Indicators"
                    frappe.query_report.set_filter_value('dimension', "All Indicators");
                    frappe.query_report.refresh();
                }
            }
        }
    ],
    "onload": function(report) {

        console.log(report)
        // Fetch available Research Templates for dropdown
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Research Template",
                fields: ["name", "project_title"],
                limit_page_length: 500
            },
            callback: function(r) {
                // If templates found, set the first one as default
                if (r.message && r.message.length > 0) {
                    frappe.query_report.set_filter_value('project_title', r.message[0].name);
                }
            }
        });

        let chart_container = `
            <div style="width: 600px; height: 500px; margin: 20px auto;">
                <canvas id="radarChart"></canvas>
            </div>`;
        $(report.page.main).prepend(chart_container);

        // Load Chart.js from CDN and render chart
        frappe.require("https://cdn.jsdelivr.net/npm/chart.js", function() {
            console.log("Chart.js loaded successfully");

            let radarChart = null;

            // Define chart colors
            const chartColors = [
                {
                    bg: "rgba(124, 214, 253, 0.3)", 
                    border: "rgba(124, 214, 253, 1)"
                },
                {
                    bg: "rgba(116, 62, 226, 0.3)", 
                    border: "rgba(116, 62, 226, 1)"
                }
            ];

            // Format indicator name for display
            function formatIndicatorName(fieldName) {
                // Extract the indicator name and variable number
                let match = fieldName.match(/^variable(\d+)(.+)$/);
                
                if (!match) return fieldName;
                
                let variableNum = match[1];
                let indicatorName = match[2];
                
                // Format indicator name: convert camelCase to Title Case
                let formattedName = indicatorName
                    .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
                    .replace(/^./, function(str) { return str.toUpperCase(); })  // Capitalize first letter
                    .trim();
                
                // Add "Indicator" prefix if the name starts with "Ind" followed by a number
                if (formattedName.match(/^Ind\s*\d+$/)) {
                    formattedName = formattedName.replace(/^Ind\s*(\d+)$/, 'Indicator $1');
                }
                
                // Return formatted name with variable number
                return formattedName + ' Variable ' + variableNum;
            }

            // Function to identify variable pairs from a data object
            function identifyVariablePairs(dataObject) {
                let variablePairs = [];
                let processedIndicators = new Set();
                
                // Find all fields that start with 'variable'
                for (let key in dataObject) {
                    if (key.match(/^variable\d+/) && !processedIndicators.has(key)) {
                        processedIndicators.add(key);
                        
                        variablePairs.push({
                            field: key,
                            label: formatIndicatorName(key),
                            value: dataObject[key] || 0
                        });
                    }
                }
                
                return variablePairs;
            }

            // Function to render or update the chart
            function renderChart(data) {
                console.log(data)
                if (!data) {
                    console.log("Not enough data to render chart (need at least 3 items)");
                    frappe.msgprint("Not enough data available to display the chart.");
                    return;
                }
                
                // Get the third-last data object
                const targetIndex = data.length - 3;
                const targetData = data[targetIndex];
                
                console.log("Using data at index", targetIndex, ":", targetData);
                
                // Identify all variables in the data object
                const variables = identifyVariablePairs(targetData);
                console.log("Identified variables:", variables);
                
                if (variables.length === 0) {
                    frappe.msgprint("No valid variables found in the data.");
                    return;
                }
                
                let canvas = document.getElementById("radarChart");
                if (!canvas) {
                    console.error("Canvas element not found");
                    return;
                }
                
                let ctx = canvas.getContext("2d");
                
                // Destroy existing chart if it exists
                if (radarChart) {
                    radarChart.destroy();
                }
                
                // Prepare chart data
                const labels = variables.map(v => v.label);
                const values = variables.map(v => v.value);
                
                // Create dataset
                const dataset = {
                    label: targetData.project_title || "Research Data",
                    data: values,
                    backgroundColor: chartColors[0].bg,
                    borderColor: chartColors[0].border,
                    borderWidth: 2,
                    pointBackgroundColor: chartColors[0].border,
                    pointRadius: 4,
                    fill: true
                };
                
                // Render the chart
                radarChart = new Chart(ctx, {
                    type: "radar",
                    data: {
                        labels: labels,
                        datasets: [dataset]
                    },
                    options: {
                        scales: {
                            r: {
                                beginAtZero: true,
                                min: 0,
                                max: 5,
                                stepSize: 1,
                                ticks: {
                                    font: {
                                        size: 10
                                    }
                                },
                                pointLabels: {
                                    font: {
                                        size: 12
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: { 
                                position: "top",
                                labels: {
                                    font: {
                                        size: 14
                                    }
                                }
                            },
                            title: { 
                                display: true, 
                                text: targetData.project_title || "Research Variables",
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return `${context.label}: ${context.raw.toFixed(1)}`;
                                    }
                                }
                            }
                        },
                        elements: {
                            line: {
                                tension: 0.2 // Slightly smoother lines
                            }
                        }
                    }
                });
                console.log("Chart rendered successfully");
            }

            // Hook into report refresh event
            report.page.wrapper.on('refresh', function() {
                console.log("Report refreshed, updating chart");
                if (report.data) {
                    renderChart(report.data);
                }
            });

            // Add a refresh button
            report.page.add_inner_button("Refresh Chart", function() {
                console.log("Refreshing chart");
                if (report.data) {
                    renderChart(report.data);
                }
            });

            // Initial render attempt after a slight delay to ensure DOM readiness
            setTimeout(function() {
                console.log("Attempting initial chart render");
                if (report.data) {
                    renderChart(report.data);
                }
            }, 1000);
        }, function(error) {
            console.error("Failed to load Chart.js:", error);
            frappe.msgprint("Failed to load Chart.js from CDN. Check your internet connection.");
        });
    }
};