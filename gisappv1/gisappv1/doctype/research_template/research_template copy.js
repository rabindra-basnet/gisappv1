// Copyright (c) 2025, Ashish and contributors
// For license information, please see license.txt

frappe.ui.form.on("Research Template", {
  refresh(frm) {
    update_dimension_options_from_user_input(frm);
  },
});

frappe.ui.form.on("Dimensions", {
  dimensions: function (frm,cdt,cdn) {
    // Update options whenever dimensions are changed
    row = locals[cdt][cdn];
    update_dimension_options_from_user_input(frm, row);
  },
  weightage: function(frm){
    update_dimension_options_from_user_input(frm, row);
  },
  table_gohs_add(frm) {
    update_dimension_options_from_user_input(frm);
  },
  table_gohs_remove(frm) {
    update_dimension_options_from_user_input(frm);
  },
});

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
    
    // For each row in table_zuog, find the matching weightage from table_gohs
    if (frm.doc.table_zuog && frm.doc.table_zuog.length > 0) {
      frm.doc.table_zuog.forEach((zuogRow) => {
        // Get the dimension for this row
        let dimension = zuogRow.dimension;
        
        // Find the matching weightage in table_gohs
        if (dimension && dimension.trim() !== "") {
          // Find the matching row in table_gohs
          let matchingRow = frm.doc.table_gohs.find(
            (gohsRow) => gohsRow.dimensions === dimension
          );
          
          // If found, set the weight_ field
          if (matchingRow) {
            zuogRow.weight_dimension = matchingRow.weightage || "";

          }
        }
      });
    }
    
    // Refresh the field to show updated options
    frm.refresh_field("table_zuog");
    
    console.log("Updated dimension options:", dimensions);
  }




// function update_dimension_options_from_user_input(frm, row) {
//   // Extract user-entered dimensions from table_gohs
//   let dimensions= new Map();

//   let dimension = row.dimensions;

//   if (frm.doc.table_gohs && frm.doc.table_gohs.length > 0) {
//     // Get all dimensions that have been entered by users
//     dimensions = frm.doc.table_gohs
//       .map((row) => row.dimensions || "")
//       .filter((dim) => dim.trim() !== "");

//     weightages = frm.doc.table_gohs
//       .map((row) => row.weightage  || "")
//     //   .filter((weight) => weight.trim() !== "");
//   }

//   // Set the options for dimension field in table_zuog
//   frm.fields_dict["table_zuog"].grid.update_docfield_property(
//     "dimension",
//     "options",
//     [" "].concat(dimensions).join("\n")
//   );

    

    
//   // Refresh the field to show updated options
//   frm.refresh_field("table_zuog");

//   console.log("Updated dimension options:", dimensions);
// }

// function update_dimension_options_from_user_input(frm) {
//     // Extract user-entered dimensions and weightages from table_gohs
//     let dimensionsMap = new Map(); // Use a map to store dimension -> weightage pairs
    
//     if (frm.doc.table_gohs && frm.doc.table_gohs.length > 0) {
//       // Build the dimension to weightage mapping
//       frm.doc.table_gohs.forEach((row) => {
//         if (row.dimensions && row.dimensions.trim() !== "") {
//           dimensionsMap.set(row.dimensions, row.weightage || "");
//         }
//       });
//     }
    
//     // Get the dimensions list for the dropdown
//     const dimensions = Array.from(dimensionsMap.keys());
    
//     // Set the options for dimension field in table_zuog
//     frm.fields_dict["table_zuog"].grid.update_docfield_property(
//       "dimension",
//       "options",
//       [" "].concat(dimensions).join("\n")
//     );
    
//     // Use set_value to update the weight_ values
//     if (frm.doc.table_zuog && frm.doc.table_zuog.length > 0) {
//       frm.doc.table_zuog.forEach((row, idx) => {
//         if (row.dimension && dimensionsMap.has(row.dimension)) {
//           const weightValue = dimensionsMap.get(row.weight_);
          
//           // Use frappe.model.set_value to update the field
//           frappe.model.set_value(
//             'Indicators', // Replace with your child table doctype name
//             row.name,
//             'weight_',
//             weightValue
//           );
          
//           console.log(`Setting row ${idx} with dimension "${row.dimension}" to weight_ = ${weightValue}`);
//         }
//       });
//     }
    
//     // Refresh the entire table after all updates
//     frm.refresh_field("table_zuog");
    
//     console.log("Updated dimension options:", dimensions);
//     console.log("Updated weightage values for matching dimensions");
//   }
