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

        // console.log("Report loaded:", report);

        // let chart_container = `
        //     <div style="width: 500px; height: 500px; margin: 20px auto;">
        //         <canvas id="radarChart"></canvas>
        //     </div>`;
        // $(report.page.main).prepend(chart_container);

        // // Load Chart.js from CDN and render chart
        // frappe.require("https://cdn.jsdelivr.net/npm/chart.js", function() {
        //     console.log("Chart.js loaded successfully");

        //     let radarChart = null;

        //     // Define chart colors
        //     const chartColors = [
        //         {
        //             bg: "rgba(124, 214, 253, 0.2)", 
        //             border: "rgba(124, 214, 253, 1)"
        //         },
        //         {
        //             bg: "rgba(116, 62, 226, 0.2)", 
        //             border: "rgba(116, 62, 226, 1)"
        //         },
        //         {
        //             bg: "rgba(255, 163, 239, 0.2)", 
        //             border: "rgba(255, 163, 239, 1)"
        //         },
        //         {
        //             bg: "rgba(255, 204, 0, 0.2)", 
        //             border: "rgba(255, 204, 0, 1)"
        //         }
        //     ];

        //     // Function to render or update the chart
        //     function renderChart() {
        //         if (!report.chart || !report.chart.data) {
        //             console.log("No chart data returned from Python execute function");
        //             return;
        //         }

        //         let chartData = report.chart.data;
        //         console.log("Chart data from Python:", chartData);

        //         let canvas = document.getElementById("radarChart");
        //         if (!canvas) {
        //             console.error("Canvas element not found");
        //             return;
        //         }

        //         let ctx = canvas.getContext("2d");
        //         if (!ctx) {
        //             console.error("Could not get 2D context for canvas");
        //             return;
        //         }

        //         // Destroy existing chart if it exists
        //         if (radarChart) {
        //             radarChart.destroy();
        //         }

        //         // Use the chart data from the Python execute function
        //         let labels = chartData.labels || [];
        //         let datasets = chartData.datasets || [];

        //         // Process datasets to add colors and styling
        //         const processedDatasets = datasets.map(dataset => {
        //             const colorIndex = dataset.colorIndex % chartColors.length;
        //             const color = chartColors[colorIndex];
                    
        //             return {
        //                 label: dataset.label,
        //                 data: dataset.data,
        //                 backgroundColor: color.bg,
        //                 borderColor: color.border,
        //                 borderWidth: 1,
        //                 pointBackgroundColor: color.border,
        //                 pointBorderColor: '#fff',
        //                 pointHoverBackgroundColor: '#fff',
        //                 pointHoverBorderColor: color.border,
        //                 fill: true
        //             };
        //         });

        //         console.log("Processed datasets:", processedDatasets);

        //         // Render the radar chart
        //         radarChart = new Chart(ctx, {
        //             type: "radar",
        //             data: {
        //                 labels: labels,
        //                 datasets: processedDatasets
        //             },
        //             options: {
        //                 scales: {
        //                     r: {
        //                         beginAtZero: true,
        //                         max: chartData.maxValue || 10,
        //                         ticks: {
        //                             showLabelBackdrop: false,
        //                             stepSize: chartData.stepSize || 1
        //                         }
        //                     }
        //                 },
        //                 plugins: {
        //                     legend: { 
        //                         position: "bottom",
        //                         labels: {
        //                             boxWidth: 12,
        //                             padding: 20
        //                         }
        //                     },
        //                     title: { 
        //                         display: true, 
        //                         text: chartData.title || "Indicators Radar Chart",
        //                         font: {
        //                             size: 16,
        //                             weight: 'bold'
        //                         },
        //                         padding: {
        //                             top: 10,
        //                             bottom: 20
        //                         }
        //                     }
        //                 },
        //                 elements: {
        //                     line: {
        //                         tension: 0.1 // Slightly smoother lines
        //                     }
        //                 },
        //                 responsive: true,
        //                 maintainAspectRatio: false
        //             }
        //         });
        //         console.log("Radar chart rendered successfully");
        //     }

        //     // Hook into report refresh event
        //     report.page.wrapper.on('refresh', function() {
        //         console.log("Report refreshed, updating chart");
        //         renderChart();
        //     });

        //     // Add a refresh button
        //     report.page.add_inner_button("Refresh Chart", function() {
        //         console.log("Refreshing chart");
        //         renderChart();
        //     });

        //     // Initial render attempt after a slight delay to ensure DOM readiness
        //     setTimeout(function() {
        //         console.log("Attempting initial chart render");
        //         renderChart();
        //     }, 1000); // 1-second delay to ensure DOM and data are ready
        // }, function(error) {
        //     console.error("Failed to load Chart.js:", error);
        //     frappe.msgprint("Failed to load Chart.js from CDN. Check your internet connection.");
        // });
    }
};