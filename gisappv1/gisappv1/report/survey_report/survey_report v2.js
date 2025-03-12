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
    
    // Make chart rendering function accessible throughout the report context
    radarChart: null,
    chartColors: [
        {
            bg: "rgba(124, 214, 253, 0.3)", 
            border: "rgba(124, 214, 253, 1)"
        },
        {
            bg: "rgba(116, 62, 226, 0.3)", 
            border: "rgba(116, 62, 226, 1)"
        },
        {
            bg: "rgba(255, 163, 239, 0.3)", 
            border: "rgba(255, 163, 239, 1)"
        }
    ],
    
    // Extract indicator name from variable field
    extractIndicatorName: function(fieldName) {
        // Match pattern variable1IndicatorName or variable2IndicatorName
        let match = fieldName.match(/^variable[12](.+)$/);
        if (!match) return null;
        return match[1]; // Return just the indicator name part
    },
    
    // Format indicator name for display
    formatIndicatorName: function(indicatorName) {
        if (!indicatorName) return '';
        
        // Format indicator name: convert camelCase to Title Case
        let formattedName = indicatorName
            .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
            .replace(/(\d+)/g, ' $1')    // Add space before numbers
            .replace(/^./, function(str) { return str.toUpperCase(); })  // Capitalize first letter
            .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
            .trim();
        
        return formattedName;
    },
    
    // Identify all unique indicators in the data
    identifyUniqueIndicators: function(dataObject) {
        let indicators = new Set();
        
        // Find all fields that start with 'variable'
        for (let key in dataObject) {
            if (key.match(/^variable[12]/)) {
                const indicatorName = this.extractIndicatorName(key);
                if (indicatorName) {
                    indicators.add(indicatorName);
                }
            }
        }
        
        return Array.from(indicators);
    },
    
    // Function to render or update the chart
    renderChart: function(data) {
        if (!data || data.length < 3) {
            console.log("Not enough data to render chart");
            return;
        }
        
        // Get the data objects based on Python logic
        const variableData = data[data.length - 3];    // data[-3] - contains variable1 and variable2 values
        const averageData = data[data.length - 2];     // d - contains average values
        const overallData = data[data.length - 1];     //ata[-2] data[-1] - contains overall metrics (not used as per request)
        
        console.log("Variable data:", variableData);
        console.log("Average data:", averageData);
        
        // Identify all unique indicators
        const uniqueIndicators = this.identifyUniqueIndicators(variableData);
        console.log("Unique indicators:", uniqueIndicators);
        
        if (uniqueIndicators.length === 0) {
            console.log("No valid indicators found in the data");
            return;
        }
        
        let canvas = document.getElementById("radarChart");
        if (!canvas) {
            console.error("Canvas element not found");
            return;
        }
        
        let ctx = canvas.getContext("2d");
        
        // Destroy existing chart if it exists
        if (this.radarChart) {
            this.radarChart.destroy();
        }
        
        // Format indicator names for labels
        const labels = uniqueIndicators.map(ind => this.formatIndicatorName(ind));
        
        // Prepare datasets
        const variable1Values = [];
        const variable2Values = [];
        const averageValues = [];
        
        // Extract values for each indicator
        uniqueIndicators.forEach(indicator => {
            // Get variable1 and variable2 values from variableData
            const value1 = variableData[`variable1${indicator}`] || 0;
            const value2 = variableData[`variable2${indicator}`] || 0;
            
            // Get average value from averageData
            const avgValue = averageData[`variable1${indicator}`] || 0;
            
            variable1Values.push(value1);
            variable2Values.push(value2);
            averageValues.push(avgValue);
        });
        
        // Get current filter values for chart title
        const projectTitle = frappe.query_report.get_filter_value('project_title');
        const dimension = frappe.query_report.get_filter_value('dimension');
        const gwgi = frappe.query_report.get_filter_value('gwgi');
        
        // Create a title that reflects the current filters
        let chartTitle = variableData.project_title || projectTitle || "Research Data";
        
        if (dimension && dimension !== "All Indicators") {
            chartTitle += ` - ${dimension}`;
        }
        
        if (gwgi && gwgi !== "No Filter") {
            chartTitle += ` (${gwgi})`;
        }
        
        // Create datasets
        const datasets = [
            {
                label: "Variable 1",
                data: variable1Values,
                backgroundColor: this.chartColors[0].bg,
                borderColor: this.chartColors[0].border,
                borderWidth: 2,
                pointBackgroundColor: this.chartColors[0].border,
                pointRadius: 4,
                fill: true
            },
            {
                label: "Variable 2",
                data: variable2Values,
                backgroundColor: this.chartColors[1].bg,
                borderColor: this.chartColors[1].border,
                borderWidth: 2,
                pointBackgroundColor: this.chartColors[1].border,
                pointRadius: 4,
                fill: true
            },
            {
                label: "Average of Variables",
                data: averageValues,
                backgroundColor: this.chartColors[2].bg,
                borderColor: this.chartColors[2].border,
                borderWidth: 2,
                pointBackgroundColor: this.chartColors[2].border,
                pointRadius: 4,
                fill: true
            }
        ];
        
        // Render the chart
        this.radarChart = new Chart(ctx, {
            type: "radar",
            data: {
                labels: labels,
                datasets: datasets
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
                        text: chartTitle,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw.toFixed(1)}`;
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        tension: 0.2 // Slightly smoother lines
                    }
                },
                animation: {
                    duration: 500 // Faster animations for filter changes
                },
                responsive: true,   
                maintainAspectRatio: false
            }
        });
        console.log("Chart rendered successfully");
    },
    
    // After data is fetched/filtered
    "after_datatable_render": function(datatable) {
        const report = this;
        console.log("Datatable rendered, updating chart with new data");
        
        // Check if we have the Chart.js library loaded
        if (typeof Chart !== 'undefined') {
            report.renderChart(datatable.datamanager.data);
        }
    },

    // In the onload function, replace the chart container creation with this:
    "onload": function(report) {
        console.log("Report loaded, initializing chart");
        
        // Store report reference in the frappe.query_reports object for access in other functions
        const self = frappe.query_reports["Survey Report"];
        
        // Fetch available Research Templates for dropdown (unchanged)
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

        // Instead of immediately adding the chart container, wait for the page to render completely
        setTimeout(function() {
            // Create chart container HTML
            let chart_container = `
                <div class="radar-chart-wrapper" style="width: 600px; height: 500px; margin: 20px auto; position: relative;">
                    <canvas id="radarChart"></canvas>
                    <div id="chartLoadingMessage" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: none;">
                        Loading chart data...
                    </div>
                </div>`;
            
            // Find the bar chart container using its class
            const barChartElement = $(report.page.main).find('.chart-wrapper');
            
            if (barChartElement.length) {
                // Insert radar chart before the bar chart
                barChartElement.before(chart_container);
                console.log("Radar chart container inserted before bar chart");
            } else {
                // If bar chart not found yet, try the report-summary as fallback
                const reportSummary = $(report.page.main).find('.report-summary');
                if (reportSummary.length) {
                    reportSummary.after(chart_container);
                    console.log("Radar chart container inserted after report summary");
                } else {
                    // Last resort, add to the end of the form area
                    $(report.page.main).find('.page-form').after(chart_container);
                    console.log("Radar chart container inserted after page form");
                }
            }
            
            // Proceed with Chart.js loading as before
            initializeChart();
        }, 1000); // Wait 1 second for the page to render
        
        // Function to initialize the chart (extracted from the original code)
        function initializeChart() {
            // Load Chart.js from CDN and setup chart
            frappe.require("https://cdn.jsdelivr.net/npm/chart.js", function() {
                console.log("Chart.js loaded successfully");
                
                // Add a refresh button
                report.page.add_inner_button("Refresh Chart", function() {
                    console.log("Manual chart refresh requested");
                    $("#chartLoadingMessage").show();
                    
                    // Short delay to allow UI update
                    setTimeout(function() {
                        self.renderChart(report.data);
                        $("#chartLoadingMessage").hide();
                    }, 100);
                });
                
                // Listen for report refresh events
                report.page.wrapper.on('refresh', function() {
                    console.log("Report refresh event detected");
                    $("#chartLoadingMessage").show();
                    
                    // Short delay to allow data to be updated
                    setTimeout(function() {
                        self.renderChart(report.data);
                        $("#chartLoadingMessage").hide();
                    }, 200);
                });
                
                // Initial render with delay to ensure DOM and data readiness
                setTimeout(function() {
                    console.log("Initial chart render");
                    if (report.data) {
                        self.renderChart(report.data);
                    }
                }, 500);
                
            }, function(error) {
                console.error("Failed to load Chart.js:", error);
                frappe.msgprint("Failed to load Chart.js from CDN. Check your internet connection.");
            });
        }
    }
};


// Add this to your onload function in the Survey Report JS file
// After the "Refresh Chart" button is added

report.page.add_inner_button("Export to PDF", function() {
    console.log("PDF export requested");
    
    // Show loading message
    frappe.show_alert({
        message: __("Preparing PDF export..."),
        indicator: 'blue'
    });
    
    // Get current filter values for the report name
    const projectTitle = frappe.query_report.get_filter_value('project_title');
    const dimension = frappe.query_report.get_filter_value('dimension');
    const gwgi = frappe.query_report.get_filter_value('gwgi');
    
    let reportTitle = "Survey Report";
    if (projectTitle) {
        reportTitle += " - " + projectTitle;
        if (dimension && dimension !== "All Indicators") {
            reportTitle += " (" + dimension + ")";
        }
        if (gwgi && gwgi !== "No Filter") {
            reportTitle += " " + gwgi;
        }
    }
    
    // Capture the current chart as an image
    const captureChart = function() {
        return new Promise((resolve) => {
            const canvas = document.getElementById("radarChart");
            if (canvas) {
                // Convert canvas to base64 image
                const chartImage = canvas.toDataURL("image/png");
                resolve(chartImage);
            } else {
                resolve(null);
            }
        });
    };
    
    // Generate PDF with the report data
    captureChart().then(chartImage => {
        frappe.call({
            method: "survey_reports.survey_reports.report.survey_report.survey_report.export_to_pdf",
            args: {
                filters: frappe.query_report.get_filter_values(),
                report_name: reportTitle,
                chart_image: chartImage,
                html_data: report.page.main.find('.datatable').html()
            },
            callback: function(r) {
                if (r.message) {
                    // Open the generated PDF in a new tab
                    window.open(frappe.urllib.get_full_url("/api/method/frappe.utils.print_format.download_pdf?doctype=File&name=" + r.message), "_blank");
                    
                    frappe.show_alert({
                        message: __("PDF export complete"),
                        indicator: 'green'
                    });
                } else {
                    frappe.throw(__("PDF export failed"));
                }
            }
        });
    });
});