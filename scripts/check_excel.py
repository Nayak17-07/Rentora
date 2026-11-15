try:
    import win32com.client
    excel = win32com.client.Dispatch("Excel.Application")
    excel.Visible = False
    print("Excel COM is available. Version:", excel.Version)
    excel.Quit()
except Exception as e:
    print("Excel COM check:", e)
