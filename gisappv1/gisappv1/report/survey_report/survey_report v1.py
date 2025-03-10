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

    query_to_get_column_data = """
        SELECT child.*
        FROM `tabResearch Template` AS parent
        JOIN `tabIndicators` AS child ON child.parent = parent.name
        WHERE parent.name = %s
    """
    
    # Execute SQL Query and fetch results
    query_to_get_column_data_result = frappe.db.sql(
        query_to_get_column_data, research_template, as_dict=True
    )

    indicators_list = []
    
    project_column = {
        "fieldname": "project_title",
        "label": "Project",
        "fieldtype": "Data",
        "width": 150,
    }
    
    columns.append(project_column)

    for item in query_to_get_column_data_result:
        indicators_list.append(item["indicators"])

    for indicator in indicators_list:
        camel_case_indicator = to_camel_case(indicator)

        # Create variable1 and variable2 for each indicator
        variable1 = {
            "fieldname": "variable1" + camel_case_indicator,
            "label": indicator + " Variable 1",
            "fieldtype": "Float",
            "width": 150,
        }
        variable2 = {
            "fieldname": "variable2" + camel_case_indicator,
            "label": indicator + " Variable 2",
            "fieldtype": "Float",
            "width": 200,
        }

        # Append variable1 and variable2 to columns
        columns.append(variable1)
        columns.append(variable2)

    query_to_get_row_data = """
        SELECT child.* 
        FROM `tabResearch Survey` AS parent
        JOIN `tabData Entry Table` AS child ON child.parent = parent.name
        WHERE parent.project_title LIKE '%Ground Water Research%';
    """

    query_to_get_row_data_result = frappe.db.sql(query_to_get_row_data, as_dict=True)

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
    averaged1 = {'parent': 'average1', 'parentfield': 'average1', 'parenttype': 'Research Survey', 'project_title': "Average of 2 Variables Indicators"}
    
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

    averaged2 ={}
    
    # Store the average in the first float variable if it exists
    if first_float_key is not None:
        averaged2 = {
            'parent': 'average2',
            'parentfield': 'average2',
            'parenttype': 'Research Survey',
            'project_title': "Average of Indicators",
            first_float_key: average  # Append the average value here
        }
    
    data.append(averaged2)
    print(data)

    chart_data = []
    chart_data.append(data[-3])
    chart_data.append(data[-2])
    chart_data.append(data[-1])
    
    chart = create_chart(None, indicators_list, chart_data)

    demo_chart = {
        'data': {
            'labels': ['Technical research', 'Tech Reports', 'Legal issues', 'Government', 'Policy', 'Operation', 'Average of All Indicators'],
            'datasets': [{
                'name': 'Variable 1',
                'values': [8.5, 6.0, 7.0, 7.0, 16.5, 20.5,0]
            }, {
                'name': 'Variable 2',
                'values': [0.5, 11.0, 9.0, 21.5, 20.0, 31.0,0]
            }, {
                'name': 'Average of Variables',
                'values': [4.5, 8.5, 8.0, 14.25, 18.25, 25.75,0]
            }, {
                'name': 'Average of All Indicators',
                'values': [0, 0, 0, 0, 0, 0, 13.208333333333334]
            }]
        },
        'type': 'bar',
        'title': 'Average of Variables',
        'colors': ['#7cd6fd', '#743ee2', '#ffa3ef', '#ffcc00']
    }
        
    return columns, data, None, chart

def create_chart(filters, indicators_list, chart_data):
    # Extracting the relevant values from the provided data
    labels = indicators_list + ["Average of all Indicators"]
    datasets = []

    # Create datasets for each indicator
    variable1_values = []
    variable2_values = []
    average_values = []
    overall_average_values = []
    
    for field in indicators_list:
        # Extracting values from the first object (chart_data[0])
        value1 = chart_data[0].get(f'variable1{to_camel_case(field)}', 0)
        value2 = chart_data[0].get(f'variable2{to_camel_case(field)}', 0)
        
        # Extracting average values from the second object (chart_data[1])
        avg_value = chart_data[1].get(f'variable1{to_camel_case(field)}', 0)

        # Append values to respective lists
        variable1_values.append(value1)
        variable2_values.append(value2)
        average_values.append(avg_value)

    # Calculate overall average from the third object (chart_data[2])
    for field in indicators_list:
        overall_avg_value = chart_data[2].get(f'variable1{to_camel_case(field)}', 0)
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
        "name": "Average of All Indicators",
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