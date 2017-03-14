define([
    'esri/map',
	'esri/layers/ArcGISTiledMapServiceLayer',
    'dojo/dom',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/on',
    'dojo/_base/array',
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
	'gis/dijit/ResizeTitlePane',
    'dojo/_base/window',
    'dojo/_base/lang',
    'dojo/text!./templates/mapOverlay.html',
    'config/viewer',
    'esri/IdentityManager',
    'gis/dijit/FloatingWidget',
	"dijit/registry"
], function(Map, ArcGISTiledMapServiceLayer, dom, domConstruct, domStyle, domClass, on, array, BorderContainer, ContentPane, ResizeTitlePane, win, lang, mapOverlay, config, IdentityManager, FloatingWidget, registry) {

    return {
        config: config,
		totalWidgets: 0,
		loadedWidgets: 0,
        legendLayerInfos: [],
        editorLayerInfos: [],
        tocLayerInfos: [],
		resizingSidebar: false,
		lastSidebarLocation: null,
        mapClickMode: {
            current: config.defaultMapClickMode,
            defaultMode: config.defaultMapClickMode
        },
        startup: function() {
            this.initView();
        },
		onWidgetsLoaded: null,
        initView: function() {
            this.outer = new BorderContainer({
                id: 'borderContainer',
                design: 'sidebar',
				liveSplitters:true,
                gutters: false
            }).placeAt(win.body());

            this.sidebar = new ContentPane({
                id: 'sidebar',
                region: 'left',
				splitter: true
            }).placeAt(this.outer);

            this.bottombar = new ContentPane({
                id: 'bottombar',
                region: 'bottom',
				splitter: false
            }).placeAt(this.outer);	
			
            new ContentPane({
                region: 'center',
                id: 'map',
                content: mapOverlay
            }).placeAt(this.outer);

            this.outer.startup();
            this.initMap();

			this.sidebar_splitter = dom.byId('sidebar_splitter');
			if(null != this.sidebar_splitter) {
				this.sidebar_splitter.addEventListener("mousedown", lang.hitch(this, function(e) {
					if(e.button == 0)
						this.resizingSidebar = true;
				}));
				this.sidebar_splitter.addEventListener("mouseup", lang.hitch(this, function(e) {
					if(e.button == 0)
						this.resizingSidebar = false;
				}));
				this.sidebar_splitter.addEventListener("mousemove", lang.hitch(this, this.repositionBarTogglers));
			}
			
            this.sideBarToggle = dom.byId('sidebarCollapseButton');
			this.bottomBarToggle = dom.byId('bottombarCollapseButton');
            this.positionSideBarToggle();
			this.positionBottomBarToggle();
            on(this.sideBarToggle, 'click', lang.hitch(this, 'togglePane', 'sidebar'));
			on(this.bottomBarToggle, 'click', lang.hitch(this, 'togglePane', 'bottombar'));
            domStyle.set(this.sideBarToggle, 'display', 'block');
			domStyle.set(this.bottomBarToggle, 'display', 'block');
			this.togglePane("bottombar");
        },
        initMap: function() {
            this.map = new Map('map', config.mapOptions);
			
			//var customBasemap = new ArcGISTiledMapServiceLayer("http://localhost:6080/arcgis/rest/services/WaterDistributionServices/WaterDistributionService/MapServer");
			//this.map.addLayer(customBasemap);

            this.map.on('load', lang.hitch(this, 'initLayers'));
            this.map.on('layers-add-result', lang.hitch(this, 'initWidgets'));

            // issue to fix: if using custom basemap, you need to load the basemap widget now or map::load will never fire

            // this.basemaps = new Basemaps({
            //     map: this.map,
            //     mode: config.basemapMode,
            //     title: 'Basemaps',
            //     mapStartBasemap: config.mapStartBasemap,
            //     basemapsToShow: config.basemapsToShow
            // }, 'basemapsDijit');
            // this.basemaps.startup();
        },
        initLayers: function(evt) {
            this.map.on('resize', function(evt) {
                var pnt = evt.target.extent.getCenter();
                setTimeout(function() {
                    evt.target.centerAt(pnt);
                }, 100);
            });

            this.layers = [];
            var layerTypes = {
                csv: 'CSV', // untested
                dynamic: 'ArcGISDynamicMapService',
                feature: 'Feature',
                georss: 'GeoRSS',
                image: 'ArcGISImageService',
                kml: 'KML',
                label: 'Label', //untested
                mapimage: 'MapImage', //untested
                osm: 'OpenStreetMap',
                tiled: 'ArcGISTiledMapService',
                wms: 'WMS',
                wmts: 'WMTS' //untested
            };
            // loading all the required modules first ensures the layer order is maintained
            var modules = [];
            array.forEach(config.operationalLayers, function(layer) {
                var type = layerTypes[layer.type];
                if (type) {
                    modules.push('esri/layers/' + type + 'Layer');
                } else {
                    console.log('Layer type not supported: ', layer.type);
                }
            }, this);
            require(modules, lang.hitch(this, function() {
                array.forEach(config.operationalLayers, function(layer) {
                    var type = layerTypes[layer.type];
                    if (type) {
                        require(['esri/layers/' + type + 'Layer'], lang.hitch(this, 'initLayer', layer));
                    }
                }, this);
                this.map.addLayers(this.layers);
            }));
        },
        initLayer: function(layer, Layer) {
            var l = new Layer(layer.url, layer.options);
            this.layers.unshift(l); // unshift instead of oush to keep layer ordering on map intact
            this.legendLayerInfos.unshift({
                layer: l,
                title: layer.title || null
            });
            this.tocLayerInfos.push({ //push because Legend and TOC need the layers in the opposite order
                layer: l,
                title: layer.title || null,
                slider: layer.slider || true,
                noLegend: layer.noLegend || false,
                collapsed: layer.collapsed || false
            });
            if (layer.type === 'feature') {
                var options = {
                    featureLayer: l
                };
                if (layer.editorLayerInfos) {
                    lang.mixin(options, layer.editorLayerInfos);
                }
                this.editorLayerInfos.push(options);
            }
        },
        initWidgets: function(evt) {
            var widgets = [];
			var bottomwidgets = [];

            var user = JSON.parse(sessionStorage.getItem("loggedInUser"));
            if(null == user) {
                alert("User not logged in. Please login to application");
                window.location.href = "login.html";
            }

            for (var key in config.widgets) {
                if (config.widgets.hasOwnProperty(key)) {
                    if(user.isAdmin || user.apps.indexOf(config.widgets[key].id) > -1) {
                    var widget = lang.clone(config.widgets[key]);
                    if (widget.include) {
                        widget.position = ('undefined' !== typeof(widget.position)) ? widget.position : 10000;
						if(widget.type == "bottomPane"){
							bottomwidgets.push(widget);
						}else{
							widgets.push(widget);
						}
                    }
                }
            }
            }
			
			bottomwidgets.sort(function(a,b) {
				return a.position - b.position;
			});

            widgets.sort(function(a, b) {
                return a.position - b.position;
            });

			this.totalWidgets = widgets.length + bottomwidgets.length;
			
            array.forEach(widgets, function(widget, i) {
                this.widgetLoader(widget, i);
            }, this);
			
            array.forEach(bottomwidgets, function(widget, i) {
                this.widgetLoader(widget, i);
            }, this);			
        },
        togglePane: function(id) {
            if (!this[id]) {
                return;
            }
            var domNode = this[id].domNode;
            if (domNode) {
                var disp = (domStyle.get(domNode, 'display') === 'none') ? 'block' : 'none';
                domStyle.set(domNode, 'display', disp);
				if(id == 'sidebar') {
					this.positionSideBarToggle();
					this.positionBottomBarToggle();
				} else {
					this.positionBottomBarToggle();
					if(disp == 'block') {
						var resultsWidget = registry.byId("ResultsGrid_widget");
						if(null != resultsWidget && resultsWidget.resize)
							resultsWidget.resize();
					}
				}
				
				this.outer.resize();
            }
        },
		isPaneOpen: function(id) {
			if (!this[id]) {
                return;
            }
            var domNode = this[id].domNode;
            if (domNode)
				return domStyle.get(domNode, 'display') === 'block';
			else
				return false;
		},
        positionSideBarToggle: function () {
            var disp = domStyle.get(this.sidebar.domNode, 'display');
            var rCls = (disp === 'none') ? 'close' : 'open';
            var aCls = (disp === 'none') ? 'open' : 'close';
            domClass.remove(this.sideBarToggle, rCls);
            domClass.add(this.sideBarToggle, aCls);
			
			if(disp == 'none')
				this.sideBarToggle.style.left = "0px";
			else {
				var splitterLoc = this.getLocation(this.sidebar_splitter);
				if(splitterLoc.x != 0)
					this.sideBarToggle.style.left = splitterLoc.x + "px";
				else if(null != this.lastSidebarLocation)
					this.sideBarToggle.style.left = this.lastSidebarLocation.x + "px";
				else
					this.sideBarToggle.style.left = "542px";
			}
        },
        positionBottomBarToggle: function () {
            var disp = domStyle.get(this.bottombar.domNode, 'display');
			var dispSidebar = domStyle.get(this.sidebar.domNode, 'display');
            var rCls = (disp === 'none') ? 'close' : 'open';
            var aCls = (disp === 'none') ? 'open' : 'close';
            domClass.remove(this.bottomBarToggle, rCls);
            domClass.add(this.bottomBarToggle, aCls);
			
			if(dispSidebar == 'none')
				this.bottomBarToggle.style.left = "0px";
			else {
				var splitterLoc = this.getLocation(this.sidebar_splitter);
				if(splitterLoc.x != 0)
					this.bottomBarToggle.style.left = splitterLoc.x + "px";
				else if(null != this.lastSidebarLocation)
					this.bottomBarToggle.style.left = this.lastSidebarLocation.x + "px";
				else
					this.bottomBarToggle.style.left = "545px";
			}
        },
		repositionBarTogglers: function (e) {
			if(this.resizingSidebar) //mouse is moving with left mouse button clicked
			{
				var splitterLoc = this.getLocation(this.sidebar_splitter);
				this.sideBarToggle.style.left = splitterLoc.x + "px";
				this.bottomBarToggle.style.left = splitterLoc.x + "px";
				this.lastSidebarLocation = splitterLoc;
			}
        },
        _createTitlePaneWidget: function(title, position, open, Id, parentId) {
            var options = {
                title: title,
                open: open
            };
            if (parentId) {
                options.id = parentId;
            }
            var tp = new ResizeTitlePane(options).placeAt(this.sidebar, position);
				
            tp.startup();
            return tp;
        },
        _createFloatingWidget: function(title, parentId) {
            var options = {
                title: title
            };
            if (parentId) {
                options.id = parentId;
            }
            var fw = new FloatingWidget(options);
            fw.startup();
            return fw;
        },
        _createBottomPaneWidget: function(title, position, open, parentId) {
            var options = {
                title: title,
                open: open
            };
            if (parentId) {
                options.id = parentId;
            }
			var titlePaneLocal = new ContentPane(options);
	        titlePaneLocal.placeAt(this.bottombar, position);
            titlePaneLocal.startup();
            return titlePaneLocal;
        },		
        widgetLoader: function(widgetConfig, position) {
            var parentId, pnl;

            // only proceed for valid widget types
            var widgetTypes = ['titlePane','floating','bottomPane','domNode','invisible','map'];
            if (array.indexOf(widgetTypes, widgetConfig.type) < 0) {
                console.log('Widget type ' + widgetConfig.type  + ' (' + widgetConfig.title + ') at position ' + position + ' is not supported.');
                return;
            }

            // build a titlePane or floating widget or a bottomPane as the parent  
            if ((widgetConfig.type === 'titlePane' || widgetConfig.type === 'floating' || widgetConfig.type === 'bottomPane') && (widgetConfig.id && widgetConfig.id.length > 0)) {
                parentId = widgetConfig.id + '_parent';
                if (widgetConfig.type === 'titlePane') {
                    pnl = this._createTitlePaneWidget(widgetConfig.title, position, widgetConfig.open, widgetConfig.id, parentId);
                } else if (widgetConfig.type === 'floating') {
                    pnl = this._createFloatingWidget(widgetConfig.title, parentId);
                } else if (widgetConfig.type === 'bottomPane') {
                    pnl = this._createBottomPaneWidget(widgetConfig.title, position, widgetConfig.open, parentId);
                }
                widgetConfig.parentWidget = pnl;
            }

            // 2 ways to use require to accomodate widgets that may have an optional separate configuration file
            if (typeof(widgetConfig.options) === 'string') {
               require([widgetConfig.options, widgetConfig.path], lang.hitch(this, 'createWidget', widgetConfig));
            } else {
               require([widgetConfig.path], lang.hitch(this, 'createWidget', widgetConfig, widgetConfig.options));
            }
        },
        createWidget: function (widgetConfig, options, WidgetClass) {
            // set any additional options
            options.id = widgetConfig.id + '_widget';
            options.parentWidget = widgetConfig.parentWidget;

            if (options.map) {
                options.map = this.map;
            }
            if (options.mapClickMode) {
                options.mapClickMode = this.mapClickMode;
            }
            if (options.legendLayerInfos) {
                options.layerInfos = this.legendLayerInfos;
            }
            if (options.tocLayerInfos) {
                options.layerInfos = this.tocLayerInfos;
            }
            if (options.editorLayerInfos) {
                options.layerInfos = this.editorLayerInfos;
            }

            // create the widget
            var pnl = options.parentWidget;
            if (widgetConfig.type === 'titlePane') {
                this[widgetConfig.id] = new WidgetClass(options, domConstruct.create('div')).placeAt(pnl.containerNode);
            } else if (widgetConfig.type === 'floating') {
                this[widgetConfig.id] = new WidgetClass(options, domConstruct.create('div')).placeAt(pnl.containerNode);
            } else if (widgetConfig.type === 'domNode') {
                this[widgetConfig.id] = new WidgetClass(options, widgetConfig.srcNodeRef);
            } else if(widgetConfig.type === 'bottomPane') {
                this[widgetConfig.id] = new WidgetClass(options, domConstruct.create('div')).placeAt(pnl.containerNode);
			} else {
                this[widgetConfig.id] = new WidgetClass(options);
            }

			if(pnl)
				pnl.childWidget = this[widgetConfig.id];
            // start up the widget
            if (this[widgetConfig.id] && this[widgetConfig.id].startup) {
                this[widgetConfig.id].startup();
				this.loadedWidgets++;
				if(this.loadedWidgets == this.totalWidgets - 1)
					lang.hitch(this, this.onWidgetsLoaded());
            }
        },
		getLocation: function (el) {
			var elLoc = {x:0,y:0};
			//the offsetLeft & offsetTop return the left and top position
			//of the element relative to the parent container.  
			while(el) {
				elLoc.x += el.offsetLeft;
				elLoc.y += el.offsetTop;
				el = el.offsetParent;
			}
			return elLoc;	
        }
    };
});