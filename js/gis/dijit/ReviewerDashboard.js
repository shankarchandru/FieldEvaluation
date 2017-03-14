define([
	"dojo/_base/declare",
	"dojo/dom",
	"dojo/dom-style",
	"dojo/_base/array",
	"dojo/query",
	"dojo/_base/lang",
	"dojo/_base/html",
	"dojo/Evented",
	"dojo/_base/Color",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/layout/ContentPane",
	"dijit/layout/TabContainer",
	"dijit/form/Button",
	"dijit/form/Select",
	"dijit/form/RadioButton",
	"esri/tasks/datareviewer/DashboardTask",
	"esri/tasks/datareviewer/ReviewerFilters",
	"./ReviewerMapHelper",
	"esri/tasks/datareviewer/ReviewerResultsTask",
	"dojox/charting/Chart",
	"dojox/charting/axis2d/Default",
	"dojox/charting/plot2d/Lines",
	"dojox/charting/plot2d/Bars",
    "dojox/charting/plot2d/Pie",
	"dojox/charting/plot2d/Columns",
	"dojox/charting/action2d/Highlight",
	"dojox/charting/action2d/Tooltip",
	"dojox/charting/widget/Legend",
	"dojo/fx/easing",
	"dojox/charting/action2d/MoveSlice",
	"dojox/charting/themes/Claro",
    "esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleFillSymbol",
	"esri/toolbars/draw",
	"esri/graphic",
	"esri/request",
	"esri/layers/ArcGISDynamicMapServiceLayer",
	"esri/layers/ImageParameters",
	"esri/geometry/Polygon",
	"dojo/text!./ReviewerDashboard/templates/ReviewerDashboard.html",
	'xstyle/css!./ReviewerDashboard/css/ReviewerDashboard.css',
	], 
	function(declare, dom, domStyle, array, query, lang, html, Evented, Color, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, ContentPane, TabContainer,
			Button, Select, RadioButton, DashboardTask, ReviewerFilters, ReviewerMapServerHelper, ReviewerResultsTask, Chart, Default, Lines, Bars, Pie, Columns, 
			Highlight, Tooltip, Legend, easing, MoveSlice, Claro, SimpleLineSymbol, SimpleFillSymbol, Draw, Graphic, esriRequest, ArcGISDynamicMapServiceLayer,
			ImageParameters,Polygon, template) {
		return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
			templateString: template,
			widgetsInTemplate: true,
			title: "Dashboard",
			_dashboardTask: null,
			_resultsTask: null,
			_reviewerMapHelper: null,
			_selectedSpatialFilterType: "",
			_selectedField: "SEVERITY", //default
			_selectedSessionId: "All", //default
			_selectedChartType: "PIE", //default
			_lastSeriesName: "",
			_lastPlotName: "",
			_reviewerLayer: null,
			_currentChart: null,
			_sessionList: [],
            _firstTabClickEvent: false,
			_spatialFilterGeometry: null,
			
			postMixInProperties: function() {
				this.inherited(arguments);
				
				if(!this.drsSoeUrl)
					this.drsSoeUrl = "http://localhost:6080/arcgis/rest/services/AddressManagement/AddressDataManagement_QA/MapServer/exts/DataReviewerServer";
				
				this._dashboardTask = new DashboardTask(this.drsSoeUrl);
				this._resultsTask = new ReviewerResultsTask(this.drsSoeUrl);
				this._reviewerMapHelper = new ReviewerMapServerHelper(this.drsSoeUrl,null,null,null,null);
			},
			
			postCreate: function() {
				this.inherited(arguments);
				
				this.dashboardColors= [ 
					[232, 148, 12, 0.5], 
					[152, 192, 0, 0.5], 
					[12, 189, 232, 0.5], 
					[242, 218, 154, 0.5], 
					[231, 67, 39, 0.5],
					[130, 208, 245, 0.5],
					[135, 135, 134, 0.5],
					[69, 43, 127, 0.5],
					[154, 139, 118, 0.5],
					[94, 65, 47, 0.5]
				]
			},
			
			startup: function() {
				this.inherited(arguments);
				
				this._loadSessions();
				
				var user = JSON.parse(sessionStorage.getItem("loggedInUser"));
				
                //listen for when dashboard tab is clicked and create dashboard chart
                this.tabContainer.watch("selectedChildWidget", lang.hitch(this, function(name, oval, nval) {
                    //this event gets fired twice on each click, we only want to act on it once
                    if(this._firstTabClickEvent) {
                        this._firstTabClickEvent = false;
                        if(nval.id == "dashboardTab")
                            this.getResults();
                    }
                    else
                        this._firstTabClickEvent = true;

                }));
			},
			
			destroy: function() {
				if(null != this._currentChart)
					this._currentChart().destroy();
					
				this.inherited(arguments);
			},
			
			resize: function() {
				if(this.tabContainer && this.tabContainer.resize)
					this.tabContainer.resize();
			},
			
			getResults: function(event) {
				lang.hitch(this, this._getDashboardResults());
			},
			
			setMap: function(mapObject) {
				this.map = mapObject;
			},
			
			_loadSessions: function() {
				//get logged in user
				var user = JSON.parse(sessionStorage.getItem("loggedInUser"));
				if(null == user) {
					alert("User not logged in. Please login to application");
					window.location.href = "login.html";
				}

                //populate session dropdown
                var dfdSessions = this._dashboardTask.getReviewerSessions();
                dfdSessions.then(lang.hitch(this, function (response) {

					this._sessionList = [];
                    while(this.sessionNameSelect.options.length > 0) {
                        this.sessionNameSelect.options.remove(0);
                    }

					if(user.isAdmin)
						this.sessionNameSelect.options.add(new Option("All Sessions", "All"));

                    var listSessions = response.reviewerSessions;
                    array.forEach(listSessions, lang.hitch(this,function(session, i) {
						this._sessionList.push(session);
						if(user.isAdmin || user.sessions.indexOf(session.sessionId) > -1) {
							var option = new Option(session.toString(), session.sessionId);
							this.sessionNameSelect.options.add(option);
						}
                    }));
                }));
            },

			_initDraw:function() {
				if(null == this.map)
					return;
					
				this._toolbar = null;	
				this._toolbar = new Draw(this.map);
				this.mapClickMode.current = 'draw';
				this._toolbar.activate(Draw.POLYGON);
				this._toolbar.on("draw-end",lang.hitch(this,function(graphic) {
					this._toolbar.deactivate();
					this.mapClickMode.current = this.mapClickMode.defaultMode;
					var symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, 
						new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_DASHDOT, 
						new dojo.Color([255,0,0]), 2), new dojo.Color([255,255,0,0.25]));
						
					var mapGraphic = new Graphic(graphic.geometry, symbol); 
					this.map.graphics.add(mapGraphic);
                    this._spatialFilterGeometry = graphic.geometry;
				}));
			},
			
			_getDashboardResults: function () {
				

				
				//Field user has selected and dashboard will aggregate results on.
				var fieldName = this._selectedField;

				//Create ReviewerFilters object to add attribute and spatial filters to dashboard
				var filters = new ReviewerFilters();
				
				//Add Session filter and spatial filter if it exists.
				if(this._selectedSessionId != "" && this._selectedSessionId != "All")
					filters.addAttributeFilter("SESSIONID", parseInt(this._selectedSessionId));
				if(null != this._spatialFilterGeometry && (this._selectedSpatialFilterType == "DRAW" || this._selectedSpatialFilterType == "EXTENT"))
					filters.addSpatialFilter(this._spatialFilterGeometry);
					
				//Get dashboard results using Reviewer DashboardTask
				var dfdDashboardResults;
				if(filters != null && filters.getCount() > 0)
					dfdDashboardResults = this._dashboardTask.getDashboardResults(fieldName, filters);
				else
					dfdDashboardResults = this._dashboardTask.getDashboardResults(fieldName);

				dfdDashboardResults.then(lang.hitch(this, function(response) {             
					
					this.RefreshChart(response.dashboardResult);

				}));
			},

	
			_clearChart: function() {
				if(null == this._currentChart)
					return;

				this._currentChart.destroy();
				this._currentChart = null;
				
				var legend = dom.byId("chartLegend");
				if (null != legend)
					html.empty(legend);
				
				html.empty(dom.byId("chartContainer"));
			},
			
			_setupChart: function(plotName, seriesName, series) {
				
				this._currentChart = new Chart(dom.byId("chartContainer"));
				
				if(this._selectedChartType == "BAR") {
					this._currentChart.addPlot(plotName, {
						type: Bars,
						animate: {
							duration: 2000,
							easing: easing.bounceInOut
						},
						enableCache: true,
						markers: true,
						minBarSize: 1,
						minBarSize: 1,
						maxBarSize: 15
					});
					this._currentChart.addAxis("x", { fixLower: "minor", fixUpper: "minor", natural: true, includeZero: true  });
					this._currentChart.addAxis("y", { vertical: true, fixLower: "major", fixUpper: "major", includeZero: true });
					this._currentChart.addSeries(seriesName, series, {
						stroke: {
							color: "#FFFFFF"
						},
						fill: "#1f77b4"
					});
				}
				else {
					this._currentChart.addPlot(plotName, {
						type: Pie,
						animate: {
						  duration: 2000,
						  //easing: easing.bounceInOut
						},
						radius: 120,
						labelOffset: 10,
						labelStyle: "default",
						htmlLabels: true,
						markers: true
					});
					
					this._currentChart.addSeries(seriesName, series);
				}
				
				new Tooltip(this._currentChart, "default");
				new Highlight(this._currentChart, "default");
				
				this._currentChart.connectToPlot("default", lang.hitch(this, function(args) {
					if(args.type == "onclick") {
										//get logged in user
						var user = JSON.parse(sessionStorage.getItem("loggedInUser"));
						var session = ("All" == this._selectedSessionId || "" == this._selectedSessionId) ? -1 : parseInt(this._selectedSessionId);
						var eventArguments = { 
							fieldName: this._selectedField,
							fieldValue: isNaN(args.run.data[args.index].name) ? args.run.data[args.index].name : parseInt(args.run.data[args.index].name),
							sessionId: session
						};
						this.emit("chartClicked", eventArguments);
					}
					/*
					else if(args.type == "ondoubleclick") {
						console.log ("DoubleClicked");
						var user = JSON.parse(sessionStorage.getItem("loggedInUser"));
						if(user.isAdmin) {
							//doubleclicking the chart will refresh the chart grid.
							this._selectedField = "severity";
							this._selectedSessionId = isNaN(args.run.data[args.index].name) ? args.run.data[args.index].name : parseInt(args.run.data[args.index].name);
							this._getDashboardResults()
							
						}
					}*/
					
				}));
			},

            RefreshChart: function(dashboardResult) {
                if(null == dashboardResult)
                    return;
					
					//Get layer drawing options
					var dfdLayerDrawingOptions;
					if (dashboardResult.fieldName.toUpperCase()=="SEVERITY" || dashboardResult.fieldName.toUpperCase()=="LIFECYCLESTATUS" )
						dfdLayerDrawingOptions = this._reviewerMapHelper.getLayerDrawingOptions(dashboardResult,null,null);
					else
					{
					  var colorMap = this._createColorMap(dashboardResult.fieldValues);
					  dfdLayerDrawingOptions = this._reviewerMapHelper.getLayerDrawingOptions(dashboardResult,colorMap,null);
					}
					
					dfdLayerDrawingOptions.then(lang.hitch(this,function(optionsResponse) {
						
						lang.hitch(this, this._refreshChart(dashboardResult, optionsResponse.layerDrawingOptions));
						
                        if(null != this._reviewerLayer) {
                            if (dashboardResult == null || dashboardResult.filters == null || dashboardResult.filters.getCount() == 0) {
                                this._reviewerLayer.setDefaultLayerDefinitions();
                                this._reviewerLayer.setLayerDrawingOptions(optionsResponse.layerDrawingOptions.layerDrawingOptionsArray);
                            }
                            else {
                                var dfdLayerDef = this._resultsTask.getLayerDefinition(dashboardResult.filters);
                                dfdLayerDef.then(lang.hitch(this, function (response) {
                                    this._reviewerLayer.setLayerDrawingOptions(optionsResponse.layerDrawingOptions.layerDrawingOptionsArray, true);
                                    this._reviewerLayer.setLayerDefinitions([response.whereClause, response.whereClause, response.whereClause]);
                                }));
                            }
                        }

                        this._clearSpatialFilter();
						
					}), this._errorHandler
					);
			},
			
			_refreshChart: function(dashboardResult, layerDrawingOptions) {
				if(typeof dashboardResult === "undefined" || typeof layerDrawingOptions === "undefined")
					return;
				
				this._clearChart();
					
				if(1 > dashboardResult.fieldValues.length) {
					var noResults = dom.byId("noresults");
					if(null != noResults)
						noResults.style.display = "block";
                    return;
				}
				else {
					var noResults = dom.byId("noresults");
					if(null != noResults)
						noResults.style.display = "none";
				}
				
                var isLifecycleStatusField = String(this._selectedField).toLowerCase() == "lifecyclestatus" ? true : false;
				var legendContainer = dom.byId("chartLegend");
				var legendTable = html.create('table', {'class':'dynamicLegendTable', 'id':'legendTable'}, legendContainer);
				
				// format results [{text:<label>,y:<value>}]
				var series = [];
				var i = 1;
				array.forEach(dashboardResult.fieldValues, lang.hitch(this, function(item, i) {
					var itemValue = String(this._selectedField).toUpperCase() == "SESSIONID" ? this._getSessionName(item) : item;
                    if(isLifecycleStatusField)
                        itemValue = this._getLifeCycleStatusDescription(Number(item));

					series.push({
                        text : itemValue,
						x : item,
						y : dashboardResult.getCount(item),
						name: item,
						tooltip: "<div style='color:green;margin-right:10px;position:relative'><span style='white-space:nowrap;'>"+itemValue+":</span><br/><span> " + dashboardResult.getCount(item) + "</span></div>",
						color: layerDrawingOptions.colorMap[item].toHex()
					});
					//create legend items					
					var	legendRow = html.create('tr', null, legendTable);
					var legendColor = layerDrawingOptions.colorMap[item].toHex();
					var legendIconContainer = html.create('td', {'class':'legendIcon', 'style':{'backgroundColor':legendColor } }, legendRow);
					var legendLabel = html.create('td', {'title': itemValue}, legendRow);
					var divWrapper = html.create('div', {'class':'legendContent', 'innerHTML': itemValue }, legendLabel);
				}));

				var resultField = dashboardResult.fieldName;
				
				var chartMedia={
					chartField:resultField,
					description:"",
					title:resultField,
					type:this._selectedChartType
				};
					
				this._setupChart("default", resultField, series);
				this._currentChart.media = chartMedia;
				this._currentChart.render();
			},
	
			_createColorMap : function(fieldValues) {
				var colorMap = new Object();
				for (var i = 0; i < fieldValues.length; i++)
				{
				  if (i < this.dashboardColors.length)
					colorMap[fieldValues[i]] = new Color(this.dashboardColors[i])
				}
				 return  colorMap;
			},
			
			_errorHandler: function(task, error) {
				alert("Error executing " + task + ". " + error);
			},
			
			_getSessionName: function(id) {
				for(var i = 0; i < this._sessionList.length; i++) {
					if(this._sessionList[i].sessionId == Number(id)) {
						return this._sessionList[i].sessionName;
					}
				}
					return id;
			},
			
			_onRadioButtonClicked: function(event) {
				this._selectedField = event.srcElement.value;
			},
			
			_onSpatialFilterClicked: function(event) {

                this._clearSpatialFilter();

				this._selectedSpatialFilterType = event.srcElement.id;
				if(this._selectedSpatialFilterType == "DRAW")
					this._initDraw();
				else if(this._selectedSpatialFilterType == "EXTENT" && null != this.map) {
					//create poly out of extent
					var mapExtent = this.map.extent;
					var polygon = new Polygon(mapExtent.spatialReference);
					var xmin = mapExtent.xmin;
					var xmax = mapExtent.xmax;
					var ymin = mapExtent.ymin;
					var ymax = mapExtent.ymax;
					polygon.addRing([[xmin,ymin],[xmin,ymax],[xmax,ymax],[xmax,ymin],[xmin,ymin]]);
		            this._spatialFilterGeometry = polygon;
				}
			},

            _clearSpatialFilter: function() {
                //clear spatial filter

                this._spatialFilterGeometry = null;
                this.map.graphics.clear();
                if(null != this._toolbar)
                    this._toolbar.deactivate();
                this.mapClickMode.current = this.mapClickMode.defaultMode;
            },

			_onSessionChanged: function(event) {
				if(event.srcElement.selectedIndex > -1)
					this._selectedSessionId = event.srcElement.options[event.srcElement.selectedIndex].value;
			},
			
			_onChartTypeClicked: function(event) {
				this._selectedChartType = event.srcElement.value;
			},
            _onShowLayersClicked: function(event) {
                if(event.srcElement.checked) {
                    this._removeReviewerLayers();
                    this._addReviewerLayers();
                }
                else {
                    this._removeReviewerLayers();
                }
            },
            _onClickRefreshSessions: function(event) {
                this._loadSessions();
            },
			_addReviewerLayers: function() {
				if(null == this.map)
					return;
										
				var url = this.drsSoeUrl.split("exts/")[0];
				if(url.lastIndexOf("/") == url.length - 1)
					url = url.substring(0, url.lastIndexOf("/"));
					
				this._reviewerLayer = new ArcGISDynamicMapServiceLayer(url);

				this.map.addLayer(this._reviewerLayer, this.map.layerIds.length - 1);
                var visibleLayers = [0,1,2];
                this._reviewerLayer.setVisibleLayers(visibleLayers);
			},
			_removeReviewerLayers: function() {
				if(null != this._reviewerLayer) {
                    this.map.removeLayer(this._reviewerLayer);
                    this._reviewerLayer = null;
				}
			},
			_getLifeCycleStatusDescription: function(lifecyclecode) {
				switch(lifecyclecode) {
					case 0:
						return "Unknown";
						break;
					case 1:
						return "Reviewed";
						break;
					case 2:
						return "Resolved";
						break;
					case 3:
						return "Mark As Exception";
						break;
					case 4:
						return "Acceptable";
						break;
					case 5:
						return "Exception";
						break;
					case 6:
						return "Unacceptable";
						break;
					case 7:
						return "Unacceptable";
						break;
					case 8:
						return "Exception";
						break;
					case 9:
						return "Exception";
						break;
					case 10:
						return "New";
						break;
					case 11:
						return "Passed";
						break;
					case 12:
						return "Failed";
						break;
					default:
						return "Unknown";
						break;
				}
			}
		});
	});