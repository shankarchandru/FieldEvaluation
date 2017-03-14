define([
	"dojo/_base/declare",
	"dijit/Toolbar",
	"dijit/form/DropDownButton",
	"dijit/TooltipDialog",
	"dijit/form/TextBox",
	"dijit/form/Button",
	"dijit/form/Select",
	"dijit/popup",
	"dijit/registry",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dgrid/OnDemandGrid",
	"dgrid/Selection",
	"stores/ReviewerResultsStore",
	"dojo/_base/lang",
	"dojo/_base/Color",
	"dojo/_base/array",
	"dojo/dom",
	"esri/tasks/QueryTask",
    "esri/tasks/query",
	"esri/tasks/datareviewer/ReviewerLifecycle",
	"esri/tasks/datareviewer/ReviewerResultsTask",
	"esri/tasks/datareviewer/ReviewerFilters",	
	"esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleFillSymbol",
	"esri/graphic",
	"dojo/text!./ReviewerResultsGrid/templates/ReviewerResultsGrid.html",
	"dojo/domReady!"
	],function(declare,Toolbar,DropDownButton,TooltipDialog,TextBox,Button,Select,PopUp,Registry,_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, OnDemandGrid, Selection, ReviewerResultsStore, lang, dojoColor, arrayUtil, domUtil, QueryTask, Query, ReviewerLifecycle,ReviewerResultsTask, ReviewerFilters,SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Graphic,template) {
		
	return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		templateString: template,
		widgetsInTemplate: true,
		_resultsGrid: null,
        _field: "LINKID",
        _resultIDProperty: "",
		_rowsSelected:[],
		_reviewerResultsTask:null,
		lastQuery:null,
		
		constructor: function(options) {
			if(null != options && typeof options.columns === "undefined") {
				//default columns
				options.columns = {
					recordId: "ID",
					checktitle: "Check Title",
					resourceName: "Resource",
					severity: "Severity"
				}
			}
			if(null != options && typeof options.returnFields === "undefined")
				this.returnFields = ["recordId","checktitle","resourceName","severity","geometryType"];
			
			declare.safeMixin(this, options);
			this.inherited(arguments);
		},
		
		postMixInProperties: function() {
			this.inherited(arguments);
			
			if(typeof this.drsSoeUrl === "undefined")
				this.drsSoeUrl = "http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement_QA/MapServer/exts/DataReviewerServer";
			
			this._reviewerResultsTask = new ReviewerResultsTask(this.drsSoeUrl);			
			
		},
		
		postCreate: function () {
			this.inherited(arguments);
			
			//if(this.options.showToolbar)
				//this._launchToolbar();
			
			var resultsStore = new ReviewerResultsStore({
				returnFields: this.returnFields, 
				drsSoeUrl: this.drsSoeUrl,
				pageSize: 500,
				totalCount: 10000
			});
			
            this._resultIDProperty = resultsStore.idProperty;

			var ReviewerResultsGrid = declare([OnDemandGrid,Selection]);
			this._resultsGrid = new ReviewerResultsGrid({
				columns: this.columns,
				store: resultsStore
			}, this.gridContainer);
			
			this._resultsGrid.on("dgrid-error", lang.hitch(this, this._showError));
			this._resultsGrid.on("dblclick", lang.hitch(this, "_onDoubleClick"));
			this._resultsGrid.on("dgrid-select", lang.hitch(this, "_onSelection"));
			this._resultsGrid.on("dgrid-deselect", lang.hitch(this, "_onDeSelection"));
			this._resultsGrid.minRowsPerPage = 500;
			this._resultsGrid.maxRowsPerPage = 500;
			this._resultsGrid.pagingMethod = "debounce";
			this._resultsGrid.pagingDelay = 2000;
			this._resultsGrid.startup();
			this.maxEmptySpace = 200;
			this._rowsSelected = [];
		},
		
		destroy: function() {
			this.inherited(arguments);
			if(null != this._resultsGrid)
				this._resultsGrid.destroy();
		},
		
		resize: function() {
			if(this._resultsGrid && this._resultsGrid.resize)
				this._resultsGrid.resize();
		},
		
		setMap: function(map) {
			this.map = map;
		},
		
		refresh: function() {
			this._resultsGrid.refresh();
		},
		
		setQuery: function(query) {
			this.lastQuery = query; //set the last query to retrieve query which was populated for results grid.
			this._resultsGrid.set("query", query);
		},
		
		
		closeToolTipDialog: function(){
				//Get tooltip dialog
				var toolTipDialog = Registry.byId("StatusTooltipDialog");
				if(toolTipDialog)
					PopUp.close(toolTipDialog);
		},
		
		//Display the next lifecycle status that the selected results can move to in a dialog
		updateLifeCycleStatusDialog: function(){
			 if (this._rowsSelected.length > 0){
				var lifecycleList = [];
				//get an array of unique lifecycle status values of selected records
				for (i = 0; i < this._rowsSelected.length; i++){
					if (lifecycleList.indexOf(this._rowsSelected[i].lifecycleStatus) == -1){
						lifecycleList.push(this._rowsSelected[i].lifecycleStatus);
					}
				}
				lifecycleList.sort();
				
				//Get tooltip dialog
				var toolTipDialog = Registry.byId("StatusTooltipDialog");
			   //get lifecycle information from the ReviewerLifecycle helper class
				var lifecycleInfo = ReviewerLifecycle.getLifecycleInfo(lifecycleList);
				if (lifecycleInfo !== null){
					// Set up Logged in username if not admin
			//Update contributor Name to point to loggedIn user name;
					var user = JSON.parse(sessionStorage.getItem("loggedInUser"));
					if(!user.isAdmin)
					{
						Registry.byId("technicianName").value=user.username;	
					}					
					else 
					{
						Registry.byId("technicianName").value="";
					}
					
					var statusSelectObj = Registry.byId("statusSelect");
					if(statusSelectObj) {
						for(i=statusSelectObj.options.length-1;i>=0;i--){
							statusSelectObj.removeOption(i);
						}
						var selectOption = new Option("Select Status","");
						statusSelectObj.addOption(selectOption);
						arrayUtil.forEach(lifecycleInfo.nextLifecycleStatus, lang.hitch(this,function(nextStatus, i) {
							var option = new Option(ReviewerLifecycle.toLifecycleStatusString(nextStatus), nextStatus);
							statusSelectObj.addOption(option);
						}));
					}
				}
				else{
					PopUp.close(toolTipDialog);
					alert("The selected records cannot be updated to a common lifecycle status");
					return;
				}
				//var statusDialog = registry.byId("statusDialog");
				//statusDialog.show();
			}
			else{
				PopUp.close(toolTipDialog);
				alert("Please select records to update");
			}
		},	
		
		//calls the update lifecycleStatus method from the ReviewerResults task. If selected results are updated successfully a message will be displayed
		updateLifeCycleStatus:function (){
			var reviewerFilters = new ReviewerFilters();
			arrayUtil.forEach(this._rowsSelected, lang.hitch(this,function(selectedItem){
				reviewerFilters.addAttributeFilter("recordid", selectedItem.recordId);
			}));
			
			//Get Session ID
			var user = JSON.parse(sessionStorage.getItem("loggedInUser"));
			var sessionID;
			var technicianName;
			if( null != user ) {
				sessionID = user.sessions[0];
				technicianName = user.username;
			}
			else {
				sessionID = "4";
				technicianName = "Team D";
			}
			
			var deferred=this._reviewerResultsTask.updateLifecycleStatus(parseInt(sessionID),Registry.byId("statusSelect").value,technicianName,reviewerFilters);
			deferred.then(lang.hitch(this,function(response){
				//refresh datagrid
				//var grid = Registry.byId("ResultsGrid_widget");
				//var query = {};
				this._resultsGrid.refresh();
				//this._resultsGrid.setQuery(this._resultsGrid.lastQuery);				
				/*arrayUtil.forEach(response.featureEditResults,lang.hitch(this,function(featureEditResult){
					if (featureEditResult.success===false){
						alert("Error updating records from the selection");
						return;
					}       
				}));
				alert("Lifecycle Status updated"); */
			}, function(error){
				alert(error.message);
			}));
		},
		
		_onSelection: function(event) {
			arrayUtil.forEach(event.rows, lang.hitch(this, function(rowItem) {
				var position = arrayUtil.indexOf(this._rowsSelected,rowItem.data);
				if(position == -1) //add to Selection
				{
					this._rowsSelected.push(rowItem.data);
				}
			}));
			
		},
		
		_onDeSelection: function(event) {
			arrayUtil.forEach(event.rows, lang.hitch(this, function(rowItem) {
				var position = arrayUtil.indexOf(this._rowsSelected,rowItem.data);
				if(position > -1) //Remove from Selection
				{
					this._rowsSelected.splice(position,1);
				}
			}));		
		},			
		
		
		_onSearchClicked: function(event) {
			var searchValue = this.searchTextBox.value;
			var query = this._getQueryFromSearchText(searchValue);
			this.setQuery(query);
		},
		
		_getQueryFromSearchText: function(text) {
			if(text == "undefined" || text == "")
				return;
				
			var query = {};
			
			var queryStrings = text.split(",");
			
			for(var i = 0; i < queryStrings.length; i++) {
				var qString = queryStrings[i];
				if(qString.indexOf(":") == -1) {
					alert("Invalid Query. Query Syntax should be: [ColumnName] : [Value], ...");
					return;
				}
				var fieldAndValue = qString.split(":");
				var fieldName = this._getFieldNameFromColumn(fieldAndValue[0]);
				var fieldValue = fieldAndValue[1];
				query[fieldName] = fieldValue.trim();
			};
			
			return query;
		},
		
		_getFieldNameFromColumn: function(columnNameToMatch) {
			for(var key in this._resultsGrid.columns) {
				var column = this._resultsGrid.columns[key];
				var columnName = column.label;
				if(columnName.toLowerCase().trim() == columnNameToMatch.toLowerCase().trim())
					return column.field;
			}
			
			return "";
		},
		
		
		_onDoubleClick: function(event) {
			if(null === this.map || undefined === this.map)
				return;
				
			var cell = this._resultsGrid.cell(event);
			var rowData = cell.row.data;
			
			var layerURL = this.drsSoeUrl.split("exts/")[0];
			
			var queryTask = null;
			if (rowData.geometryType == 2) 
				queryTask = new QueryTask(layerURL + "/0");
            else if (rowData.geometryType == 3) 
                queryTask = new QueryTask(layerURL + "/1");
            else if (rowData.geometryType == 4) 
				queryTask = new QueryTask(layerURL + "/2");
               
			// define the query, based on the id of the row selected
			if(queryTask) { 
				var query = new Query();
				query.where = this._field + " = " + rowData[this._resultIDProperty];
				query.returnGeometry = true;
				query.outSpatialReference = this.map.spatialReference;
				// execute the query
				queryTask.execute(query, lang.hitch(this, "_zoomToResults"), lang.hitch(this, "_errorHandler"));
		   }
		},

		_zoomToResults: function(results) {
			if(null === results || "undefined" === typeof results)
				return;
			if (results.features && results.features.length > 0) {
				var red = new dojoColor([255,0,0]);
				var opaqueRed = new dojoColor([255,0,0,.5]);
				this.map.graphics.clear();
				arrayUtil.forEach(results.features, lang.hitch(this, function(feature) {
					var width = 5;
					if(feature.geometry.type == "polygon")
						feature.setSymbol(new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, red, width), opaqueRed));
					else if(feature.geometry.type == "polyline")
						feature.setSymbol(new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, red, width));
					else
						feature.setSymbol(new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, red, width), red));
					
					this.map.graphics.add(feature);
					this.map.centerAt(feature.geometry.getExtent().getCenter());
				}));
		   }
		},
		
		_errorHandler: function(error) {
			this._showError(error);
		},
		
		_showError: function(error) {
			this.gridErrorMessage.style = "visibility:visible;color:red";
			this.gridErrorMessage.title = error;
			if(lang.isFunction(error.stopPropagation))
				error.stopPropagation();
		},
		
		_clearError: function(event) {
			this.gridErrorMessage.title = "";
			this.gridErrorMessage.style = "visibility:hidden;color:red";
		}
	});
});