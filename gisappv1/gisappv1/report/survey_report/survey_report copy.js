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

        console.log(report)


        let chart_container = `
            <div style="width: 400px; height: 400px; margin: 20px auto;">
                <canvas id="radarChart"></canvas>
            </div>`;
        $(report.page.main).prepend(chart_container);

        // Load Chart.js from CDN and render chart
        frappe.require("https://cdn.jsdelivr.net/npm/chart.js", function() {
            console.log("Chart.js loaded successfully");

            let radarChart = null;

            // Function to render or update the chart
            function renderChart(chart) {
                if (!chart || chart.length === 0) {
                    console.log("No data available to render chart");
                    frappe.msgprint("No data available to display the chart.");
                    return;
                }

                console.log("Data received:", chart);

                let canvas = document.getElementById("radarChart");
                if (!canvas) {
                    console.error("Canvas element not found");
                    return;
                }

                let ctx = canvas.getContext("2d");
                if (!ctx) {
                    console.error("Could not get 2D context for canvas");
                    return;
                }

                // Destroy existing chart if it exists
                if (radarChart) {
                    radarChart.destroy();
                }

                // Prepare chart data
                let labels = ["Communication","Technical", "Leadership", "Creativity", "Teamwork"];
                let datasets = data.slice(0, 2).map((employee, index) => {
                    let colors = [
                        { bg: "rgba(255, 99, 132, 0.2)", border: "rgba(255, 99, 132, 1)" },
                        { bg: "rgba(54, 162, 235, 0.2)", border: "rgba(54, 162, 235, 1)" }
                    ];
                    return {
                        label: employee.name1 || "Unnamed",
                        data: [
                            employee.communication || 0,
                            employee.technical || 0,
                            employee.leadership || 0,
                            employee.creativity || 0,
                            employee.teamwork || 0
                        ],
                        backgroundColor: colors[index % colors.length].bg,
                        borderColor: colors[index % colors.length].border,
                        borderWidth: 1,
                        pointBackgroundColor: 'rgb(255, 99, 132)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgb(255, 99, 132)',
                        fill: true,
            
                    };
                });

                console.log("Chart datasets:", datasets);

                // Render the chart
                radarChart = new Chart(ctx, {
                    type: "radar",
                    data: {
                        labels: labels,
                        datasets: datasets
                    },
                    options: {
                        scale: {
                            ticks: {
                                beginAtZero: true,
                                max: 10,
                                stepSize: 0.5
                            }
                        },
                        plugins: {
                            legend: { position: "bottom" },
                            title: { display: true, text: "Employee Skills Radar Chart" }
                        }
                    }
                });
                console.log("Chart rendered successfully");
            }

            // Hook into report rendering
            report.formatter = function(value, row, column, data, default_formatter) {
                value = default_formatter(value, row, column, data);
                if (!radarChart) {
                    renderChart(report.data);
                }
                return value;
            };

            // Add a refresh button
            report.page.add_inner_button("Refresh Chart", function() {
                console.log("Refreshing chart");
                renderChart(report.data);
            });

            // Initial render attempt after a slight delay to ensure DOM readiness
            setTimeout(function() {
                console.log("Attempting initial chart render");
                renderChart(report.data);
            }, 1000); // 1-second delay to ensure DOM and data are ready
        }, function(error) {
            console.error("Failed to load Chart.js:", error);
            frappe.msgprint("Failed to load Chart.js from CDN. Check your internet connection.");
        });
    }
};

