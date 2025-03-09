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
    }
};