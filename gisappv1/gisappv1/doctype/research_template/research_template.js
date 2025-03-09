// Copyright (c) 2025, Ashish and contributors
// For license information, please see license.txt

frappe.ui.form.on('Research Template', {
    refresh(frm) {
        update_dimension_options_from_user_input(frm);
    }
});

frappe.ui.form.on('Dimensions', {
	dimensions: function(frm) {
        // Update options whenever dimensions are changed
        update_dimension_options_from_user_input(frm);
    },
    table_gohs_add(frm){
        update_dimension_options_from_user_input(frm)
    },
    table_gohs_remove(frm){
        update_dimension_options_from_user_input(frm)
    }
})

function update_dimension_options_from_user_input(frm) {
    // Extract user-entered dimensions from table_gohs
    let dimensions = [];
    
    if (frm.doc.table_gohs && frm.doc.table_gohs.length > 0) {
        // Get all dimensions that have been entered by users
        dimensions = frm.doc.table_gohs
            .map(row => row.dimensions || "")
            .filter(dim => dim.trim() !== "");
    }
  
    // Set the options for dimension field in table_zuog
    frm.fields_dict['table_zuog'].grid.update_docfield_property(
        'dimension', 'options', [" "].concat(dimensions).join("\n")
    );
   
    // Refresh the field to show updated options
    frm.refresh_field("table_zuog");
    
    console.log("Updated dimension options:", dimensions);
}


