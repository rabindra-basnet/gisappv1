# Copyright (c) 2025, Ashish and contributors
# For license information, please see license.txt

import frappe

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


# def create_radar_chart(filters, indicators_list, chart_data):
#     # Safely get the dimension filter value
#     filter_dimension = None
#     if filters and isinstance(filters, dict):
#         filter_dimension = filters.get("dimension")

#     # Extracting the relevant values from the provided data
#     labels = [item["indicator"] for item in indicators_list]

#     # Extract data for datasets
#     variable1_values = []
#     variable2_values = []
#     average_values = []
#     overall_average_values = []
    
#     for field in indicators_list:
#         # Extracting values from the first object (chart_data[0])
#         value1 = chart_data[0].get(f'variable1{to_camel_case(field["indicator"])}', 0)
#         value2 = chart_data[0].get(f'variable2{to_camel_case(field["indicator"])}', 0)
        
#         # Extracting average values from the second object (chart_data[1])
#         avg_value = chart_data[1].get(f'variable1{to_camel_case(field["indicator"])}', 0)

#         # Append values to respective lists
#         variable1_values.append(value1)
#         variable2_values.append(value2)
#         average_values.append(avg_value)

#     # Calculate overall average from the third object (chart_data[2])
#     for field in indicators_list:
#         overall_avg_value = chart_data[2].get(f'variable1{to_camel_case(field["indicator"])}', 0)
#         overall_average_values.append(overall_avg_value)

#     # Create datasets in a simplified format - let the JavaScript handle the styling
#     datasets = [
#         {
#             "label": "Variable 1",
#             "data": variable1_values,
#             "colorIndex": 0
#         },
#         {
#             "label": "Variable 2",
#             "data": variable2_values,
#             "colorIndex": 1
#         },
#         {
#             "label": "Average of Variables",
#             "data": average_values,
#             "colorIndex": 2
#         },
#         {
#             "label": "Overall Average",
#             "data": overall_average_values,
#             "colorIndex": 3
#         }
#     ]

#     # Find the max value for scale configuration
#     all_values = variable1_values + variable2_values + average_values + overall_average_values
#     max_value = max(all_values) if all_values else 10
    
#     # Round up to nearest 5 without using math module
#     rounded_max = ((max_value + 4) // 5) * 5  # Round up to nearest 5
    
#     # Creating the chart structure with specific Chart.js radar chart configuration
#     chart = {
#         "data": {
#             "labels": labels,  # Categories for the radar chart
#             "datasets": datasets,  # All datasets for the chart
#             "maxValue": rounded_max,  # For scale settings
#             "stepSize": rounded_max / 10,  # Suggested step size
#             "title": "Indicator Comparison"  # Title of the chart
#         }
#     }

#     return chart