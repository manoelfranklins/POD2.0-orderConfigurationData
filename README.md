# Order Configuration Data Widget

A POD 2.0 widget that displays custom configuration data (`customValues`) from the selected order.

## Features

- Displays order customValues in a searchable, sortable table
- Auto-loads when an order is selected
- Export to CSV/Excel
- Filtering and sorting by attribute/value

## Installation

**Namespace:** `custom/orderconfigdata`

Upload as a ZIP file containing:
```
extension.json
widget/
  OrderConfigurationData.js
```

## Files

```
20displayOrderCustomData/
├── extension.json
├── README.md
└── widget/
    └── OrderConfigurationData.js
```

## extension.json

```json
{
    "widgets": [
        {
            "modulePath": "custom/orderconfigdata/widget/OrderConfigurationData",
            "type": "custom.orderconfigdata.widget.OrderConfigurationData"
        }
    ]
}
```

## Usage

1. Upload the extension to **Manage PODs 2.0** with namespace `custom/orderconfigdata`
2. Add the widget to a POD page
3. Select an order in the worklist
4. The widget automatically displays the order's customValues

## Properties

| Property | Description | Default |
|----------|-------------|---------|
| Visible | Show/hide the widget | true |
| Auto Refresh | Auto-load on order selection | true |
| Show Export Button | Show CSV export button | true |
| Log to Console | Enable debug logging | true |

## API

This widget uses `OrderPublicApiClient` to fetch order data:

```javascript
const oClient = new OrderPublicApiClient();
const oResponse = await oClient.getOrder({
    plant: sPlant,
    order: sOrderNumber
});
```

See `POD2_API_Guide.md` for comprehensive API documentation.