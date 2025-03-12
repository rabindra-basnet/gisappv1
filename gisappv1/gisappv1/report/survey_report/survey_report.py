# Add this new method to your Python file to handle direct PDF download
import frappe
@frappe.whitelist()
def get_pdf_file(file_name):
    """
    Get the PDF file for direct download
    
    Args:
        file_name (str): Name of the file document
        
    Returns:
        Response: File download response
    """
    from frappe.utils.response import download_file
    from frappe.utils.file_manager import get_file
    
    file_path = frappe.get_doc("File", file_name)
    file_content = get_file(file_name)
    
    return download_file(
        file_content[1],
        file_path.file_name
    )

# Update the export_to_pdf function to fix the table scrolling issue
@frappe.whitelist()
def export_to_pdf(filters, report_name, chart_image=None, html_data=None):
    """
    Export the Survey Report to PDF
    
    Args:
        filters (dict): Filter values for the report
        report_name (str): Name for the PDF report
        chart_image (str): Base64 encoded image of the chart
        html_data (str): HTML of the report data table
        
    Returns:
        str: Name of the generated PDF file
    """
    import base64
    from datetime import datetime
    from frappe.utils.pdf import get_pdf
    from frappe.utils import get_site_path, get_files_path
    
    # Convert filters from string to dict if needed
    if isinstance(filters, str):
        import json
        filters = json.loads(filters)
    
    # Re-run the report to get the data
    columns, data = execute(filters)[:2]
    
    # Generate HTML for the PDF
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{0}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 0; }}
            .report-header {{ text-align: center; margin-bottom: 20px; }}
            .report-title {{ font-size: 18px; font-weight: bold; }}
            .report-date {{ font-size: 12px; color: #666; }}
            .chart-container {{ text-align: center; margin: 20px 0; }}
            .chart-container img {{ max-width: 100%; height: auto; }}
            .table-container {{ overflow: visible; width: 100%; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; page-break-inside: auto; }}
            thead {{ display: table-header-group; }}
            tr {{ page-break-inside: avoid; page-break-after: auto; }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }}
            th {{ background-color: #f2f2f2; font-weight: bold; }}
            tr:nth-child(even) {{ background-color: #f9f9f9; }}
            @page {{ size: landscape; margin: 1cm; }}
        </style>
    </head>
    <body>
        <div class="report-header">
            <div class="report-title">{0}</div>
            <div class="report-date">Generated on: {1}</div>
        </div>
    """.format(report_name, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    # Add chart image if provided
    if chart_image:
        # Remove the data:image/png;base64, prefix if present
        if "base64," in chart_image:
            chart_image = chart_image.split("base64,")[1]
        
        html_content += """
        <div class="chart-container">
            <h3>Radar Chart Visualization</h3>
            <img src="data:image/png;base64,{0}" alt="Survey Chart">
        </div>
        """.format(chart_image)
    
    # Generate table with scrollable container
    html_content += '<h3>Detailed Data</h3><div class="table-container"><table><thead><tr>'
    
    # Add table headers - only include essential columns to fit in PDF
    visible_columns = []
    for col in columns:
        # Skip columns that start with 'parent' to reduce table width
        if not col.get("fieldname", "").startswith("parent"):
            visible_columns.append(col)
            html_content += "<th>{0}</th>".format(col.get("label", ""))
    
    html_content += "</tr></thead><tbody>"
    
    # Add table rows
    for row in data:
        html_content += "<tr>"
        for col in visible_columns:
            field_name = col.get("fieldname", "")
            cell_value = row.get(field_name, "")
            
            # Format float values
            if isinstance(cell_value, float):
                cell_value = "{:.2f}".format(cell_value)
            
            html_content += "<td>{0}</td>".format(cell_value)
        html_content += "</tr>"
    
    html_content += "</tbody></table></div>"
    
    # Close HTML
    html_content += """
    </body>
    </html>
    """
    
    # Generate PDF with landscape orientation and adjusted margins
    pdf_options = {
        "orientation": "Landscape",
        "page-size": "A4",
        "margin-top": "10mm",
        "margin-right": "10mm",
        "margin-bottom": "10mm",
        "margin-left": "10mm",
        "print-media-type": True,
        "dpi": 300
    }
    
    pdf_data = get_pdf(html_content, options=pdf_options)
    
    # Save PDF to a file
    file_name = "{0}_{1}.pdf".format(
        report_name.replace(" ", "_").lower(),
        datetime.now().strftime("%Y%m%d_%H%M%S")
    )
    
    # Create a File record
    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": file_name,
        "content": pdf_data,
        "is_private": 1,
    })
    file_doc.insert(ignore_permissions=True)
    
    return file_doc.name


def to_camel_case(snake_str):
    """Convert snake_case or space-separated string to camelCase."""
    components = snake_str.split("_")
    camel_case_str = components[0] + "".join(x.title() for x in components[1:])
    # Ensure there are no spaces or unexpected characters
    return camel_case_str.replace(" ", "")

def execute(filters=None):
    columns, data = [], []

    # Check if project_title filter exists
    if not filters or not filters.get("project_title"):
        return columns, data
    
    # Get the selected Research Template
    research_template = filters.get("project_title")
    # Get the selected Dimension
    filter_dimension = filters.get("dimension")
    # Get the GI Selection
    filter_gi = filters.get("gwgi")

    query_to_get_column_data = """
        SELECT child.*
        FROM `tabResearch Template` AS parent
        JOIN `tabIndicators` AS child ON child.parent = parent.name
        WHERE parent.name = %s
    """
    
    # Add dimension filter if provided
    col_parameters = [research_template]
    if filter_dimension != "All Indicators":
        query_to_get_column_data += " AND child.dimension = %s"
        col_parameters.append(filter_dimension)

    # Execute SQL Query and fetch results
    query_to_get_column_data_result = frappe.db.sql(
        query_to_get_column_data, col_parameters, as_dict=True
    )

    indicators_list = []
    
    project_column = {
        "fieldname": "project_title",
        "label": "Project",
        "fieldtype": "Data",
        "width": 150,
    }
    
    columns.append(project_column)

    # Add indicators and dimensions to indicators_list
    for item in query_to_get_column_data_result:
        indicator_obj = {
            "indicator": item["indicators"],
            "dimension": item["dimension"],
            "weight": item["weight_dimension"]
        }
        indicators_list.append(indicator_obj)

    for indicator in indicators_list:
        camel_case_indicator = to_camel_case(indicator["indicator"])
        
        # Create variable1 and variable2 for each indicator
        variable1 = {
            "fieldname": "variable1" + camel_case_indicator,
            "label": indicator["indicator"] + " Variable 1",
            "fieldtype": "Float",
            "width": 150,
        }
        variable2 = {
            "fieldname": "variable2" + camel_case_indicator,
            "label": indicator["indicator"] + " Variable 2",
            "fieldtype": "Float",
            "width": 200,
        }

        # Append variable1 and variable2 to columns
        columns.append(variable1)
        columns.append(variable2)

    # Using parameters with %s placeholder correctly
    base_query = """
        SELECT child.* 
        FROM `tabResearch Survey` AS parent
        JOIN `tabData Entry Table` AS child ON child.parent = parent.name
        WHERE parent.project_title = %s
    """

    row_parameters = [research_template]

    if filter_dimension != "All Indicators":
        base_query = base_query + " AND child.dimension = %s"
        row_parameters.append(filter_dimension)

    query_to_get_row_data_result = frappe.db.sql(base_query, row_parameters, as_dict=True)

    grouped_data = {}

    for obj in query_to_get_row_data_result:
        parent = obj["parent"]
        indicator_camel_case = to_camel_case(obj["indicator"])

        # Ensure the necessary keys exist in the grouped data
        key1 = f"variable1{indicator_camel_case}"
        key2 = f"variable2{indicator_camel_case}"

        if parent not in grouped_data:
            grouped_data[parent] = {
                "parent": parent,
                "parentfield": obj["parentfield"],
                "parenttype": obj["parenttype"],
            }

        # Initialize keys if they don't exist
        if key1 not in grouped_data[parent]:
            grouped_data[parent][key1] = 0
        if key2 not in grouped_data[parent]:
            grouped_data[parent][key2] = 0

        # Assign values without using +=
        grouped_data[parent][key1] = grouped_data[parent][key1] + obj["variable1"]
        grouped_data[parent][key2] = grouped_data[parent][key2] + obj["variable2"]

    # Convert the grouped data back to a list
    data = list(grouped_data.values())
    
    # Initialize a dictionary to hold the sums
    sums = {}
    count = len(data)

    # Iterate through each object in the data list
    for obj in data:
        for key, value in obj.items():
            if key.startswith('variable'):
                # Initialize the sum for the variable if it doesn't exist
                if key not in sums:
                    sums[key] = 0
                # Add the value to the sum using explicit assignment
                sums[key] = sums[key] + value

    # Create a new dictionary to hold the averages
    averages = {'parent': 'average', 'parentfield': 'average', 'parenttype': 'Research Survey', 'project_title': "Average of Varables"}

    # Calculate the average for each variable
    for key in sums:
        averages[key] = round(sums[key] / count, 2)

    # Append the averages dictionary to the data list
    data.append(averages)
    
    average1_initial_data = data[-1]
    
    # Create a new object to hold the averages
    averaged1 = {'parent': 'average1', 'parentfield': 'average1', 'parenttype': 'Research Survey', 'project_title': "Average of Each Indicator"}
    
    for key in average1_initial_data:
        if key.startswith('variable1'):
            # Create the corresponding variable2 key
            variable2_key = key.replace('variable1', 'variable2')
            
            # Calculate the average of variable1 and variable2
            if variable2_key in average1_initial_data:
                average_value = (average1_initial_data[key] + average1_initial_data[variable2_key]) / 2
                
                # Store the average in variable1
                averaged1[key] = average_value
    
    data.append(averaged1)
    
    # Initialized total sum data
    average2_initial_data = data[-1]
    
    # Initialize a variable to hold the total sum
    total_sum = 0
    count = 0
    first_float_key = None

    # Loop through the dictionary
    for key, value in average2_initial_data.items():
        # Check if the value is a float
        if isinstance(value, float):
            total_sum += value
            count += 1
            # Capture the first float variable key
            if first_float_key is None:
                first_float_key = key

    # Calculate the average
    if count > 0:
        average = total_sum / count
    else:
        average = 0  # Avoid division by zero if there are no float values

        # Add a dynamic average label based on dimension filter
    if filter_dimension == "All Indicators":
        average_of_dimension_label = "Average of All Dimension"
    elif filter_dimension :
        average_of_dimension_label = f"Average of {filter_dimension} Indicators"
    else:
        average_of_dimension_label = "Average of All Indicators"

    averaged2 ={}
    
    # Store the average in the first float variable if it exists
    if first_float_key is not None:
        averaged2 = {
            'parent': 'average2',
            'parentfield': 'average2',
            'parenttype': 'Research Survey',
            'project_title': average_of_dimension_label,
            first_float_key: average  # Append the average value here
        }
    
    data.append(averaged2)
    print(data)

    chart_data = []
    chart_data.append(data[-3])
    chart_data.append(data[-2])
    chart_data.append(data[-1])
    

    if filter_gi == "GWGI":
        chart = create_gwgi_chart(filters,indicators_list, data[-2])
    else:
        chart = create_chart(filters, indicators_list, chart_data)
        # chart = create_radar_chart(filters, indicators_list, chart_data)
        
    return columns, data, None, chart

def create_chart(filters, indicators_list, chart_data):
    # Safely get the dimension filter value
    filter_dimension = None
    if filters and isinstance(filters, dict):
        filter_dimension = filters.get("dimension")

    # Extracting the relevant values from the provided data
    labels = [item["indicator"] for item in indicators_list]

    # Add a dynamic average label based on dimension filter
    if filter_dimension == "All Indicators":
        average_label = "Average of All Indicators"
    elif filter_dimension:
        average_label = f"Average of {filter_dimension} Dimension"
    else:
        average_label = "Average of All Indicators"

    labels.append(average_label)

    datasets = []

    # Create datasets for each indicator
    variable1_values = []
    variable2_values = []
    average_values = []
    overall_average_values = []
    
    for field in indicators_list:
        # Extracting values from the first object (chart_data[0])
        value1 = chart_data[0].get(f'variable1{to_camel_case(field["indicator"])}', 0)
        value2 = chart_data[0].get(f'variable2{to_camel_case(field["indicator"])}', 0)
        
        # Extracting average values from the second object (chart_data[1])
        avg_value = chart_data[1].get(f'variable1{to_camel_case(field["indicator"])}', 0)

        # Append values to respective lists
        variable1_values.append(value1)
        variable2_values.append(value2)
        average_values.append(avg_value)

    # Calculate overall average from the third object (chart_data[2])
    for field in indicators_list:
        overall_avg_value = chart_data[2].get(f'variable1{to_camel_case(field["indicator"])}', 0)
        overall_average_values.append(overall_avg_value)

    # Create datasets
    datasets.append({
        "name": "Variable 1",
        "values": variable1_values + [0]  # Add 0 for "Average of All Indicators"
    })
    datasets.append({
        "name": "Variable 2",
        "values": variable2_values + [0]  # Add 0 for "Average of All Indicators"
    })
    datasets.append({
        "name": "Average of Variables",
        "values": average_values + [0]  # Add 0 for "Average of All Indicators"
    })
    
    # Add a separate dataset for the overall average
    datasets.append({
        "name": average_label,
        "values": [0] * len(indicators_list) + [sum(overall_average_values)]  # Zeros for indicators and overall average at the end
    })

    # Creating the chart structure
    chart = {
        "data": {
            "labels": labels,  # X-axis labels
            "datasets": datasets  # All datasets for the chart
        },
        "type": "bar",  # Example chart type (you can change this to 'line', 'pie', etc.)
        "title": "Average of Variables",  # Title of the chart
        "colors": ["#7cd6fd", "#743ee2", "#ffa3ef", "#ffcc00"],  # Optional: colors for the datasets
    }

    return chart

def create_gwgi_chart(filters, indicators_list, chart_data):
    # Group indicators by dimension
    dimensions = {}
    for ind in indicators_list:
        dim_name = ind['dimension']
        if dim_name not in dimensions:
            dimensions[dim_name] = {
                'indicators': [],
                'weight': ind['weight']
            }
        dimensions[dim_name]['indicators'].append(ind['indicator'])
    
    # Calculate average for each dimension
    dimension_averages = {}
    for dim_name, dim_data in dimensions.items():
        total = 0
        count = 0
        for indicator in dim_data['indicators']:
            # Handle the special case of "Srishant Dai" vs "SrishantDai" in the variable name
            var_name = f"variable1{indicator.replace(' ', '')}"
            if var_name in chart_data:
                total += chart_data[var_name]
                count += 1
        
        if count > 0:
            dimension_averages[dim_name] = total / count
        else:
            dimension_averages[dim_name] = 0
    
    # Calculate GWGI value
    gwgi_value = 0
    for dim_name, avg in dimension_averages.items():
        weight = dimensions[dim_name]['weight'] / 100  # Convert weight to decimal
        gwgi_value += avg * weight
    
    # Prepare data for the chart
    labels = list(dimension_averages.keys())
    values = list(dimension_averages.values())
    
    # Add the GWGI value to the chart
    labels.append("GWGI")
    values.append(gwgi_value)
    
    # Create the chart
    chart = {
        "data": {
            "labels": labels,
            "datasets": [
                {
                    "name": "Average Score",
                    "values": values
                }
            ]
        },
        "type": "bar",
        "height": 300,
        "colors": ["#ffa3ef"],
        "axisOptions": {
            "xAxisMode": "tick",
            "yAxisMode": "span",
            "xIsSeries": 1
        },
        "barOptions": {
            "spaceRatio": 0.5
        }
        # Removed tooltipOptions with JavaScript functions
    }

    
    # Create a summary with details
    dimension_details = []
    for dim_name, avg in dimension_averages.items():
        weight = dimensions[dim_name]['weight']
        weighted_value = avg * (weight / 100)
        dimension_details.append({
            "dimension": dim_name,
            "average": round(avg, 2),
            "weight": weight,
            "weighted_value": round(weighted_value, 2)
        })
    
    summary = {
        "dimension_averages": dimension_details,
        "gwgi_value": round(gwgi_value, 2)
    }
    
    return chart 