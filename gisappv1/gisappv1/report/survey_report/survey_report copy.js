// Copyright (c) 2025, Ashish and contributors
// For license information, please see license.txt

frappe.query_reports["Survey Report"] = {
	"filters": [
		{
            "fieldname": "projet_title",
            "label": "Project",
            "fieldtype": "Link",
            "options": "Research Template",
            "reqd": 0,
            "default": null // Will set default value after fetching the default company
        }
	],
	"onload": function(report){
		console.log(report)
	}
};
