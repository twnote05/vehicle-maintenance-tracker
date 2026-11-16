# Vehicle Maintenance Tracking - Golden Version for Older Drivers

## Overview
This optimized version focuses on **ease of use, practical functions, and simple monitoring** for older vehicle drivers. The interface is simplified with larger text, fewer fields, and clear dashboard feedback.

## Setup Instructions

### 1. Open Google Sheets
Open your spreadsheet: https://docs.google.com/spreadsheets/d/15KrEjXnOx-PURw76UTGgKfE7d2-HnUPhAohLe_dMgxU/edit?gid=0#gid=0

### 2. Open Apps Script Editor
1. In Google Sheets, click **Extensions** → **Apps Script**
2. Delete any default code in the editor
3. Paste the code from `vehicle_maintenance_golden.gs`

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
- Name your project: "Vehicle Maintenance Tracker - Golden Edition"

### 5. Refresh the Spreadsheet
Go back to your spreadsheet and you should see a new menu: **Vehicle Tracker** with two options:
- **➕ Add Quick Record** - Simple form with just 3 fields
- **📊 Dashboard** - Health overview with alerts

## Using the System

### Add a New Maintenance Record (Quick Mode)
1. Click **Vehicle Tracker** → **➕ Add Quick Record**
2. Select your vehicle from the dropdown
3. Fill in: Service Type (required), Mileage (optional), Cost (optional)
4. Click "Add Record"
5. The record is saved and the dialog closes automatically

**Design rationale:** Only 3 required fields - older drivers can complete this in under 30 seconds.

### View Vehicle Health Dashboard
1. Click **Vehicle Tracker** → **📊 Dashboard**
2. See at a glance:
   - **Health Score** (0-100) - green/yellow/red indicators
   - **Total spent** on maintenance
   - **Number of records** and **vehicle(s)**
   - **Last service date**
   - **Maintenance alerts** if anything is overdue

**Key features for older drivers:**
- 🟢 **Green score** = vehicle well-maintained
- 🟡 **Yellow score** = attention needed soon  
- 🔴 **Red score** = overdue maintenance
- Clear large text and high contrast colors
- Simple "at a glance" numbers, no complex tables

### Understanding the Health Score
The dashboard calculates a health score based on:
- **100 points** = starting baseline
- **-15 points** per overdue service item
- **0 points** = no records entered

**Typical scenarios:**
- **100** = Just had service, records up to date
- **85** = One service due soon
- **70** = Multiple services approaching due
- **0** = No records in the system

### Quick Tips for Older Drivers
1. **Add records soon after service** - while it's fresh in memory
2. **Note the mileage** when you get service - helps track intervals
3. **Check the dashboard monthly** - easy 5-second health check
4. **Alert colors mean:**
   - Green = All good, keep going
   - Yellow = Plan next service soon
   - Red = Service overdue, schedule immediately

### Web App Alternative
You can also use the web app at:
```
https://script.google.com/macros/s/AKfycbwhqM4DZKR3wPiym5DUn5nI3CV0_H7FMvQBPb5YhLeyBnCGUk7x8i4I0Scp8SfR9jXJ1A/exec
```
This opens a simplified form optimized for phone/tablet browsers.

## Customizing

### Adjust Maintenance Intervals
If your vehicle has different service intervals, modify at the top of the code:
```javascript
const INTERVAL_MILEAGE = 5000;  // Check oil every 5,000 miles
const INTERVAL_MONTHS = 6;      // Full service every 6 months
```
Lower the mileage number if you want more frequent alerts.

### Add Vehicle Photos or Notes
The VehicleInfo sheet can include additional columns:
- Column A: Vehicle name (required - shown in dropdown)
- Column B: Model/Year
- Column C: VIN
- Column D: Photo URL (link to stored photo)

The dashboard will automatically display vehicle details when you select a vehicle.

### Change Alert Thresholds
Modify the health score calculation in `showDashboard()`:
```javascript
if (overdueItems.length > 0) healthScore -= 15 * overdueItems.length;
```
Change `15` to adjust how much each overdue item affects the score.