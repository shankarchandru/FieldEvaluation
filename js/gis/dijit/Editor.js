define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/event",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/on",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"esri/request",
	"esri/map",
	"esri/tasks/GeometryService",
	"esri/toolbars/edit",
	"esri/layers/ArcGISTiledMapServiceLayer",
	"esri/layers/FeatureLayer",
	"esri/Color",
	"esri/symbols/SimpleMarkerSymbol",
	"esri/symbols/SimpleLineSymbol",
	"esri/dijit/editing/Editor-all",
	"esri/dijit/editing/TemplatePicker-all",
	"esri/dijit/AttributeInspector-all",
	"esri/config",
	"dojo/i18n!esri/nls/jsapi",
	"dojo/_base/array",
	"dojo/parser",
	"dojo/keys",
	"dijit/layout/BorderContainer",
	"dijit/layout/ContentPane",
	"dijit/form/CheckBox",
	"dojo/text!./Editor/templates/Editor.html",
	'xstyle/css!./Editor/css/Editor.css',
	"dojo/domReady!"
	], function(declare, lang, event, dom, domConstruct, on, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, esriRequest, map, GeometryService, Edit, ArcGISTiledMapServiceLayer, FeatureLayer, Color, SimpleMarkerSymbol, SimpleLineSymbol, Editor, TemplatePicker,
				AttributeInspector, esriConfig, jsapiBundle, arrayUtils, parser, keys, BorderContainer, ContentPane, CheckBox, template) {
	return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		templateString: template,
		widgetsInTemplate: true,
		title: "Editor",
		_editorInitialized: false,
		_editor: null,
		_toggleFunction: null,
		//_attributeInspector: null,

		postMixInProperties: function () {
			this.inherited(arguments);
		},

		postCreate: function () {
			this.inherited(arguments);

			esriConfig.defaults.geometryService = new GeometryService("http://loanr7213:6080/arcgis/rest/services/Utilities/Geometry/GeometryServer");
			//we must call Editor.startup after parent widget is opened
			//otherwise the template picker does not display templates.
			if(null != this.parentWidget) {
				this._toggleFunction = on(this.parentWidget, "onToggle", lang.hitch(this, function (evtArgs) {
					if(evtArgs.opening && !this._editorInitialized) {
						this.mapClickMode.current = 'editing';
						this.initEditor();
						this._editorInitialized = true;
					}
					else if(evtArgs.opening) {
						this.mapClickMode.current = 'editing';
						if(null == this._editor.attributeInspector.domNode)
							this._editor.attributeInspector.domNode = domConstruct.create("div");
						this.map.infoWindow.setContent(this._editor.attributeInspector.domNode);
					}
					else if(!evtArgs.opening) {
						this.mapClickMode.current = 'identify';
					}

				}));
			}
		},

		startup: function () {
			this.inherited(arguments);
		},

		/*resize: function () {

		},*/

		initEditor: function () {
			var	templateLayers = this.getLayersFromMap();

			var templatePicker = new esri.dijit.editing.TemplatePicker({
				featureLayers: templateLayers,
				grouping: true,
				rows: "auto",
				columns: "auto"
			}, this.templateContainer);
			templatePicker.startup();

			var layers = arrayUtils.map(templateLayers, function (layer) {
				return {featureLayer: layer};
			});

			//this._attributeInspector = new esri.dijit.AttributeInspector({
			//	layerInfos: layers
			//}, domConstruct.create("div"));
			//
			//this._attributeInspector.startup();
            //
			//this.map.infoWindow.setContent(this._attributeInspector.domNode);
			//this.map.infoWindow.setTitle("Editing Attributes");
			//this.map.infoWindow.resize(350, 375);

			var settings = {
				map: this.map,
				templatePicker: templatePicker,
				//attributeInspector: this._attributeInspector,
				layerInfos: layers,
				toolbarVisible: true,
				createOptions: {
					polylineDrawTools: [esri.dijit.editing.Editor.CREATE_TOOL_FREEHAND_POLYLINE],
					polygonDrawTools: [esri.dijit.editing.Editor.CREATE_TOOL_FREEHAND_POLYGON,
						esri.dijit.editing.Editor.CREATE_TOOL_CIRCLE,
						esri.dijit.editing.Editor.CREATE_TOOL_TRIANGLE,
						esri.dijit.editing.Editor.CREATE_TOOL_RECTANGLE
					]
				},
				toolbarOptions: {
					reshapeVisible: true
				}
			};

			var params = {settings: settings};
			this._editor = new esri.dijit.editing.Editor(params, this.editorContainer);
			//define snapping options

			 var symbol = new SimpleMarkerSymbol(
				 SimpleMarkerSymbol.STYLE_CROSS,
				 15,
				 new SimpleLineSymbol(
				 SimpleLineSymbol.STYLE_SOLID,
				 new Color([255, 0, 0, 0.5]),
				 5
			 ),null);

			 this.map.enableSnapping({
				 snapPointSymbol: symbol,
				 tolerance: 20,
				 snapKey: keys.ALT
			 });

			this._editor.startup();
		},

		getLayersFromMap : function () {

			var layers = [];
			if(this.map.graphicsLayerIds.length > 0) {
				arrayUtils.forEach(this.map.graphicsLayerIds, lang.hitch(this, function (id, i) {
					var layer = this.map.getLayer(id);
					if(layer.hasOwnProperty("type") && String(layer.type).toUpperCase() == "FEATURE LAYER")
						layers.push(layer);
				}));
			}

			return layers;
		}
	})
});