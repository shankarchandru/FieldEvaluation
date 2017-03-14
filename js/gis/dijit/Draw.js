define([
    'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/Deferred',
	'dojo/promise/all',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/Button',
	'dijit/registry',
    'dojo/_base/lang',
    'dojo/_base/Color',
    'esri/Color',
    'esri/toolbars/draw',
    'esri/layers/GraphicsLayer',
    'esri/graphic',
    'esri/request',
    'esri/renderers/SimpleRenderer',
    'dojo/text!./Draw/templates/Draw.html',
    'esri/renderers/UniqueValueRenderer',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleFillSymbol',
    'esri/layers/FeatureLayer',
    'esri/dijit/Popup',
    'dojo/dom-construct',
    'esri/dijit/InfoWindow',
    'esri/tasks/datareviewer/ReviewerResultsTask',
    'esri/tasks/datareviewer/ReviewerAttributes',
    './DrawErrorInfoWindowContent',
    'dojo/on',
    'xstyle/css!./Draw/css/Draw.css',
	'dojo/json'
], function(declare, array, Deferred, all, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Button,Registry, lang, Color, esriColor,Draw, GraphicsLayer, Graphic, esriRequest, SimpleRenderer, drawTemplate, UniqueValueRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, FeatureLayer, PopUp, domConstruct, InfoWindow, ReviewerResultsTask, ReviewerAttributes,DrawErrorInfoWindowContent, on, css, dojoJson) {

    // main draw dijit
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        widgetsInTemplate: true,
        templateString: drawTemplate,
        drawToolbar: null,
        graphics: null,
		reviewTechnician : null,
        buildRendering: function() {
          this.inherited(arguments);
        },
        postCreate: function() {
            this.inherited(arguments);
            this.drawToolbar = new Draw(this.map);
            var fill = new SimpleFillSymbol("solid", null, new esriColor("#A4CE67"));
        
             //ReviewerResultsTask, ReviewerAttributes
            this.resultsTask = new ReviewerResultsTask(this.drsSoeUrl);

            this.pointSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 1), new Color([255, 0, 0, 1.0]));

            this.polylineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color([255, 0, 0]), 1);

            this.polygonSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.0]));

            this.pointGraphics = new GraphicsLayer({
                id: 'drawGraphics_point',
                title: 'Draw Graphics'
            });
            this.pointRenderer = new SimpleRenderer(this.pointSymbol);
            this.pointRenderer.label = 'User drawn points';
            this.pointRenderer.description = 'User drawn points';
            this.pointGraphics.setRenderer(this.pointRenderer);
            this.map.addLayer(this.pointGraphics);

            this.polylineGraphics = new GraphicsLayer({
                id: 'drawGraphics_line',
                title: 'Draw Graphics'
            });
            this.polylineRenderer = new SimpleRenderer(this.polylineSymbol);
            this.polylineRenderer.label = 'User drawn lines';
            this.polylineRenderer.description = 'User drawn lines';
            this.polylineGraphics.setRenderer(this.polylineRenderer);
            this.map.addLayer(this.polylineGraphics);

            this.polygonGraphics = new FeatureLayer({
                layerDefinition: {
                    geometryType: 'esriGeometryPolygon',
                    fields: [{
                        name: 'OBJECTID',
                        type: 'esriFieldTypeOID',
                        alias: 'OBJECTID',
                        domain: null,
                        editable: false,
                        nullable: false
                    }, {
                        name: 'ren',
                        type: 'esriFieldTypeInteger',
                        alias: 'ren',
                        domain: null,
                        editable: true,
                        nullable: false
                    }]
                },
                featureSet: null
            }, {
                id: 'drawGraphics_poly',
                title: 'Draw Graphics',
                mode: FeatureLayer.MODE_SNAPSHOT
            });
            //this.polygonRenderer = new SimpleRenderer(this.polygonSymbol);
            this.polygonRenderer = new UniqueValueRenderer(new SimpleFillSymbol(), 'ren', null, null, ', ');
            this.polygonRenderer.addValue({
                value: 1,
                symbol: new SimpleFillSymbol({
                    color: [
                        255,
                        170,
                        0,
                        255
                    ],
                    outline: {
                        color: [
                            255,
                            170,
                            0,
                            255
                        ],
                        width: 1,
                        type: 'esriSLS',
                        style: 'esriSLSSolid'
                    },
                    type: 'esriSFS',
                    style: 'esriSFSForwardDiagonal'
                }),
                label: 'User drawn polygons',
                description: 'User drawn polygons'
            });
            //this.polygonRenderer.label = 'User drawn polygons';
            //this.polygonRenderer.description = 'User drawn polygons';
            this.polygonGraphics.setRenderer(this.polygonRenderer);
            this.map.addLayer(this.polygonGraphics);

            this.drawToolbar.on('draw-end', lang.hitch(this, 'onDrawToolbarDrawEnd'));
        },
        drawPoint: function() {
            this.disconnectMapClick();
            this.drawToolbar.activate(Draw.POINT);
        },
        drawLine: function() {
            this.disconnectMapClick();
            this.drawToolbar.activate(Draw.POLYLINE);
        },
        drawPolygon: function() {
            this.disconnectMapClick();
            this.drawToolbar.activate(Draw.POLYGON);
        },
        disconnectMapClick: function() {
            this.mapClickMode.current = 'draw';
            // dojo.disconnect(this.mapClickEventHandle);
            // this.mapClickEventHandle = null;
        },
        connectMapClick: function() {
            this.mapClickMode.current = this.mapClickMode.defaultMode;
            // if (this.mapClickEventHandle === null) {
            //     this.mapClickEventHandle = dojo.connect(this.map, 'onClick', this.mapClickEventListener);
            // }
        },
        onDrawToolbarDrawEnd: function(evt) {
            var point, polygon, line;
            var position;
            this.drawToolbar.deactivate();
            this.connectMapClick();
            var graphic;
            switch (evt.geometry.type) {
                case 'point':
                    graphic = new Graphic(evt.geometry);
                    this.pointGraphics.add(graphic);
                    position = evt.geometry;
                    break;
                case 'polyline':
                    graphic = new Graphic(evt.geometry);
                    this.polylineGraphics.add(graphic);
                    position = evt.geometry.getExtent().getCenter();
                    break;
                case 'polygon':
                    graphic = new Graphic(evt.geometry, null, {
                        ren: 1
                    });
                    this.polygonGraphics.add(graphic);
                    position = evt.geometry.getCentroid();
                    break;
                default:
            }
            
            this._resultGeometry = evt.geometry;
            
            var infoWindowContent = new DrawErrorInfoWindowContent({
              onReportSubmit: lang.hitch(this,function(reviewerAttributes) {
                this.submitReport(reviewerAttributes);
              }),
              onReportCancel: lang.hitch(this,function() {
                this.cancelReport();
              })
            }, domConstruct.create('div'));
            
			this.getLayersFromMap().then(lang.hitch(this, function(response) {
            infoWindowContent.startup();
			infoWindowContent.setGraphic(graphic);
			infoWindowContent.setLayers(response);
            var user = JSON.parse(sessionStorage.getItem("loggedInUser"));
            if( null != user ) {
                infoWindowContent.setLoggedInuser(user.username);

            }
            on.once(this.map.infoWindow, 'hide', function() {
              infoWindowContent.destroyRecursive();
            });
            this.map.infoWindow.setContent(infoWindowContent.domNode);
            this.map.infoWindow.setTitle('Report Feedback');
            this.map.infoWindow.resize(500,500);
            this.map.infoWindow.show(position);
			}), function (error) {
				if(error.code !== undefined && error.message !== undefined) {
					alert("Error getting map layers: " + response.error.code + " : " + response.error.message);
					return;
				}
			});
        },
        clearGraphics: function() {
            this.pointGraphics.clear();
            this.polylineGraphics.clear();
            this.polygonGraphics.clear();
            this.drawToolbar.deactivate();
            this.connectMapClick();
        },

        getLayersFromMap : function () {

            var layerUrls = [];
            if(this.map.graphicsLayerIds.length > 0) {
                array.forEach(this.map.graphicsLayerIds, lang.hitch(this, function (id, i) {
                    if(id.indexOf("drawGraphics_") == -1) {
                        var layer = this.map.getLayer(id);
                        if(-1 == layerUrls.indexOf(layer.url))
                            layerUrls.push(layer.url);
                    }
                }));
            }

            var deferred = new Deferred();

            var deferredRequests = [];

            array.forEach(layerUrls, lang.hitch(this, function (url, i) {
                var requestHandle = esriRequest({
                    "url": url,
                    "content": {
                        "f": "json"
                    }
                });
                deferredRequests.push(requestHandle);
            }));

            all(deferredRequests).then(lang.hitch(this, function(results) {
                if (results.error !== undefined) {
                    deferred.reject(results.error);
                    return;
                }

                var mapLayers = [];
                array.forEach(results, lang.hitch(this, function (response, i) {
                    //mapLayers = mapLayers.concat(response.layers); //Doesn't work correctly for FeatureLayers
                    mapLayers.unshift(response);
                }));

                deferred.resolve(mapLayers);
            }));

            return deferred;
        },

		//Set up Reviewer attributes to define an issue. Once set up, 
        //Call ReviewerResultsTask.writeResult method to report a missing/incorrect feature error.
        submitReport: function(reviewerAttributes) {
          var _this = this;
		  this.reviewTechnician = reviewerAttributes.reviewTechnician;
          _this.clearGraphics();
          var user = JSON.parse(sessionStorage.getItem("loggedInUser"));
          if( null != user )
              reviewerAttributes.sessionId = parseInt(user.sessions[0]);
          else
              reviewerAttributes.sessionId = parseInt(this.contributorSessionString);

          this.map.infoWindow.hide();
          this.resultsTask.writeResult(reviewerAttributes, this._resultGeometry).then(function(result) {
            _this._onWriteResultComplete(result);
          }, function(err) {
            _this._onWriteResultError(err);
          });
        },  
        
        cancelReport : function () {
        var _this = this;
        _this.clearGraphics();
        this.map.infoWindow.hide();
        },

		//Populate results to the Grid for displaying issues reported by a SME
        populateGridWithResults : function(reviewTechnician) {
          
			// show Grid Loading animation
			//gridStandby.show();
			
			if(!app.isPaneOpen("bottombar"))
				app.togglePane("bottombar");
				
			var grid = Registry.byId("ResultsGrid_widget");
			var query = {};
			query["reviewTechnician"] = reviewTechnician;

            var user = JSON.parse(sessionStorage.getItem("loggedInUser"));
            if( null != user )
                query["sessionId"] = parseInt(user.sessions[0]);
            else
                query["sessionId"] = parseInt(this.contributorSessionString);
			grid.setQuery(query);

		}, //End populateGridWithResults function	
		
		//Once the result has been written successfully, display a list of issues submitted by the technician
        _onWriteResultComplete: function(result) {
          if (result && result.success) {
			this.populateGridWithResults(this.reviewTechnician);
            //this.emit('Message', {}, ['', "Successfully provided feedback to QC editors "]);
          } else {
			console.log("Error writing feature to Reviewer Workspace")
            //this.emit('Error', {} "Error writing feature to QC workspace");
          }
        },

        // Show error message if writeFeatureAsResult fails
        _onWriteResultError: function(err) {
          //this.emit('Error', {}, [err.message, err]);
        },      
        
    });
});