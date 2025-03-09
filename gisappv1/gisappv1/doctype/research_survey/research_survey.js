// Copyright (c) 2025, Ashish and contributors
// For license information, please see license.txt


frappe.ui.form.on('Research Survey', {
    refresh(frm) {
        // your code here
    },

    project_title: function(frm) {
        if (frm.doc.project_title) {
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Research Template",
                    filters: {
                        project_title: frm.doc.project_title // Filter by project title
                    }
                },
                callback: function(response) {
                    if (response.message) {
                        let research_template = response.message;
                        console.log(research_template)
                        let child_table_data = research_template.table_zuog || [];

                        console.log("Child Table Data:", child_table_data);

                        // Optionally, you can set this data to a child table in Research Survey
                        child_table_data.forEach(row => {
                            let child = frm.add_child("table_bgyj");
                            child.indicator = row.indicators; // Map fields as needed
                            child.dimension = row.dimension; // Map fields as needed
                        });
                        frm.refresh_field("table_bgyj");
                    }
                }
            });
        }
    }
});
