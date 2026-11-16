# Vehicle Maintenance Tracking - Quick Start

## Setup Instructions

### 1. Open Google Sheets
Open your spreadsheet: https://docs.google.com/spreadsheets/d/15KrEjXnOx-PURw76UTGgKfE7d2-HnUPhAohLe_dMgxU/edit?gid=0#gid=0

### 2. Open Apps Script Editor
1. In Google Sheets, click **Extensions** → **Apps Script**
2. Delete any default code in the editor
3. Paste the code from `vehicle_maintenance.gs`

### 3. Configure Sheet Names (if needed)
The script uses these default sheet names:
- `VehicleInfo` - Contains your vehicle list (CRV G3 2.0E 4WD data)
- `Maintenance_Log` - Where maintenance records will be stored

If your sheet names differ, update the `const` variables at the top of the code:
```javascript
const VEHICLE_INFO_SHEET = 'YourSheetName';
const MAINTENANCE_SHEET = 'YourSheetName';
```

### 4. Save the Project
Click the floppy disk icon or press **Ctrl+S** (⌘+S on Mac)
- Name your project: "Vehicle Maintenance Tracker"

### 5. Refresh the Spreadsheet
Go back to your spreadsheet and you should see a new menu: **Vehicle Tracker**

## Using the System

### Add a New Maintenance Record
1. Click **Vehicle Tracker** → **Add Maintenance Record**
2. Select a vehicle from the dropdown (vehicles come from your VehicleInfo sheet)
3. Fill in: Service Type, Mileage, Cost (THB), and optional Notes
4. Click "Submit Record"

### View All Records
1. Click **Vehicle Tracker** → **View All Records**
2. See a table of all maintenance entries with filtering capability

### Summary Reports
- **Summary by Vehicle**: Shows number of services and total/average costs per vehicle
- **Summary by Service Type**: Shows breakdown by what type of service was performed

### Web App Endpoint
The script also includes a web app URL you can use directly:
```
https://script.google.com/macros/s/AKfycbwhqM4DZKR3wPiym5DUn5nI3CV0_H7FMvQBPb5YhLeyBnCGUk7x8i4I0Scp8SfR9jXJ1A/exec
```

You can also add records via HTTP POST with parameters:
- `action=add`
- `vehicle=Vehicle Name`
- `serviceType=Service Type`
- `mileage=Number`
- `cost=Cost in THB`
- `notes=Optional notes`

## Customizing

### Add More Vehicle Columns
If your VehicleInfo sheet has additional columns (Model, Year, VIN, etc.), the script will automatically display them when you select a vehicle.

### Modify Column Order
The maintenance log columns are:
1. Date (yyyy-mm-dd)
2. Vehicle name
3. Service type
4. Mileage
5. Cost (THB)
6. Notes
7. Created timestamp

To change the order, modify the `row` array in the `submitRecord()` and `addRecordViaWeb()` functions.

### Add Custom Functions
The script includes these custom functions you can use directly in spreadsheet cells:
- `=SHEETNAME()` - Returns active sheet name
- `=ALL SHEET NAMES()` - Lists all sheet names

## Troubleshooting

### "Service not enabled" error
Make sure your script has the necessary permissions. The first time you run a function, you'll need to authorize it.

### Vehicle not showing in dropdown
Check that:
- Your VehicleInfo sheet exists and is named correctly
- Vehicle names are in column A of the VehicleInfo sheet
- There are no empty cells breaking the list

### Web app not loading
The web app URL needs to be deployed. After saving the script:
1. Click **Deploy** → **New deployment**
2. Select **Web app**
3. Set "Execute as" to "Me" (your account)
4. Set "Who has access" to "Anyone" or "Anyone with the link"
5. Copy the deployed URL and update it in the code if needed