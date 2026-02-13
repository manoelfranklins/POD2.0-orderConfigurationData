sap.ui.define([
    "sap/dm/dme/pod2/widget/Widget",
    "sap/dm/dme/pod2/widget/metadata/WidgetProperty",
    "sap/dm/dme/pod2/propertyeditor/BooleanPropertyEditor",
    "sap/dm/dme/pod2/propertyeditor/PropertyCategory",
    "sap/dm/dme/pod2/context/PodContext",
    "sap/dm/dme/pod2/api/order/OrderPublicApiClient",
    "sap/m/Panel",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/Label",
    "sap/m/Toolbar",
    "sap/m/ToolbarSpacer",
    "sap/m/SearchField",
    "sap/m/Button",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/core/Icon"
],
(
    Widget,
    WidgetProperty,
    BooleanPropertyEditor,
    PropertyCategory,
    PodContext,
    OrderPublicApiClient,
    Panel,
    Table,
    Column,
    ColumnListItem,
    Text,
    Label,
    Toolbar,
    ToolbarSpacer,
    SearchField,
    Button,
    MessageToast,
    MessageBox,
    JSONModel,
    Filter,
    FilterOperator,
    Sorter,
    Icon
) => {
    "use strict";

    console.log("=== OrderConfigurationData MODULE LOADING ===");

    class OrderConfigurationData extends Widget {

        static getDisplayName() {
            return "Order Configuration Data";
        }

        static getDescription() {
            return "Displays custom configuration data (customValues) from the selected order with filtering, sorting, and Excel export.";
        }

        static getIcon() {
            return "sap-icon://table-view";
        }

        static getCategory() {
            return "Custom Widgets";
        }

        static getDefaultConfig() {
            return {
                properties: {
                    visible: true,
                    autoRefresh: true,
                    showExportButton: true,
                    logToConsole: true
                }
            };
        }

        _createView() {
            console.log("=== OrderConfigurationData _createView ===");
            
            // Create JSON model for table data
            this._oModel = new JSONModel({
                customValues: [],
                orderNumber: "",
                loading: false
            });
            
            // Create search field
            this._oSearchField = new SearchField({
                width: "250px",
                placeholder: "Search by attribute or value...",
                liveChange: this._onSearch.bind(this)
            });
            
            // Create export button
            this._oExportButton = new Button({
                icon: "sap-icon://excel-attachment",
                text: "Export",
                type: "Transparent",
                visible: this.getPropertyValue("showExportButton"),
                press: this._onExportToExcel.bind(this)
            });
            
            // Create refresh button
            this._oRefreshButton = new Button({
                icon: "sap-icon://refresh",
                type: "Transparent",
                press: this._onRefresh.bind(this)
            });
            
            // Sort state
            this._sortAscending = true;
            this._sortColumn = "attribute";
            
            // Create table columns with sorting
            const oAttributeColumn = new Column({
                header: new Label({ text: "Attribute" }),
                sortIndicator: "Ascending"
            });
            oAttributeColumn.attachEvent("headerClick", () => this._onSort("attribute"));
            
            const oValueColumn = new Column({
                header: new Label({ text: "Value" })
            });
            oValueColumn.attachEvent("headerClick", () => this._onSort("value"));
            
            // Create table
            this._oTable = new Table({
                growing: true,
                growingThreshold: 50,
                noDataText: "No custom configuration data available. Select an order to view its configuration.",
                headerToolbar: new Toolbar({
                    content: [
                        new Label({ text: "Custom Configuration Data" }),
                        new ToolbarSpacer(),
                        this._oSearchField,
                        this._oExportButton,
                        this._oRefreshButton
                    ]
                }),
                columns: [
                    new Column({
                        header: new Button({
                            text: "Attribute",
                            type: "Transparent",
                            icon: "sap-icon://sort",
                            press: this._onSortAttribute.bind(this)
                        }),
                        width: "40%"
                    }),
                    new Column({
                        header: new Button({
                            text: "Value",
                            type: "Transparent",
                            icon: "sap-icon://sort",
                            press: this._onSortValue.bind(this)
                        }),
                        width: "60%"
                    })
                ],
                items: {
                    path: "/customValues",
                    template: new ColumnListItem({
                        cells: [
                            new Text({ text: "{attribute}" }),
                            new Text({ text: "{value}" })
                        ]
                    })
                }
            });
            
            this._oTable.setModel(this._oModel);
            
            // Create panel
            this._oPanel = new Panel(this.getId(), {
                headerText: "Order Configuration Data",
                expandable: true,
                expanded: true,
                visible: this.getPropertyValue("visible"),
                content: [this._oTable]
            });
            
            // Subscribe to order selection changes
            this._subscribeToOrderSelection();
            
            console.log("=== OrderConfigurationData view created ===");
            return this._oPanel;
        }

        _subscribeToOrderSelection() {
            this._log("Subscribing to order selection changes...");
            
            // Try to get order using getLastSelectedWorkListItem method
            try {
                const oLastItem = PodContext.getLastSelectedWorkListItem();
                this._log("getLastSelectedWorkListItem:", oLastItem);
                if (oLastItem) {
                    const sOrder = this._extractOrderFromItem(oLastItem);
                    if (sOrder) {
                        this._loadOrderData(sOrder);
                    }
                }
            } catch (e) {
                this._log("getLastSelectedWorkListItem not available:", e.message);
            }
            
            // Subscribe to selected work list items
            PodContext.subscribe("/selectedWorkListItems", (aItems) => {
                this._log("Selected work list items changed:", aItems);
                if (aItems && aItems.length > 0) {
                    const sOrder = this._extractOrderFromItem(aItems[0]);
                    if (sOrder) {
                        this._loadOrderData(sOrder);
                    }
                }
            }, this);
            
            // Try getSelectedWorkListItems method
            try {
                const aSelected = PodContext.getSelectedWorkListItems();
                this._log("getSelectedWorkListItems:", aSelected);
                if (aSelected && aSelected.length > 0) {
                    const sOrder = this._extractOrderFromItem(aSelected[0]);
                    if (sOrder) {
                        this._loadOrderData(sOrder);
                    }
                }
            } catch (e) {
                this._log("getSelectedWorkListItems not available:", e.message);
            }
            
            // Check if there's already a selection via get()
            const aCurrentItems = PodContext.get("/selectedWorkListItems");
            this._log("Current /selectedWorkListItems:", aCurrentItems);
            if (aCurrentItems && aCurrentItems.length > 0) {
                const sOrder = this._extractOrderFromItem(aCurrentItems[0]);
                if (sOrder) {
                    this._loadOrderData(sOrder);
                }
            }
            
            // Log all available POD context data for debugging
            this._logAvailablePodContextData();
        }

        _extractOrderFromItem(oItem) {
            if (!oItem) return null;
            
            // Try various property names for order
            const sOrder = oItem.order || 
                          oItem.shopOrder || 
                          oItem.orderNumber ||
                          oItem.shopOrderRef?.order ||
                          oItem.shopOrderRef?.shopOrder ||
                          (typeof oItem.getOrder === "function" ? oItem.getOrder() : null) ||
                          (typeof oItem.getShopOrder === "function" ? oItem.getShopOrder() : null);
            
            this._log("Extracted order from item:", sOrder, "Item:", oItem);
            return sOrder;
        }

        _logAvailablePodContextData() {
            // Log what data is available in POD context
            const aPaths = [
                "/selectedWorkListItems",
                "/workList",
                "/selectedSfc",
                "/selectedOrder",
                "/selectedOperation",
                "/plant",
                "/resource",
                "/workCenter"
            ];
            
            this._log("=== POD Context Data ===");
            aPaths.forEach(sPath => {
                try {
                    const vValue = PodContext.get(sPath);
                    this._log(`${sPath}:`, vValue);
                } catch (e) {
                    this._log(`${sPath}: Error - ${e.message}`);
                }
            });
            
            // Also try getPlant
            try {
                this._log("PodContext.getPlant():", PodContext.getPlant());
            } catch (e) {
                this._log("PodContext.getPlant() error:", e.message);
            }
        }

        async _loadOrderData(sOrderNumber) {
            if (!sOrderNumber) {
                this._log("No order number provided");
                return;
            }
            
            this._log("Loading order data for:", sOrderNumber);
            
            const sPlant = PodContext.getPlant();
            if (!sPlant) {
                this._log("Plant not available");
                MessageToast.show("Plant not available");
                return;
            }
            
            this._oModel.setProperty("/loading", true);
            this._oModel.setProperty("/orderNumber", sOrderNumber);
            this._oPanel.setHeaderText(`Order Configuration Data - ${sOrderNumber}`);
            
            try {
                // Build API URL - try different patterns
                // Pattern 1: Use jQuery.ajax with REST data source pattern
                const oData = await this._callOrderApi(sPlant, sOrderNumber);
                this._log("API response:", oData);
                
                // Extract customValues
                let aCustomValues = [];
                
                if (oData && oData.customValues) {
                    aCustomValues = this._parseCustomValues(oData.customValues);
                } else if (oData && Array.isArray(oData) && oData.length > 0) {
                    // Response might be an array
                    const oOrder = oData[0];
                    if (oOrder.customValues) {
                        aCustomValues = this._parseCustomValues(oOrder.customValues);
                    }
                }
                
                this._log("Custom values extracted:", aCustomValues.length);
                this._oModel.setProperty("/customValues", aCustomValues);
                
                if (aCustomValues.length === 0) {
                    MessageToast.show("No custom configuration data found for this order");
                } else {
                    MessageToast.show(`Loaded ${aCustomValues.length} configuration entries`);
                }
                
            } catch (oError) {
                console.error("[OrderConfigData] API Error:", oError);
                MessageToast.show("Error loading order data: " + oError.message);
                this._oModel.setProperty("/customValues", []);
            } finally {
                this._oModel.setProperty("/loading", false);
            }
        }

        async _callOrderApi(sPlant, sOrderNumber) {
            this._log("Calling Order API via OrderPublicApiClient...");
            
            // Create API client instance
            const oClient = new OrderPublicApiClient();
            
            // Build request object
            const oRequest = {
                plant: sPlant,
                order: sOrderNumber
            };
            
            this._log("API Request:", oRequest);
            
            // Call getOrder method
            const oResponse = await oClient.getOrder(oRequest);
            
            this._log("OrderPublicApiClient response:", oResponse);
            return oResponse;
        }

        _parseCustomValues(oCustomValues) {
            const aResult = [];
            
            if (Array.isArray(oCustomValues)) {
                // Array format: [{attribute: "key", value: "val"}, ...]
                oCustomValues.forEach(item => {
                    if (item.attribute !== undefined && item.value !== undefined) {
                        aResult.push({
                            attribute: String(item.attribute),
                            value: String(item.value)
                        });
                    } else if (typeof item === "object") {
                        // Object with key-value pairs
                        Object.keys(item).forEach(key => {
                            aResult.push({
                                attribute: key,
                                value: String(item[key])
                            });
                        });
                    }
                });
            } else if (typeof oCustomValues === "object") {
                // Object format: {key1: val1, key2: val2, ...}
                Object.keys(oCustomValues).forEach(key => {
                    const value = oCustomValues[key];
                    if (typeof value === "object" && value !== null) {
                        // Nested object
                        aResult.push({
                            attribute: key,
                            value: JSON.stringify(value)
                        });
                    } else {
                        aResult.push({
                            attribute: key,
                            value: String(value ?? "")
                        });
                    }
                });
            }
            
            return aResult;
        }

        _onSearch(oEvent) {
            const sQuery = oEvent.getParameter("newValue");
            const aFilters = [];
            
            if (sQuery && sQuery.length > 0) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("attribute", FilterOperator.Contains, sQuery),
                        new Filter("value", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            }
            
            const oBinding = this._oTable.getBinding("items");
            if (oBinding) {
                oBinding.filter(aFilters);
            }
        }

        _onSortAttribute() {
            this._onSort("attribute");
        }

        _onSortValue() {
            this._onSort("value");
        }

        _onSort(sColumn) {
            if (this._sortColumn === sColumn) {
                this._sortAscending = !this._sortAscending;
            } else {
                this._sortColumn = sColumn;
                this._sortAscending = true;
            }
            
            const oBinding = this._oTable.getBinding("items");
            if (oBinding) {
                oBinding.sort(new Sorter(sColumn, !this._sortAscending));
            }
            
            this._log(`Sorted by ${sColumn}, ascending: ${this._sortAscending}`);
        }

        _onRefresh() {
            const sOrder = this._oModel.getProperty("/orderNumber");
            if (sOrder) {
                this._loadOrderData(sOrder);
            } else {
                MessageToast.show("No order selected");
            }
        }

        _onExportToExcel() {
            const aData = this._oModel.getProperty("/customValues");
            const sOrderNumber = this._oModel.getProperty("/orderNumber");
            
            if (!aData || aData.length === 0) {
                MessageToast.show("No data to export");
                return;
            }
            
            this._log("Exporting to Excel, rows:", aData.length);
            
            // Create CSV content
            let sCsvContent = "Attribute,Value\n";
            aData.forEach(row => {
                // Escape values that contain commas or quotes
                const sAttribute = this._escapeCSV(row.attribute);
                const sValue = this._escapeCSV(row.value);
                sCsvContent += `${sAttribute},${sValue}\n`;
            });
            
            // Create download
            const sFilename = `OrderConfig_${sOrderNumber || "export"}_${new Date().toISOString().slice(0, 10)}.csv`;
            const oBlob = new Blob(["\ufeff" + sCsvContent], { type: "text/csv;charset=utf-8;" });
            
            // Create download link
            const oLink = document.createElement("a");
            if (oLink.download !== undefined) {
                const sUrl = URL.createObjectURL(oBlob);
                oLink.setAttribute("href", sUrl);
                oLink.setAttribute("download", sFilename);
                oLink.style.visibility = "hidden";
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                URL.revokeObjectURL(sUrl);
                
                MessageToast.show(`Exported ${aData.length} rows to ${sFilename}`);
            } else {
                MessageToast.show("Export not supported in this browser");
            }
        }

        _escapeCSV(sValue) {
            if (!sValue) return "";
            const sStr = String(sValue);
            // If contains comma, newline, or quote, wrap in quotes and escape quotes
            if (sStr.includes(",") || sStr.includes("\n") || sStr.includes('"')) {
                return '"' + sStr.replace(/"/g, '""') + '"';
            }
            return sStr;
        }

        _log(sMessage, oData) {
            if (this.getPropertyValue("logToConsole")) {
                if (oData !== undefined) {
                    console.log("[OrderConfigData] " + sMessage, oData);
                } else {
                    console.log("[OrderConfigData] " + sMessage);
                }
            }
        }

        getProperties() {
            return [
                new WidgetProperty({
                    displayName: "Visible",
                    description: "Show or hide the widget panel",
                    category: PropertyCategory.Main,
                    propertyEditor: new BooleanPropertyEditor(this, "visible")
                }),
                new WidgetProperty({
                    displayName: "Auto Refresh",
                    description: "Automatically load data when order selection changes",
                    category: PropertyCategory.Main,
                    propertyEditor: new BooleanPropertyEditor(this, "autoRefresh")
                }),
                new WidgetProperty({
                    displayName: "Show Export Button",
                    description: "Show the Excel export button",
                    category: PropertyCategory.Main,
                    propertyEditor: new BooleanPropertyEditor(this, "showExportButton")
                }),
                new WidgetProperty({
                    displayName: "Log to Console",
                    description: "Enable console logging for debugging",
                    category: PropertyCategory.Main,
                    propertyEditor: new BooleanPropertyEditor(this, "logToConsole")
                })
            ];
        }

        getPropertyValue(sName) {
            const vValue = super.getPropertyValue(sName);
            
            switch (sName) {
                case "visible":
                case "autoRefresh":
                case "showExportButton":
                    return vValue !== false;
                case "logToConsole":
                    return vValue === true;
            }
            
            return vValue;
        }

        setPropertyValue(sName, vValue) {
            if (sName === "visible" && this._oPanel) {
                this._oPanel.setVisible(vValue);
            }
            if (sName === "showExportButton" && this._oExportButton) {
                this._oExportButton.setVisible(vValue);
            }
            super.setPropertyValue(sName, vValue);
        }

        onExit() {
            console.log("=== OrderConfigurationData onExit ===");
            PodContext.unsubscribeAll(this);
            super.onExit && super.onExit();
        }
    }

    console.log("=== OrderConfigurationData MODULE LOADED ===");

    return OrderConfigurationData;
});