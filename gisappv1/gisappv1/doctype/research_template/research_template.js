// Copyright (c) 2025, Ashish and contributors
// For license information, please see license.txt

frappe.ui.form.on("Research Template", {
  refresh(frm) {
    update_dimension_options_from_user_input(frm);
  },
});

frappe.ui.form.on("Dimensions", {
  dimensions: function (frm) {
    // Update options whenever dimensions are changed
    update_dimension_options_from_user_input(frm);
  },
  weightage: function(frm, cdt, cdn){
    // When weightage is changed, we need the current row
    let row = locals[cdt][cdn];
    let dimension_name = row.dimensions;
    let weightage_value = row.weightage;
    
    // Update all indicators with this dimension
    update_indicators_weightage(frm, dimension_name, weightage_value);
    update_dimension_options_from_user_input(frm);
  },
  table_gohs_add(frm) {
    update_dimension_options_from_user_input(frm);
  },
  table_gohs_remove(frm) {
    update_dimension_options_from_user_input(frm);
  },
});

frappe.ui.form.on("Indicators", {
  dimension: function (frm,cdt,cdn) {
    let row = locals[cdt][cdn];
    let row_dimension = row.dimension;

    let dimension_table_data = frm.doc.table_gohs;

    let weight = dimension_table_data.filter((data) => {
      return data.dimensions == row_dimension
    })

    row.weight_dimension = weight[0].weightage;

    frm.refresh_field("table_zuog");
  },
});

// Helper function to update all indicators with a specific dimension
function update_indicators_weightage(frm, dimension_name, weightage_value) {
  if (!frm.doc.table_zuog) return;
  
  // Loop through all indicators
  frm.doc.table_zuog.forEach(function(indicator_row) {
    if (indicator_row.dimension === dimension_name) {
      // Update the weight_dimension field for matching indicators
      frappe.model.set_value('Indicators', indicator_row.name, 'weight_dimension', weightage_value);
    }
  });
  
  frm.refresh_field("table_zuog");
}

function update_dimension_options_from_user_input(frm) {
    // Extract user-entered dimensions from table_gohs
    let dimensions = [];
    
    if (frm.doc.table_gohs && frm.doc.table_gohs.length > 0) {
      // Get all dimensions that have been entered by users
      dimensions = frm.doc.table_gohs
        .map((row) => row.dimensions || "")
        .filter((dim) => dim.trim() !== "");
      
    }
    
    // Set the options for dimension field in table_zuog
    frm.fields_dict["table_zuog"].grid.update_docfield_property(
      "dimension",
      "options",
      [" "].concat(dimensions).join("\n")
    );
    
    
    frm.refresh_field("table_zuog");
  }

