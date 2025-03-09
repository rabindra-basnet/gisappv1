import frappe
from frappe import _

def execute(filters=None):
    columns = get_columns(filters)
    data = get_data(filters)
    return columns, data

def get_columns(filters):
    
    indicators = frappe.db.sql("""
        SELECT DISTINCT indicator
        FROM `tabData Entry Table`
        WHERE parenttype = 'Research Survey'
        ORDER BY indicator
    """, as_dict=True)

    columns = [
        {"label": _("Response"), "fieldname": "response", "fieldtype": "Data", "width": 100}
    ]

    
    for ind in indicators:
        indicator = ind.get("indicator")
        columns.append({
            "label": _(f"{indicator} - Variable1"),
            "fieldname": f"{indicator}_var1",
            "fieldtype": "Float",
            "width": 250
        })
        columns.append({
            "label": _(f"{indicator} - Variable2"),
            "fieldname": f"{indicator}_var2",
            "fieldtype": "Float",
            "width": 250
        })
        columns.append({
            "label": _(f"{indicator} - Average1"),
            "fieldname": f"{indicator}_avg1",
            "fieldtype": "Float",
            "width": 250
        })

    return columns

def get_data(filters):
    data = []
    
    projects = frappe.get_all("Research Survey", filters=filters, fields=["name", "project_title"])

    
    all_response_data = []
    indicator_list = set()

    
    response_counter = 0
    child_data_by_response = {}
    
    for project in projects:
        child_data = frappe.get_all("Data Entry Table",
                                  filters={"parenttype": "Research Survey", "parent": project.name},
                                  fields=["indicator", "variable1", "variable2"])
        
        
        for child in child_data:
            response_counter += 1
            if response_counter not in child_data_by_response:
                child_data_by_response[response_counter] = []
            child_data_by_response[response_counter].append(child)
            indicator_list.add(child.indicator)

    
    for response_idx in range(1, response_counter + 1):
        row = {"response": f"Response {response_idx}"}
        child_entries = child_data_by_response.get(response_idx, [])
        
        
        for ind in indicator_list:
            row[f"{ind}_var1"] = 0
            row[f"{ind}_var2"] = 0
            row[f"{ind}_avg1"] = 0

        
        for child in child_entries:
            ind = child.indicator
            row[f"{ind}_var1"] = float(child.variable1 or 0)
            row[f"{ind}_var2"] = float(child.variable2 or 0)
            row[f"{ind}_avg1"] = (row[f"{ind}_var1"] + row[f"{ind}_var2"]) / 2 if row[f"{ind}_var1"] is not None and row[f"{ind}_var2"] is not None else 0
        
        data.append(row)
        all_response_data.append(row)

    
    avg1_row = {"response": "Average1"}
    for ind in indicator_list:
        var1_values = [row.get(f"{ind}_var1", 0) for row in all_response_data]
        var2_values = [row.get(f"{ind}_var2", 0) for row in all_response_data]
        var1_avg = sum(var1_values) / len(var1_values) if var1_values else 0
        var2_avg = sum(var2_values) / len(var2_values) if var2_values else 0
        avg1_row[f"{ind}_var1"] = round(var1_avg, 3)
        avg1_row[f"{ind}_var2"] = round(var2_avg, 3)
        avg1_row[f"{ind}_avg1"] = round((var1_avg + var2_avg) / 2, 3) if var1_avg is not None and var2_avg is not None else 0
    data.append(avg1_row)

    
    avg2_row = {"response": "Average2"}
    for ind in indicator_list:
        avg1 = avg1_row[f"{ind}_avg1"]
        avg2_row[f"{ind}_var1"] = round(avg1_row[f"{ind}_var1"], 3)
        avg2_row[f"{ind}_var2"] = round(avg1_row[f"{ind}_var2"], 3)
        avg2_row[f"{ind}_avg1"] = round(avg1, 3)
    data.append(avg2_row)

    
    avg3_row = {"response": "Average3"}
    avg2_values = [avg2_row.get(f"{ind}_avg1", 0) for ind in indicator_list]
    avg3 = sum(avg2_values) / len(avg2_values) if avg2_values else 0
    for ind in indicator_list:
        avg3_row[f"{ind}_var1"] = 0  
        avg3_row[f"{ind}_var2"] = 0
        avg3_row[f"{ind}_avg1"] = round(avg3, 3) if avg3 else 0
    data.append(avg3_row)

    return data