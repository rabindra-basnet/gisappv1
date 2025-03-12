import frappe

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
    try:
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
            "dpi": 300,
            "disable-smart-shrinking": True  # Add this to prevent shrinking
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
        
    except Exception as e:
        frappe.log_error(f"PDF Export Error: {str(e)}", "PDF Export Error")
        frappe.throw(f"Error generating PDF: {str(e)}")